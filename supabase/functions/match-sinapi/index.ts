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
  measurements?: MeasurementItem[];
  bdi_percentual?: number;
  items?: LegacyItem[];
  // Filtros oficiais SINAPI
  uf?: string;
  mes_ano?: string;
  desonerado?: boolean;
  // Compatibilidade legado
  regiao?: string;
}

const stopWords = new Set([
  "de", "da", "do", "e", "em", "com", "para", "a", "o", "os", "as", "no", "na",
  "um", "uma", "ou", "que", "ao", "se", "por",
]);

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const buildSearchTerms = (text: string): string => {
  const tokens = normalize(text)
    .replace(/[^\w\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t))
    .slice(0, 5);
  return tokens.join(" & ");
};

const buildKeywords = (text: string): string[] =>
  normalize(text)
    .replace(/[^\w\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !stopWords.has(t))
    .slice(0, 3);

interface SinapiFilters {
  uf?: string;
  mes_ano?: string;
  desonerado?: boolean;
}

/**
 * Busca o insumo na base oficial SINAPI por similaridade textual.
 * Aplica os filtros de UF, mês/ano e desonerado quando informados.
 */
async function searchSinapiOficial(
  supabase: any,
  descricao: string,
  filters: SinapiFilters,
) {
  const applyFilters = (q: any) => {
    if (filters.uf) q = q.eq("uf", filters.uf.toUpperCase());
    if (filters.mes_ano) q = q.eq("mes_ano", filters.mes_ano);
    if (typeof filters.desonerado === "boolean") q = q.eq("desonerado", filters.desonerado);
    return q;
  };

  // 1) Full Text Search (português) na coluna descricao
  const terms = buildSearchTerms(descricao);
  if (terms) {
    let q = supabase.from("sinapi_base_oficial").select("*");
    q = applyFilters(q);
    const { data: fts, error } = await q
      .textSearch("descricao", terms, { type: "plain", config: "portuguese" })
      .limit(5);
    if (!error && fts?.length) return fts;
  }

  // 2) Fallback ilike combinando palavras-chave
  const keywords = buildKeywords(descricao);
  if (keywords.length) {
    let q2 = supabase.from("sinapi_base_oficial").select("*");
    q2 = applyFilters(q2);
    for (const kw of keywords) q2 = q2.ilike("descricao", `%${kw}%`);
    const { data: ilike } = await q2.limit(5);
    if (ilike?.length) return ilike;
  }

  // 3) Último recurso: ilike pela primeira palavra significativa, sem filtros opcionais
  if (keywords[0]) {
    let q3 = supabase.from("sinapi_base_oficial").select("*");
    if (filters.uf) q3 = q3.eq("uf", filters.uf.toUpperCase());
    const { data: loose } = await q3.ilike("descricao", `%${keywords[0]}%`).limit(5);
    return loose || [];
  }

  return [];
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
    const { measurements, items, regiao, uf, mes_ano, desonerado, bdi_percentual = 25 } = body;

    // Deriva UF do campo legado "regiao" (ex: "São Paulo - SP")
    let ufFinal = uf;
    if (!ufFinal && regiao) {
      const m = regiao.match(/\b([A-Z]{2})\b\s*$/);
      if (m) ufFinal = m[1];
    }

    const filters: SinapiFilters = {
      uf: ufFinal,
      mes_ano,
      desonerado,
    };

    // ---------- LEGACY PATH (per-item matches only) ----------
    if (items?.length) {
      const results: Record<string, any> = {};
      for (const it of items) {
        const matches = await searchSinapiOficial(supabase, it.descricao, filters);
        results[it.item] = matches.length
          ? {
              matched: true,
              matches: matches.map((r: any) => ({
                id: r.id,
                codigo: r.codigo,
                descricao: r.descricao,
                unidade: r.unidade,
                preco_material: r.preco_material,
                preco_mao_de_obra: r.preco_mao_de_obra,
                preco_total: r.preco_total,
                uf: r.uf,
                mes_ano: r.mes_ano,
                desonerado: r.desonerado,
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
    let estimadosIaCount = 0;

    // Pré-processa: busca SINAPI e separa itens sem correspondência para fallback IA
    type Processed = {
      m: MeasurementItem;
      idx: number;
      best: any | null;
      precoUnit: number;
      pm: number;
      pmo: number;
      semPreco: boolean;
    };
    const processed: Processed[] = [];
    const fallbackIdxs: number[] = [];

    for (let idx = 0; idx < measurements.length; idx++) {
      const m = measurements[idx];
      const desc = m.descricao || m.item;
      const matches = await searchSinapiOficial(supabase, desc, filters);
      const best = matches[0];

      const pm = best?.preco_material ? Number(best.preco_material) : 0;
      const pmo = best?.preco_mao_de_obra ? Number(best.preco_mao_de_obra) : 0;
      const precoUnit = best?.preco_total != null ? Number(best.preco_total) : (pm + pmo);
      const semPreco = !best || precoUnit === 0;

      processed.push({ m, idx, best, precoUnit, pm, pmo, semPreco });
      if (semPreco) fallbackIdxs.push(processed.length - 1);
    }

    // Fallback IA: estima preços unitários de mercado (BR) para itens sem correspondência
    const aiEstimates = new Map<number, number>(); // processed index -> preco unitário
    if (fallbackIdxs.length) {
      try {
        const estimates = await estimatePricesWithAI(
          fallbackIdxs.map((i) => ({
            idx: i,
            descricao: processed[i].m.descricao || processed[i].m.item,
            unidade: processed[i].m.unidade,
            uf: filters.uf || "BR",
          })),
        );
        for (const e of estimates) {
          if (typeof e.preco_unitario === "number" && e.preco_unitario > 0) {
            aiEstimates.set(e.idx, e.preco_unitario);
          }
        }
      } catch (err) {
        console.error("Fallback IA falhou:", err);
      }
    }

    for (const p of processed) {
      const qty = Number(p.m.quantidade) || 0;
      let precoUnit = p.precoUnit;
      let origem: string;
      let semPrecoSinapi = false;
      let estimadoIA = false;

      if (!p.semPreco) {
        origem = `SINAPI ${p.best?.uf || ""} ${p.best?.mes_ano || ""}`.trim();
        totalMaterial += p.pm * qty;
        totalMaoObra += p.pmo * qty;
      } else {
        const aiPrice = aiEstimates.get(processed.indexOf(p));
        if (aiPrice && aiPrice > 0) {
          precoUnit = aiPrice;
          origem = "Estimativa IA";
          estimadoIA = true;
          estimadosIaCount++;
          // Estimativa entra no total como material (sem mão de obra separada)
          totalMaterial += precoUnit * qty;
        } else {
          origem = "Sem correspondência SINAPI";
          semPrecoSinapi = true;
          semPrecoCount++;
        }
      }

      const precoTotal = precoUnit * qty;
      const etapaNome = p.m.macro_etapa || "Itens identificados";
      if (!etapaMap.has(etapaNome)) etapaMap.set(etapaNome, []);
      etapaMap.get(etapaNome)!.push({
        item: `${p.idx + 1}`,
        descricao: p.best?.descricao || p.m.descricao || p.m.item,
        local_aplicacao: p.m.local_aplicacao || "—",
        fornecedor: "—",
        marca: "—",
        quantidade: qty,
        unidade: p.best?.unidade || p.m.unidade,
        preco_unitario: precoUnit,
        preco_total: precoTotal,
        codigo_sinapi: p.best?.codigo || "",
        origem_preco: origem,
        sem_preco_sinapi: semPrecoSinapi,
        estimado_ia: estimadoIA,
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

    const refLabel = [
      "SINAPI",
      filters.uf,
      filters.mes_ano,
      typeof filters.desonerado === "boolean"
        ? (filters.desonerado ? "desonerado" : "não desonerado")
        : null,
    ].filter(Boolean).join(" - ");

    const orcamento = {
      resumo: `Orçamento gerado por matching SINAPI Oficial (${measurements.length} itens, ${semPrecoCount} sem preço).`,
      area_total_m2: 0,
      escala_detectada: "—",
      referencia_sinapi: refLabel,
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
      modo_calculo: "sinapi_oficial",
      filtros_aplicados: filters,
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
