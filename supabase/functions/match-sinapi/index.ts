import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MeasurementItem {
  item: string;
  descricao?: string;
  quantidade: number;
  unidade: string;
  macro_etapa?: string;
  local_aplicacao?: string;
}

interface LegacyItem {
  item: string;
  descricao: string;
}

interface MatchRequest {
  // New flow: medições brutas → orçamento calculado
  measurements?: MeasurementItem[];
  bdi_percentual?: number;
  // Legacy flow: only return matches per item (for AnaliseResultado.tsx reconciliation)
  items?: LegacyItem[];
  regiao?: string;
}

const stopWords = new Set(["de", "da", "do", "e", "em", "com", "para", "a", "o", "os", "as", "no", "na"]);

const buildSearchTerms = (text: string): string => {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\sáéíóúãõâêîôûç]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t))
    .slice(0, 5);
  return tokens.join(" & ");
};

const buildKeywords = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 3 && !stopWords.has(t))
    .slice(0, 3);

async function searchSinapi(supabase: any, descricao: string, regiao?: string) {
  const terms = buildSearchTerms(descricao);
  let query = supabase.from("referencia_sinapi").select("*");
  if (terms) {
    query = query.textSearch("descricao", terms, { type: "plain", config: "portuguese" });
  }
  if (regiao) query = query.eq("regiao", regiao);
  const { data: fts } = await query.limit(5);
  if (fts?.length) return fts;

  const keywords = buildKeywords(descricao);
  if (!keywords.length) return [];
  let q2 = supabase.from("referencia_sinapi").select("*");
  for (const kw of keywords) q2 = q2.ilike("descricao", `%${kw}%`);
  if (regiao) q2 = q2.eq("regiao", regiao);
  const { data: ilike } = await q2.limit(5);
  return ilike || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: MatchRequest = await req.json();
    const { measurements, items, regiao, bdi_percentual = 25 } = body;

    // ---------- LEGACY PATH (per-item matches only) ----------
    if (items?.length) {
      const results: Record<string, any> = {};
      for (const it of items) {
        const matches = await searchSinapi(supabase, it.descricao, regiao);
        results[it.item] = matches.length
          ? {
              matched: true,
              matches: matches.map((r: any) => ({
                id: r.id, codigo: r.codigo, descricao: r.descricao, unidade: r.unidade,
                preco_material: r.preco_material, preco_mao_de_obra: r.preco_mao_de_obra,
                regiao: r.regiao, mes_ano: r.mes_ano,
              })),
            }
          : { matched: false, matches: [] };
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- NEW HYBRID PATH (build budget from measurements) ----------
    if (!measurements?.length) {
      return new Response(JSON.stringify({ error: "No items or measurements provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const etapaMap = new Map<string, any[]>();
    let totalMaterial = 0;
    let totalMaoObra = 0;
    let semPrecoCount = 0;

    for (let idx = 0; idx < measurements.length; idx++) {
      const m = measurements[idx];
      const desc = m.descricao || m.item;
      const matches = await searchSinapi(supabase, desc, regiao);
      const best = matches[0];

      const qty = Number(m.quantidade) || 0;
      const pm = best?.preco_material ? Number(best.preco_material) : 0;
      const pmo = best?.preco_mao_de_obra ? Number(best.preco_mao_de_obra) : 0;
      const precoUnit = pm + pmo;
      const precoTotal = precoUnit * qty;

      const semPreco = !best || precoUnit === 0;
      if (semPreco) semPrecoCount++;
      else {
        totalMaterial += pm * qty;
        totalMaoObra += pmo * qty;
      }

      const etapaNome = m.macro_etapa || "Itens identificados";
      if (!etapaMap.has(etapaNome)) etapaMap.set(etapaNome, []);
      etapaMap.get(etapaNome)!.push({
        item: `${idx + 1}`,
        descricao: best?.descricao || desc,
        local_aplicacao: m.local_aplicacao || "—",
        fornecedor: "—",
        marca: "—",
        quantidade: qty,
        unidade: best?.unidade || m.unidade,
        preco_unitario: precoUnit,
        preco_total: precoTotal,
        codigo_sinapi: best?.codigo || "",
        origem_preco: semPreco ? "Sem correspondência SINAPI" : "SINAPI",
        sem_preco_sinapi: semPreco,
        perda_aplicada: "—",
      });
    }

    const macro_etapas = Array.from(etapaMap.entries()).map(([nome, itens]) => ({
      nome,
      itens,
      subtotal: itens.reduce((s: number, i: any) => s + (i.preco_total || 0), 0),
    }));

    const totalGeral = totalMaterial + totalMaoObra;
    const bdiValor = totalGeral * (bdi_percentual / 100);

    const orcamento = {
      resumo: `Orçamento gerado por matching SINAPI (${measurements.length} itens, ${semPrecoCount} sem preço).`,
      area_total_m2: 0,
      escala_detectada: "—",
      referencia_sinapi: regiao ? `SINAPI - ${regiao}` : "SINAPI",
      macro_etapas,
      quantitativo_por_comodo: [],
      resumo_final: {
        total_materiais: totalMaterial,
        total_mao_de_obra: totalMaoObra,
        total_geral: totalGeral + bdiValor,
        bdi_percentual,
        bdi_valor: bdiValor,
        premissas_bdi: `BDI ${bdi_percentual}% aplicado sobre custo direto`,
      },
      sem_preco_count: semPrecoCount,
      modo_calculo: "hibrido_sinapi",
    };

    return new Response(JSON.stringify({ orcamento }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("match-sinapi error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
