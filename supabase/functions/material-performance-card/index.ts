import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um Engenheiro Civil sênior especialista em especificação de materiais.
Para o material informado, retorne 3 alternativas comparáveis: PREMIUM, PADRÃO e ECONÔMICA.
Cada alternativa deve incluir:
- nome comercial típico (ex: "Porcelanato Polido 60x60 Linha Premium")
- preço unitário estimado (R$) realista no Brasil para a unidade do item
- durabilidade estimada em anos (vida útil)
- prós (1 frase curta)
- contras (1 frase curta)

Responda APENAS com JSON válido neste formato exato:
{
  "categoria_inferida": "string (ex: piso, tinta, louça, revestimento)",
  "termo_busca_manual": "string curta para Google (ex: 'manual instalação porcelanato 60x60')",
  "opcoes": [
    {"tier":"premium","nome":"...","preco_unitario":0,"durabilidade_anos":0,"pros":"...","contras":"..."},
    {"tier":"padrao","nome":"...","preco_unitario":0,"durabilidade_anos":0,"pros":"...","contras":"..."},
    {"tier":"economica","nome":"...","preco_unitario":0,"durabilidade_anos":0,"pros":"...","contras":"..."}
  ]
}
Seja objetivo e use preços realistas do mercado brasileiro atual.`;

function safeJsonParse(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const itemDescricao: string = String(body?.item_descricao || "").trim();
    const unidade: string = String(body?.unidade || "un").trim();
    const quantidade: number = Number(body?.quantidade || 0);
    const precoAtualUnit: number = Number(body?.preco_atual_unit || 0);
    const totalObra: number = Number(body?.total_obra || 0);
    const bdiPercent: number = Number(body?.bdi_percent || 0);

    if (!itemDescricao) {
      return new Response(JSON.stringify({ error: "item_descricao é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call AI for the 3 tiers
    const userPrompt = `Material atual: "${itemDescricao}"
Unidade: ${unidade}
Quantidade na obra: ${quantidade}
Preço unitário atual estimado: R$ ${precoAtualUnit.toFixed(2)}

Gere as 3 alternativas (premium / padrão / econômica) compatíveis com esse material.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(content);

    if (!parsed || !Array.isArray(parsed.opcoes)) {
      return new Response(JSON.stringify({ error: "Não foi possível processar resposta da IA." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to enrich each option with SINAPI match (best-effort, by ILIKE on first 4 keywords)
    const keywords = itemDescricao.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 3);
    let sinapiMatches: any[] = [];
    if (keywords.length > 0) {
      const orFilter = keywords.map((k) => `descricao.ilike.%${k}%`).join(",");
      const { data: matches } = await serviceClient
        .from("referencia_sinapi")
        .select("codigo, descricao, unidade, preco_material, preco_mao_de_obra")
        .or(orFilter)
        .limit(10);
      sinapiMatches = matches || [];
    }

    // For each AI option, compute impact and try to attach SINAPI ref
    const enriched = parsed.opcoes.map((opt: any, idx: number) => {
      const precoUnit = Number(opt.preco_unitario) || 0;
      const subtotalNovo = precoUnit * quantidade;
      const subtotalAtual = precoAtualUnit * quantidade;
      const diffMaterial = subtotalNovo - subtotalAtual;
      const diffComBdi = diffMaterial * (1 + bdiPercent / 100);
      const novoTotalObra = totalObra + diffComBdi;
      const pctImpacto = totalObra > 0 ? (diffComBdi / totalObra) * 100 : 0;

      // pick a sinapi match (round-robin) — best effort only
      const sinapiRef = sinapiMatches[idx] || null;

      return {
        ...opt,
        preco_unitario: precoUnit,
        subtotal_novo: subtotalNovo,
        subtotal_atual: subtotalAtual,
        diferenca_material: diffMaterial,
        diferenca_com_bdi: diffComBdi,
        novo_total_obra: novoTotalObra,
        pct_impacto_total: pctImpacto,
        sinapi_ref: sinapiRef ? {
          codigo: sinapiRef.codigo,
          descricao: sinapiRef.descricao,
          unidade: sinapiRef.unidade,
          preco_total: (Number(sinapiRef.preco_material) || 0) + (Number(sinapiRef.preco_mao_de_obra) || 0),
        } : null,
      };
    });

    return new Response(JSON.stringify({
      item_descricao: itemDescricao,
      unidade,
      quantidade,
      preco_atual_unit: precoAtualUnit,
      categoria_inferida: parsed.categoria_inferida || "",
      termo_busca_manual: parsed.termo_busca_manual || itemDescricao,
      opcoes: enriched,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("material-performance-card error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro interno",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
