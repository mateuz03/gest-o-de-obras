import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um Engenheiro Civil sênior especialista em compatibilização e detecção de conflitos de obra (Clash Detection).
Sua tarefa: cruzar os REGISTROS DO DIÁRIO DE OBRA com o ORÇAMENTO ESTIMADO e identificar INCOMPATIBILIDADES que possam causar RETRABALHO, ATRASO ou CUSTO EXTRA.

Tipos de conflito a procurar:
1. Etapa em execução no diário SEM os insumos correspondentes previstos no orçamento (ex: alvenaria iniciada mas eletrodutos/tubulações da fase elétrica/hidráulica não previstos para esta etapa).
2. Consumo real (mencionado no diário) DIVERGINDO significativamente do orçado.
3. Atividades fora de sequência lógica construtiva (ex: piso colocado antes de instalações embutidas).
4. Materiais críticos faltando para a etapa atual.

Responda APENAS com JSON válido neste formato:
{"conflicts":[{"severity":"low|medium|high","title":"título curto","description":"explicação objetiva do conflito","recommendation":"ação concreta sugerida","related_stage":"nome da etapa","related_item":"item/insumo principal envolvido"}]}

Se NÃO houver conflitos relevantes, retorne {"conflicts":[]}.
Seja conservador: só reporte conflitos com evidência clara nos dados. Máximo 6 conflitos.`;

function safeJsonParse(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !lovableApiKey) {
      throw new Error("Backend configuration is incomplete.");
    }
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const analysisId = typeof body?.analysis_id === "string" ? body.analysis_id : "";
    if (!analysisId) {
      return new Response(JSON.stringify({ error: "analysis_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: analysis, error: analysisError } = await serviceClient
      .from("analyses")
      .select("id, nome_projeto, resultado_json, user_id")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .single();

    if (analysisError || !analysis) {
      return new Response(JSON.stringify({ error: "Análise não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: diaryEntries } = await serviceClient
      .from("diario_obra")
      .select("data_registro, atividades_realizadas, problemas_ocorridos, observacoes, status_geral")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .order("data_registro", { ascending: false })
      .limit(15);

    if (!diaryEntries || diaryEntries.length === 0) {
      return new Response(JSON.stringify({
        conflicts: [],
        message: "Nenhum registro no diário de obra para analisar. Adicione registros no Diário primeiro.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = analysis.resultado_json as any;
    const macroEtapas = result?.macro_etapas || [];

    const orcamentoText = macroEtapas.map((e: any) => {
      const itens = (e.itens || []).slice(0, 8).map((i: any) =>
        `  - ${i.descricao || i.nome || "item"} | qtd: ${i.quantidade || "?"} ${i.unidade || ""}`
      ).join("\n");
      return `Etapa: ${e.nome}\n${itens}`;
    }).join("\n\n");

    const diaryText = diaryEntries.map((d: any) =>
      `[${d.data_registro}] status:${d.status_geral || "normal"} | atividades: ${d.atividades_realizadas || "—"}${d.problemas_ocorridos ? ` | problemas: ${d.problemas_ocorridos}` : ""}${d.observacoes ? ` | obs: ${d.observacoes}` : ""}`
    ).join("\n");

    const prompt = `PROJETO: ${analysis.nome_projeto}

=== ORÇAMENTO ESTIMADO (etapas e insumos previstos) ===
${orcamentoText || "Orçamento vazio."}

=== DIÁRIO DE OBRA (últimos registros) ===
${diaryText}

Identifique conflitos entre o que está sendo executado (diário) e o que foi previsto (orçamento).`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(aiContent);
    const conflicts = Array.isArray(parsed?.conflicts) ? parsed.conflicts : [];

    await serviceClient
      .from("clash_conflicts")
      .delete()
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .eq("status", "open");

    const inserted: any[] = [];
    for (const c of conflicts.slice(0, 6)) {
      const severity = ["low", "medium", "high"].includes(c.severity) ? c.severity : "medium";
      const { data, error } = await serviceClient.from("clash_conflicts").insert({
        analysis_id: analysisId,
        user_id: user.id,
        conflict_type: "diario_vs_orcamento",
        severity,
        title: String(c.title || "Conflito detectado").slice(0, 200),
        description: c.description ? String(c.description).slice(0, 1000) : null,
        recommendation: c.recommendation ? String(c.recommendation).slice(0, 1000) : null,
        related_stage: c.related_stage ? String(c.related_stage).slice(0, 200) : null,
        related_item: c.related_item ? String(c.related_item).slice(0, 200) : null,
        status: "open",
      }).select().single();
      if (!error && data) inserted.push(data);
    }

    return new Response(JSON.stringify({
      conflicts: inserted,
      total: inserted.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("detect-clashes error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro interno",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
