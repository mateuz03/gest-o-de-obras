import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { materiais, resumo_obra, nome_projeto, area_m2, tipo_construcao } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um engenheiro civil experiente especializado em documentação técnica de obras no Brasil. 
Escreva Memoriais Descritivos seguindo as normas da ABNT (NBR 15575, NBR 6118, etc.). 
Use tom profissional e técnico. Divida o documento por seções claras.
O documento deve ser completo e pronto para uso profissional.`;

    const userPrompt = `Com base nos seguintes dados de um projeto de construção, escreva um Memorial Descritivo técnico completo.

**Projeto:** ${nome_projeto}
**Tipo:** ${tipo_construcao || "Residencial"}
**Área:** ${area_m2} m²

**Resumo da Obra:**
${resumo_obra}

**Lista de Materiais e Quantitativos:**
${materiais}

Instruções:
1. Divida por seções: Objetivo, Dados do Projeto, Fundações, Estrutura, Alvenaria, Cobertura, Instalações Hidráulicas, Instalações Elétricas, Revestimentos e Acabamentos, Pintura, Esquadrias, Considerações Finais.
2. Para cada seção, descreva os materiais especificados, quantidades, marcas recomendadas e normas técnicas aplicáveis.
3. Inclua referências às normas ABNT pertinentes.
4. Use linguagem técnica formal.
5. Formate com títulos em markdown (##).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const memorial = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ memorial }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-memorial error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
