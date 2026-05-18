import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateQuantityItemsRequest {
  analysis_id: string;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function round(value: number, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function makeItem(params: {
  item: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  macro_etapa?: string;
  local_aplicacao?: string;
  criterio_extracao?: string;
  memoria_calculo?: string;
  subcategoria_eletrica?: string;
}) {
  return {
    item: params.item,
    descricao: params.descricao,
    local_aplicacao: params.local_aplicacao || "Geral",
    fornecedor: "—",
    marca: "—",
    marca_sugerida: "—",
    quantidade: round(params.quantidade),
    unidade: params.unidade,
    preco_unitario: 0,
    preco_total: 0,
    codigo_sinapi: "",
    origem_preco: "sem_preco_encontrado",
    perda_aplicada: "—",
    criterio_extracao: params.criterio_extracao || "inferido_parametricamente",
    memoria_calculo: params.memoria_calculo || "",
    alerta_revisao: false,
    sem_preco_sinapi: true,
    preco_conciliado: false,
    estimado_ia: false,
    ...(params.subcategoria_eletrica ? { subcategoria_eletrica: params.subcategoria_eletrica } : {}),
  };
}

async function getLatestRunByStage(supabase: any, analysisId: string, stage: string) {
  const { data, error } = await supabase
    .from("analysis_extraction_runs")
    .select("*")
    .eq("analysis_id", analysisId)
    .eq("stage", stage)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: GenerateQuantityItemsRequest = await req.json();
    const { analysis_id } = body;

    if (!analysis_id) {
      return new Response(JSON.stringify({ error: "Missing analysis_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const architecturalRun = await getLatestRunByStage(supabase, analysis_id, "architectural_extraction");
    const electricalRun = await getLatestRunByStage(supabase, analysis_id, "electrical_extraction");

    const architectural = architecturalRun?.payload_json || {};
    const electrical = electricalRun?.payload_json || {};

    const areaTotal = toNumber(architectural?.area_total_m2, 0);
    const rooms = Array.isArray(architectural?.rooms) ? architectural.rooms : [];

    const tug = toNumber(electrical?.contagens_inferidas?.tug, 0);
    const tue = toNumber(electrical?.contagens_inferidas?.tue, 0);
    const lightingPoints = toNumber(electrical?.contagens_inferidas?.pontos_iluminacao, 0);
    const showers = toNumber(electrical?.contagens_inferidas?.chuveiros, 0);
    const airConditioners = toNumber(electrical?.contagens_inferidas?.ar_condicionado, 0);
    const quadros = toNumber(electrical?.quadros_detectados, 0);
    const circuitos = Array.isArray(electrical?.circuitos_detectados) ? electrical.circuitos_detectados : [];
    const amperagens = Array.isArray(electrical?.amperagens_detectadas) ? electrical.amperagens_detectadas : [];
    const bitolas = Array.isArray(electrical?.bitolas_detectadas_mm2) ? electrical.bitolas_detectadas_mm2 : [];

    const warnings: string[] = [];
    const recomendacoes: string[] = [];

    if (!areaTotal) {
      warnings.push("Área total não foi identificada com confiança suficiente.");
    }

    if (!electricalRun) {
      warnings.push("Sinais elétricos não encontrados; quantitativo elétrico pode estar incompleto.");
    }

    const macroEtapas: any[] = [];

    // 8_acabamentos
    const itensAcabamentos: any[] = [];
    let itemSeq = 1;

    if (areaTotal > 0) {
      itensAcabamentos.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Piso cerâmico interno",
          quantidade: areaTotal * 0.92,
          unidade: "m²",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `Área total ${areaTotal} m² x fator 0,92 para áreas internas`,
        })
      );

      itensAcabamentos.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Contrapiso para revestimento de piso",
          quantidade: areaTotal * 0.92,
          unidade: "m²",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `Área total ${areaTotal} m² x fator 0,92 para áreas internas`,
        })
      );

      itensAcabamentos.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Pintura látex acrílica em paredes internas",
          quantidade: areaTotal * 2.7,
          unidade: "m²",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `Área total ${areaTotal} m² x fator de superfície vertical 2,7`,
        })
      );

      itensAcabamentos.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Rodapé cerâmico",
          quantidade: areaTotal * 0.55,
          unidade: "m",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `Área total ${areaTotal} m² x fator linear de rodapé 0,55`,
        })
      );
    }

    macroEtapas.push({
      nome: "8_acabamentos",
      itens: itensAcabamentos,
      subtotal: 0,
      duracao_dias_estimada: areaTotal > 0 ? Math.max(7, Math.ceil(areaTotal / 25)) : 7,
    });

    // 6_eletrica
    const itensEletrica: any[] = [];
    itemSeq = 1;

    if (quadros > 0) {
      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Quadro de distribuição",
          quantidade: quadros,
          unidade: "un",
          criterio_extracao: "lido_em_tabela",
          memoria_calculo: `${quadros} quadro(s) detectado(s) nas páginas elétricas`,
          subcategoria_eletrica: "Quadros elétricos",
        })
      );
    }

    if (circuitos.length > 0) {
      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Disjuntor termomagnético por circuito identificado",
          quantidade: circuitos.length,
          unidade: "un",
          criterio_extracao: "lido_em_tabela",
          memoria_calculo: `${circuitos.length} circuito(s) detectado(s) no quadro de cargas`,
          subcategoria_eletrica: "Dispositivos de proteção",
        })
      );
    } else if (amperagens.length > 0) {
      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Disjuntores termomagnéticos diversos por amperagem detectada",
          quantidade: amperagens.length,
          unidade: "un",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `${amperagens.length} amperagem(ns) distintas detectadas`,
          subcategoria_eletrica: "Dispositivos de proteção",
        })
      );
    }

    if (lightingPoints > 0) {
      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Ponto de iluminação",
          quantidade: lightingPoints,
          unidade: "un",
          criterio_extracao: "lido_em_tabela",
          memoria_calculo: `${lightingPoints} ocorrência(s) associadas à iluminação`,
          subcategoria_eletrica: "Iluminação",
        })
      );

      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Cabo de cobre flexível 1,5 mm² para iluminação",
          quantidade: lightingPoints * 8,
          unidade: "m",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `${lightingPoints} ponto(s) de iluminação x 8 m por ponto`,
          subcategoria_eletrica: "Condutores e cabos",
        })
      );
    }

    if (tug > 0) {
      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Tomada 2P+T 10A",
          quantidade: tug,
          unidade: "un",
          criterio_extracao: "lido_em_tabela",
          memoria_calculo: `${tug} TUG identificada(s)`,
          subcategoria_eletrica: "Tomadas de uso geral — TUG",
        })
      );

      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Cabo de cobre flexível 2,5 mm² para tomadas TUG",
          quantidade: tug * 10,
          unidade: "m",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `${tug} TUG x 10 m por ponto`,
          subcategoria_eletrica: "Condutores e cabos",
        })
      );
    }

    if (tue > 0) {
      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Tomada 2P+T 20A para uso específico",
          quantidade: tue,
          unidade: "un",
          criterio_extracao: "lido_em_tabela",
          memoria_calculo: `${tue} TUE identificada(s)`,
          subcategoria_eletrica: "Tomadas de uso específico — TUE",
        })
      );
    }

    if (showers > 0) {
      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Circuito dedicado para chuveiro elétrico",
          quantidade: showers,
          unidade: "un",
          criterio_extracao: "lido_em_tabela",
          memoria_calculo: `${showers} chuveiro(s) identificado(s)`,
          subcategoria_eletrica: "Tomadas de uso específico — TUE",
        })
      );

      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Cabo de cobre flexível 6 mm² para chuveiro elétrico",
          quantidade: showers * 12,
          unidade: "m",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `${showers} chuveiro(s) x 12 m por circuito`,
          subcategoria_eletrica: "Condutores e cabos",
        })
      );
    }

    if (airConditioners > 0) {
      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Circuito dedicado para ar-condicionado",
          quantidade: airConditioners,
          unidade: "un",
          criterio_extracao: "lido_em_tabela",
          memoria_calculo: `${airConditioners} equipamento(s) de ar-condicionado identificado(s)`,
          subcategoria_eletrica: "Tomadas de uso específico — TUE",
        })
      );
    }

    const totalElectricalPoints = tug + tue + lightingPoints + showers + airConditioners;
    if (totalElectricalPoints > 0) {
      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Eletroduto corrugado flexível 25 mm",
          quantidade: totalElectricalPoints * 6,
          unidade: "m",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `${totalElectricalPoints} ponto(s)/circuito(s) x 6 m por unidade`,
          subcategoria_eletrica: "Infraestrutura elétrica",
        })
      );

      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Caixa 4x2 em PVC",
          quantidade: tug + tue,
          unidade: "un",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `${tug + tue} caixa(s) para pontos de tomada`,
          subcategoria_eletrica: "Infraestrutura elétrica",
        })
      );

      itensEletrica.push(
        makeItem({
          item: String(itemSeq++),
          descricao: "Caixa octogonal para ponto de iluminação",
          quantidade: lightingPoints,
          unidade: "un",
          criterio_extracao: "inferido_parametricamente",
          memoria_calculo: `${lightingPoints} caixa(s) para ponto de iluminação`,
          subcategoria_eletrica: "Infraestrutura elétrica",
        })
      );
    }

    if (bitolas.length === 0 && itensEletrica.length > 0) {
      warnings.push("Bitolas elétricas não foram lidas diretamente; parte dos cabos foi estimada por regra paramétrica.");
    }

    if (rooms.length === 0 && areaTotal === 0) {
      warnings.push("Sem área total e sem ambientes detectados; quantitativos arquitetônicos estão limitados.");
    }

    if (itensEletrica.length === 0) {
      recomendacoes.push("Enviar quadro de cargas ou planta elétrica com melhor definição para melhorar o quantitativo da etapa elétrica.");
    }

    if (itensAcabamentos.length === 0) {
      recomendacoes.push("Enviar planta com quadro de áreas ou escala legível para melhorar os quantitativos arquitetônicos.");
    }

    macroEtapas.push({
      nome: "6_eletrica",
      itens: itensEletrica,
      subtotal: 0,
      duracao_dias_estimada: totalElectricalPoints > 0 ? Math.max(3, Math.ceil(totalElectricalPoints / 20)) : 3,
    });

    // Demais macroetapas vazias por enquanto
    const emptyEtapas = [
      "1_servicos_preliminares",
      "2_infraestrutura",
      "3_superestrutura",
      "4_cobertura",
      "5_esquadrias",
      "7_hidraulica",
    ].map((nome) => ({
      nome,
      itens: [],
      subtotal: 0,
      duracao_dias_estimada: 0,
    }));

    const finalMacroEtapas = [
      ...emptyEtapas.slice(0, 5),
      macroEtapas.find((e) => e.nome === "6_eletrica")!,
      emptyEtapas[5],
      macroEtapas.find((e) => e.nome === "8_acabamentos")!,
    ];

    const result = {
      resumo: "Quantitativo preliminar gerado por motor paramétrico a partir dos sinais extraídos do projeto.",
      area_total_m2: areaTotal,
      escala_detectada: architectural?.escala_detectada || "—",
      referencia_sinapi: "",
      macro_etapas: finalMacroEtapas,
      quantitativo_por_comodo: rooms,
      recomendacoes,
      warnings,
      confiabilidade: {
        nivel_geral:
          areaTotal > 0 && (tug > 0 || lightingPoints > 0 || circuitos.length > 0)
            ? "medio"
            : "baixo",
        observacoes: warnings,
      },
      resumo_final: {
        total_materiais: 0,
        total_mao_de_obra: 0,
        total_geral: 0,
        bdi_percentual: 25,
        bdi_valor: 0,
        premissas_bdi: "BDI ainda não aplicado nesta fase de quantitativo preliminar",
      },
    };

    const { error: runError } = await supabase
      .from("analysis_extraction_runs")
      .insert({
        analysis_id,
        stage: "quantity_generation",
        status: "completed",
        payload_json: result,
      });

    if (runError) throw runError;

    return new Response(
      JSON.stringify({
        success: true,
        quantitativo: result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-quantity-items error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});