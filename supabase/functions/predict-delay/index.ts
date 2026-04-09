import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Atue como um Engenheiro de Planejamento Sênior com foco em previsão de atrasos de obras.
Responda APENAS com JSON válido no formato {"probability":0,"severity":"low|medium|high","summary":"","reason":"","suggested_new_date":"YYYY-MM-DD","mitigation":""}.
Use apenas o contexto enviado, seja executivo e objetivo.`;

function daysSince(dateString: string) {
  const now = new Date();
  const then = new Date(`${dateString}T12:00:00`);
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function safeJsonParse(text: string) {
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
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !lovableApiKey) throw new Error("Backend configuration is incomplete.");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const analysisId = typeof body?.analysis_id === "string" ? body.analysis_id : "";
    if (!analysisId) return new Response(JSON.stringify({ error: "analysis_id é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: analysis, error: analysisError } = await serviceClient.from("analyses").select("id, nome_projeto, regiao, user_id").eq("id", analysisId).eq("user_id", user.id).single();
    if (analysisError || !analysis) return new Response(JSON.stringify({ error: "Análise não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [scheduleResult, diaryResult, supplierResult, historicalResult] = await Promise.all([
      serviceClient.from("project_schedule").select("task_name, start_date, end_date, sort_order").eq("analysis_id", analysisId).order("sort_order"),
      serviceClient.from("diario_obra").select("data_registro, atividades_realizadas, problemas_ocorridos, observacoes, status_geral").eq("analysis_id", analysisId).eq("user_id", user.id).order("data_registro", { ascending: false }).limit(10),
      serviceClient.from("compras_cotacao").select("fornecedor_escolhido").eq("analysis_id", analysisId).eq("user_id", user.id).not("fornecedor_escolhido", "is", null).limit(5),
      serviceClient.from("diario_obra").select("data_registro, problemas_ocorridos, status_geral").eq("user_id", user.id).in("status_geral", ["atencao", "critico"]).order("data_registro", { ascending: false }).limit(8),
    ]);

    const schedule = scheduleResult.data || [];
    const diaryEntries = diaryResult.data || [];
    const fornecedor = supplierResult.data?.find((item: any) => item.fornecedor_escolhido)?.fornecedor_escolhido || null;

    // Helper to save alert to history
    async function saveAlertHistory(payload: any) {
      try {
        await serviceClient.from("alertas_preditivos").insert({
          analysis_id: analysisId,
          user_id: user!.id,
          probability: payload.probability,
          severity: payload.severity,
          summary: payload.summary,
          reason: payload.reason,
          suggested_new_date: payload.suggested_new_date,
          mitigation: payload.mitigation,
          current_task: payload.current_task,
          fornecedor: payload.fornecedor,
          stagnation_days: payload.stagnation_days,
        });
      } catch (e) {
        console.error("Failed to save alert history:", e);
      }
    }

    if (!schedule.length) {
      const payload = { shouldAlert: false, probability: 10, severity: "low", summary: "Cronograma ainda não configurado", reason: "Cadastre ou ajuste o cronograma Gantt para liberar a análise preditiva de atraso.", suggested_new_date: null, mitigation: "Defina datas das etapas para ativar o monitoramento automático.", current_task: null, fornecedor, stagnation_days: 0 };
      await saveAlertHistory(payload);
      return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const today = new Date().toISOString().split("T")[0];
    const currentTask = schedule.find((task: any) => task.start_date <= today && task.end_date >= today) || schedule.find((task: any) => task.end_date >= today) || schedule[schedule.length - 1];
    const latestDiary = diaryEntries[0];
    const stagnationDays = latestDiary ? daysSince(latestDiary.data_registro) : 999;
    const recentThree = diaryEntries.slice(0, 3);
    const sameStatusForThreeDays = recentThree.length >= 3 && recentThree.every((entry: any) => entry.status_geral === recentThree[0].status_geral);
    const taskMentionedRecently = recentThree.some((entry: any) => `${entry.atividades_realizadas || ""} ${entry.observacoes || ""}`.toLowerCase().includes(currentTask.task_name.toLowerCase()));
    const shouldAlert = stagnationDays >= 3 || sameStatusForThreeDays || !taskMentionedRecently;

    if (!shouldAlert) {
      const payload = { shouldAlert: false, probability: 18, severity: "low", summary: "Cronograma sem sinais críticos no momento", reason: "Os registros recentes mostram andamento contínuo da etapa atual, sem indícios fortes de travamento.", suggested_new_date: currentTask.end_date, mitigation: "Mantenha o diário atualizado diariamente para preservar a precisão da previsão.", current_task: currentTask.task_name, fornecedor, stagnation_days: stagnationDays };
      await saveAlertHistory(payload);
      return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const historicalText = (historicalResult.data || []).map((entry: any) => `- ${entry.data_registro}: ${entry.status_geral || "normal"}${entry.problemas_ocorridos ? ` | ${entry.problemas_ocorridos}` : ""}`).join("\n") || "Sem histórico relevante de atrasos anteriores.";
    const diaryText = diaryEntries.length ? diaryEntries.map((entry: any) => `- ${entry.data_registro} | status: ${entry.status_geral || "normal"} | atividades: ${entry.atividades_realizadas || "sem detalhe"}${entry.problemas_ocorridos ? ` | problema: ${entry.problemas_ocorridos}` : ""}`).join("\n") : "Nenhum registro recente de diário de obra.";
    const prompt = `Local da Obra: ${analysis.regiao || "Não informado"}\nFornecedor Escolhido: ${fornecedor || "Não informado"}\nEtapa Atual: ${currentTask.task_name}\nData prevista da etapa: ${currentTask.end_date}\nDias sem avanço relevante: ${stagnationDays}\nHistórico de Obras Similares:\n${historicalText}\n\nDiário recente:\n${diaryText}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }] }),
    });

    const aiJson = aiResponse.ok ? safeJsonParse((await aiResponse.json()).choices?.[0]?.message?.content || "") : null;
    const fallbackSuggestedDate = addDays(currentTask.end_date, Math.max(3, Math.min(7, stagnationDays)));
    const responsePayload = {
      shouldAlert: true,
      probability: Number.isFinite(aiJson?.probability) ? Math.max(0, Math.min(100, Math.round(aiJson.probability))) : Math.min(90, 45 + stagnationDays * 10),
      severity: aiJson?.severity === "high" || aiJson?.severity === "medium" || aiJson?.severity === "low" ? aiJson.severity : stagnationDays >= 5 ? "high" : "medium",
      summary: typeof aiJson?.summary === "string" && aiJson.summary.trim() ? aiJson.summary : `Risco de atraso na etapa ${currentTask.task_name}`,
      reason: typeof aiJson?.reason === "string" && aiJson.reason.trim() ? aiJson.reason : `A etapa ${currentTask.task_name} está sem avanço relevante há ${stagnationDays} dias, o que aumenta o risco de desvio do cronograma.${fornecedor ? ` O fornecedor ${fornecedor} merece acompanhamento próximo.` : ""}`,
      suggested_new_date: typeof aiJson?.suggested_new_date === "string" && aiJson.suggested_new_date ? aiJson.suggested_new_date : fallbackSuggestedDate,
      mitigation: typeof aiJson?.mitigation === "string" && aiJson.mitigation.trim() ? aiJson.mitigation : "Antecipe a compra dos itens críticos em pelo menos 5 dias e revise a frente de trabalho com a equipe responsável.",
      current_task: currentTask.task_name,
      fornecedor,
      stagnation_days: stagnationDays,
    };

    await saveAlertHistory(responsePayload);

    return new Response(JSON.stringify(responsePayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("predict-delay error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
