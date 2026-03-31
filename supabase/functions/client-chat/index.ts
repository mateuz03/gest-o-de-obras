import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o assistente virtual da plataforma AI Construct, focado em atendimento ao cliente final (proprietário da obra).

REGRAS DE RESPOSTA:
1. Seja educado e tranquilizador.
2. Use linguagem leiga — não use termos técnicos complexos.
3. Se algo estiver atrasado, informe que a equipe já está ciente e trabalhando na solução. NUNCA alarme o cliente.
4. Responda em no máximo 3 frases curtas.
5. Se não houver informação suficiente no diário, diga que vai verificar com a equipe e retornará.
6. NUNCA invente dados. Use APENAS o que está no diário de obra fornecido.
7. Traduza termos técnicos: "concretagem" → "a base da estrutura está sendo feita", "alvenaria" → "as paredes estão sendo levantadas", etc.
8. Seja positivo e focado no progresso.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { analysis_id, message, history } = await req.json();

    if (!analysis_id || !message) {
      return new Response(JSON.stringify({ error: "analysis_id e message são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last 48h of diario_obra
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: diarioEntries } = await supabase
      .from("diario_obra")
      .select("data_registro, atividades_realizadas, clima, equipe_presente, status_geral, observacoes")
      .eq("analysis_id", analysis_id)
      .gte("created_at", since)
      .order("data_registro", { ascending: false })
      .limit(10);

    // Fetch project name
    const { data: analysis } = await supabase
      .from("analyses")
      .select("nome_projeto, status")
      .eq("id", analysis_id)
      .single();

    const diarioText = diarioEntries?.length
      ? diarioEntries.map((e: any) =>
        `📅 ${e.data_registro}: ${e.atividades_realizadas || "Sem registro de atividades"}${e.clima ? ` | Clima: ${e.clima}` : ""}${e.equipe_presente ? ` | Equipe: ${e.equipe_presente} pessoas` : ""}${e.status_geral === "critico" ? " | ⚠️ Atenção necessária" : ""}${e.observacoes ? ` | Obs: ${e.observacoes}` : ""}`
      ).join("\n")
      : "Nenhum registro no diário de obra nas últimas 48 horas.";

    const contextPrompt = `Projeto: ${analysis?.nome_projeto || "Obra"}

Diário de Obra (últimas 48h):
${diarioText}

O cliente perguntou: "${message}"`;

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history (last 6 messages max)
    if (history?.length) {
      for (const h of history.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: "user", content: contextPrompt });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ reply: "Estou com muitas solicitações no momento. Tente novamente em alguns instantes! 😊" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua pergunta. Tente novamente!";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("client-chat error:", error);
    return new Response(JSON.stringify({ reply: "Ops, algo deu errado. Tente novamente em alguns instantes! 😊" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
