import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  assertAnalysisAccess,
  assertValidShareToken,
  corsHeaders,
  HttpError,
  json,
  toErrorResponse,
} from "../_shared/security.ts";

const SYSTEM_PROMPT = `Voce e o assistente virtual da plataforma AI Construct, focado em atendimento ao cliente final (proprietario da obra).

REGRAS DE RESPOSTA:
1. Seja educado e tranquilizador.
2. Use linguagem leiga.
3. Se algo estiver atrasado, informe que a equipe ja esta ciente e trabalhando na solucao.
4. Responda em no maximo 3 frases curtas.
5. Se nao houver informacao suficiente no diario, diga que vai verificar com a equipe e retornara.
6. Nunca invente dados.
7. Traduza termos tecnicos para linguagem comum.
8. Seja positivo e focado no progresso.`;

async function resolveRequester(req: Request, analysisId: string, shareToken?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await authClient.auth.getUser();
    if (!error && data?.user?.id) {
      await assertAnalysisAccess(admin, data.user.id, analysisId);
      return { admin, mode: "authenticated" as const, userId: data.user.id };
    }
  }

  const token = String(shareToken || "").trim();
  if (!token) {
    throw new HttpError(401, "Acesso nao autorizado.", "UNAUTHORIZED");
  }

  await assertValidShareToken(admin, analysisId, token);
  return { admin, mode: "shared" as const, userId: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new HttpError(500, "Configuracao de IA ausente.", "CONFIG_ERROR", false);
    }

    const body = await req.json();
    const analysisId = String(body?.analysis_id || "").trim();
    const message = String(body?.message || "").trim();
    const history = Array.isArray(body?.history) ? body.history : [];
    const shareToken = String(body?.share_token || "").trim();

    if (!analysisId || !message) {
      throw new HttpError(400, "analysis_id e message sao obrigatorios", "INVALID_INPUT");
    }

    const requester = await resolveRequester(req, analysisId, shareToken);
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const [{ data: diarioEntries, error: diarioError }, { data: analysis, error: analysisError }] = await Promise.all([
      requester.admin
        .from("diario_obra")
        .select("data_registro, atividades_realizadas, clima, equipe_presente, status_geral, observacoes")
        .eq("analysis_id", analysisId)
        .gte("created_at", since)
        .order("data_registro", { ascending: false })
        .limit(10),
      requester.admin
        .from("analyses")
        .select("nome_projeto, status")
        .eq("id", analysisId)
        .single(),
    ]);

    if (diarioError) throw diarioError;
    if (analysisError) throw analysisError;

    const diarioText = diarioEntries?.length
      ? diarioEntries
          .map(
            (entry: any) =>
              `${entry.data_registro}: ${entry.atividades_realizadas || "Sem registro de atividades"}`
              + `${entry.clima ? ` | Clima: ${entry.clima}` : ""}`
              + `${entry.equipe_presente ? ` | Equipe: ${entry.equipe_presente} pessoas` : ""}`
              + `${entry.status_geral === "critico" ? " | Atencao necessaria" : ""}`
              + `${entry.observacoes ? ` | Obs: ${entry.observacoes}` : ""}`,
          )
          .join("\n")
      : "Nenhum registro no diario de obra nas ultimas 48 horas.";

    const contextPrompt = `Projeto: ${analysis?.nome_projeto || "Obra"}

Diario de Obra (ultimas 48h):
${diarioText}

O cliente perguntou: "${message}"`;

    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const item of history.slice(-6)) {
      if (item?.role === "user" || item?.role === "assistant") {
        messages.push({ role: item.role, content: String(item.content || "").slice(0, 1500) });
      }
    }
    messages.push({ role: "user", content: contextPrompt });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return json({
          reply: "Estou com muitas solicitacoes no momento. Tente novamente em alguns instantes.",
        });
      }
      throw new HttpError(502, "Falha temporaria no assistente.", "AI_UPSTREAM_ERROR", false);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Desculpe, nao consegui processar sua pergunta. Tente novamente!";

    return json({
      reply,
      access_mode: requester.mode,
    });
  } catch (error) {
    const response = await toErrorResponse(error, "Nao foi possivel responder agora.", {
      functionName: "client-chat",
      request: req,
      source: "edge",
    });

    if (response.status >= 500) {
      return json({ reply: "Ops, algo deu errado. Tente novamente em alguns instantes!" });
    }

    return json({ reply: "Este link de acompanhamento expirou ou nao e valido." }, response.status);
  }
});
