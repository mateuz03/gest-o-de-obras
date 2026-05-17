import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@^3.13.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_TIMEOUT_MS = 115_000;

const MACRO_ETAPA_SCHEMA_KEYS = [
  { key: "1_servicos_preliminares", nome: "Serviços Preliminares" },
  { key: "2_infraestrutura", nome: "Infraestrutura / Fundação" },
  { key: "3_superestrutura", nome: "Superestrutura — Alvenaria / Concreto" },
  { key: "4_cobertura", nome: "Cobertura" },
  { key: "5_esquadrias", nome: "Esquadrias" },
  { key: "6_eletrica", nome: "Instalações Elétricas" },
  { key: "7_hidraulica", nome: "Instalações Hidrossanitárias" },
  { key: "8_acabamentos", nome: "Acabamentos" },
] as const;

const STRICT_JSON_RULES = `
REGRAS CRÍTICAS DE FORMATAÇÃO JSON:
- Você deve retornar APENAS um JSON válido. NUNCA use aspas duplas (") dentro dos valores das strings. Se precisar indicar polegadas, escreva 'pol' ou use aspas simples (').
- Verifique rigorosamente a estrutura do seu JSON. Garanta que TODOS os objetos dentro de um array estejam devidamente separados por vírgula (,).
- Não inclua texto antes ou depois do JSON, comentários, markdown, blocos \`\`\`json, reticências ou placeholders como [...].
`;

function stripMarkdownAndExtractJson(text: string): string {
  const cleaned = text
    .replace(/```json\s?/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstObject = cleaned.indexOf("{");
  const firstArray = cleaned.indexOf("[");
  const start = firstObject === -1 ? firstArray : firstArray === -1 ? firstObject : Math.min(firstObject, firstArray);
  if (start === -1) return cleaned;

  const opening = cleaned[start];
  const closing = opening === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(closing);
  return end > start ? cleaned.slice(start, end + 1).trim() : cleaned.slice(start).trim();
}

function escapeLikelyUnescapedQuotes(jsonText: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonText.length; i++) {
    const char = jsonText[i];

    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && inString) {
      output += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      if (!inString) {
        inString = true;
        output += char;
        continue;
      }

      const rest = jsonText.slice(i + 1);
      const nextNonSpace = rest.match(/\S/)?.[0] ?? "";
      if ([",", "}", "]", ":"].includes(nextNonSpace)) {
        inString = false;
        output += char;
      } else {
        output += '\\"';
      }
      continue;
    }

    output += char;
  }

  return output;
}

function repairAiJson(rawText: string): string {
  const normalized = stripMarkdownAndExtractJson(rawText)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/}\s*{/g, "},{")
    .replace(/]\s*{/g, "],{")
    .replace(/}\s*\[/g, "},[")
    .trim();

  try {
    return jsonrepair(normalized);
  } catch (repairErr) {
    console.warn("jsonrepair não conseguiu reparar na primeira tentativa:", repairErr);
    return jsonrepair(escapeLikelyUnescapedQuotes(normalized));
  }
}

function normalizeStructuredBlueprintResponse(parsed: any) {
  if (!parsed || typeof parsed !== "object") return parsed;
  const hasStructuredStages = MACRO_ETAPA_SCHEMA_KEYS.some(({ key }) => {
    const val = parsed[key];
    return Array.isArray(val) || (val && typeof val === "object" && Array.isArray(val.itens));
  });
  if (!hasStructuredStages) return parsed;

  const DEFAULT_DURATIONS = [7, 25, 30, 15, 10, 15, 15, 30];

  const macro_etapas = MACRO_ETAPA_SCHEMA_KEYS.map(({ key, nome }, stageIndex) => {
    const raw = parsed[key];
    const itensSrc = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.itens) ? raw.itens : []);
    const duracao_dias_estimada = Number(
      (raw && !Array.isArray(raw) && raw.duracao_dias_estimada) ?? DEFAULT_DURATIONS[stageIndex] ?? 15
    ) || DEFAULT_DURATIONS[stageIndex];

    const itens = itensSrc.map((rawItem: any, itemIndex: number) => {
      const quantidade = Number(rawItem?.quantidade ?? rawItem?.quant ?? rawItem?.quantity ?? 0) || 0;
      const precoUnitario = Number(rawItem?.preco_unitario ?? rawItem?.preco_unit ?? rawItem?.unit_price ?? 0) || 0;
      const precoTotal = Number(rawItem?.preco_total ?? rawItem?.subtotal ?? quantidade * precoUnitario) || 0;
      
      return {
        item: rawItem?.item || `${stageIndex + 1}.${itemIndex + 1}`,
        descricao: rawItem?.descricao || rawItem?.description || "Item estimado",
        local_aplicacao: rawItem?.local_aplicacao || rawItem?.local || "Obra geral",
        fornecedor: rawItem?.fornecedor || "—",
        marca: rawItem?.marca || "—",
        marca_sugerida: rawItem?.marca_sugerida || rawItem?.marca || "—",
        quantidade,
        unidade: rawItem?.unidade || rawItem?.unit || "un",
        preco_unitario: precoUnitario,
        preco_total: precoTotal,
        codigo_sinapi: rawItem?.codigo_sinapi || "",
        origem_preco: rawItem?.origem_preco || "SINAPI",
        perda_aplicada: rawItem?.perda_aplicada || rawItem?.perda || "10%",
        // Preserva a subcategoria mapeada pela IA para conferência futura
        subcategoria_especifica: rawItem?.subcategoria_eletrica || rawItem?.subcategoria_especifica || ""
      };
    });

    return {
      nome,
      itens,
      duracao_dias_estimada,
      subtotal: itens.reduce((sum: number, item: any) => sum + (Number(item.preco_total) || 0), 0),
    };
  });

  const totalMateriais = macro_etapas.reduce((sum, etapa) => sum + etapa.subtotal, 0);
  const bdiPercentual = Number(parsed?.resumo_final?.bdi_percentual ?? 25) || 25;
  const bdiValor = Number(parsed?.resumo_final?.bdi_valor ?? totalMateriais * (bdiPercentual / 100)) || 0;

  const normalized = {
    ...parsed,
    macro_etapas,
    resumo_final: {
      total_materiais: Number(parsed?.resumo_final?.total_materiais ?? totalMateriais) || totalMateriais,
      total_mao_de_obra: Number(parsed?.resumo_final?.total_mao_de_obra ?? 0) || 0,
      total_geral: Number(parsed?.resumo_final?.total_geral ?? totalMateriais + bdiValor) || totalMateriais + bdiValor,
      bdi_percentual: bdiPercentual,
      bdi_valor: bdiValor,
      premissas_bdi: parsed?.resumo_final?.premissas_bdi || "BDI padrão de 25% aplicado",
    },
  };

  for (const { key } of MACRO_ETAPA_SCHEMA_KEYS) delete normalized[key];
  return normalized;
}

async function generateWithOpenAI(opts: {
  systemPrompt: string;
  userText: string;
  images: Array<{ mime_type?: string; base64: string }>;
}): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

  const content: any[] = [{ type: "text", text: opts.userText }];
  for (const img of opts.images) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mime_type || "image/jpeg"};base64,${img.base64}`,
        detail: "high"
      }
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 8192,
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: content }
        ]
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI Erro: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("A análise excedeu o tempo seguro de processamento. Envie menos imagens ou imagens mais leves e tente novamente.");
    }
    throw error;
  }
}

// Prompt mestre atualizado com suporte à Engenharia Paramétrica Reversa de Quadros de Carga
const BLUEPRINT_SYSTEM_PROMPT = `Você é um Engenheiro de Custos e Orçamentista Sênior no Brasil, especialista em orçamentos analíticos utilizando a tabela SINAPI, NBR 12721 e TCPO.

==============================================
ESTRATÉGIA DE LEITURA COMPLEMENTAR DE PROJETOS
==============================================
Se os arquivos recebidos forem plantas arquitetônicas, meça e infira as 8 macroetapas padrão da obra.
Se os arquivos forem de ESPECIALIDADES (como Engenharia Elétrica, Quadros de Cargas, Diagramas Unifilares ou Hidráulica):
- Mude o foco imediatamente: NÃO tente caçar ou contar símbolos gráficos confusos na planta.
- LEIA DIRETAMENTE AS TABELAS DE QUADROS DE CARGAS, DIAGRAMAS E LEGENDAS DE TEXTO. Elas contêm os dados reais de circuitos e fiação.
- Use Engenharia Reversa: Pegue a lista de circuitos e transforme em INSUMOS REAIS (cabos por bitola, disjuntores, infraestrutura) baseando-se nas tabelas e na área total construída fornecida.

==============================================
DIRETRIZES PARA A ETAPA DE INSTALAÇÕES ELÉTRICAS
==============================================
Ao preencher os itens da macroetapa "6_eletrica", você deve mapear os materiais e insumos garantindo o enquadramento em uma destas 12 subcategorias de engenharia (adicione o nome da subcategoria no campo "subcategoria_eletrica" de cada item):
1. Entrada de energia e medição (poste, caixas padrão concessionária, ramal de entrada, hastes)
2. Quadros elétricos (barramentos, caixas de distribuição QDLF, identificações)
3. Dispositivos de proteção (disjuntores DIN amp, IDR/DR, DPS)
4. Iluminação (luminárias, spots, arandelas, plafons, fitas LED)
5. Tomadas de uso geral — TUG (módulos 10A, placas, suportes)
6. Tomadas de uso específico — TUE (pontos de ar-condicionado, chuveiros, hidromassagem, boiler, carregador veicular)
7. Condutores e cabos (cabos flexíveis separados por bitola 1.5, 2.5, 4, 6, 10, 35 mm² e funções de fase/neutro/terra)
8. Infraestrutura elétrica (eletrodutos corrugados, caixas 4x2, caixas 4x4, caixas de passagem octogonais)
9. Aterramento e equipotencialização (hastes copperweld, caixas de inspeção, conectores, cabos de aterramento)
10. Comunicação, dados e TV (infraestrutura para rede, racks, tomadas RJ45, cabos coaxiais)
11. Automação e comandos (módulos inteligentes, contatores, sensores se aplicável)
12. Acabamentos elétricos (espelhos, placas cegas, interruptores simples/paralelos)

==============================================
TRAVAS DE ENGENHARIA (GUARDRAILS) — INEGOCIÁVEIS
==============================================
1. PROIBIÇÃO DE MAQUINÁRIO SOLTO: Use exclusivamente serviços compostos da SINAPI.
2. CONSOLIDAÇÃO OBRIGATÓRIA: Some as metragens de cabos e volumes similares para não duplicar linhas na mesma macroetapa.
3. SANITY CHECK: O custo por metro quadrado não deve extrapolar os limites paramétricos reais de obras residenciais no Brasil.
4. REGRAS DE QUANTIDADE: Garanta que unidades como 'kg' de aço, 'm³' de concreto e 'm' de cabos estejam consistentes.
`;

const PHOTO_SYSTEM_PROMPT = `Você é um Engenheiro Civil e Orçamentista especializado em análise de ambientes reais a partir de fotos e orçamentos de reformas no padrão brasileiro.`;

const HYBRID_SYSTEM_PROMPT = `Você é um Engenheiro Civil Sênior especializado em ORÇAMENTAÇÃO RESIDENCIAL no Brasil. Sua única missão é identificar e medir itens construtivos visíveis nas imagens.`;

const JSON_STRUCTURE = `
Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{
  "resumo": "Descrição da análise",
  "area_total_m2": 0,
  "escala_detectada": "1:50",
  "referencia_sinapi": "SINAPI - SP",
  "macro_etapas": [],
  "quantitativo_por_comodo": [],
  "resumo_final": { "total_materiais": 0, "total_mao_de_obra": 0, "total_geral": 0, "bdi_percentual": 25, "bdi_valor": 0, "premissas_bdi": "BDI aplicado" },
  "recomendacoes": []
}
${STRICT_JSON_RULES}`;

const STRUCTURED_BLUEPRINT_JSON_STRUCTURE = `
Retorne APENAS um JSON válido (sem markdown).
A resposta DEVE usar as 8 chaves obrigatórias de macroetapas no nível raiz:
"1_servicos_preliminares", "2_infraestrutura", "3_superestrutura", "4_cobertura", "5_esquadrias", "6_eletrica", "7_hidraulica", "8_acabamentos".
Cada chave deve conter um OBJETO com: "itens" e "duracao_dias_estimada".

Dentro do array "itens" de "6_eletrica", inclua o campo "subcategoria_eletrica" informando a qual das 12 divisões o material pertence.
${STRICT_JSON_RULES}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, escala, tipo_construcao, regiao, bdi_percentual, instrucoes_adicionais, modo_analise,
      area_m2, pe_direito, num_pavimentos, padrao_acabamento, tipo_fundacao, tipo_cobertura,
      num_quartos, num_banheiros, num_vagas, modo_precisao } = await req.json();

    if (!images || !images.length) {
      return new Response(JSON.stringify({ error: "At least one image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPhotoMode = modo_analise === "foto_ambiente";
    const isHybrid = modo_precisao === "hibrido";
    const analysisImages = isHybrid ? images.slice(0, 3) : images.slice(0, 4);

    const systemPrompt = isHybrid
      ? HYBRID_SYSTEM_PROMPT
      : isPhotoMode
        ? PHOTO_SYSTEM_PROMPT + JSON_STRUCTURE
        : BLUEPRINT_SYSTEM_PROMPT + STRUCTURED_BLUEPRINT_JSON_STRUCTURE;

    let userPrompt = isHybrid
      ? "Identifique e meça TODOS os itens construtivos visíveis. NÃO estime preços."
      : isPhotoMode
        ? "Analise esta(s) foto(s) do ambiente real e retorne o orçamento de reforma completo no formato JSON solicitado."
        : "Analise esta(s) planta(s) ou quadros técnicos e retorne o orçamento analítico completo estruturado no formato JSON solicitado.";
    
    if (!isPhotoMode && escala && escala !== "auto") userPrompt += ` A escala informada é ${escala}.`;
    if (tipo_construcao) userPrompt += ` Tipo de construção: ${tipo_construcao}.`;
    if (regiao) userPrompt += ` Região do projeto: ${regiao}.`;
    if (bdi_percentual && bdi_percentual !== 25) userPrompt += ` Use BDI de ${bdi_percentual}%.`;
    if (area_m2) userPrompt += ` IMPORTANTE: A área total construída é ${area_m2} m². Use este valor para calcular proporcionalmente as metragens paramétricas de infraestrutura e condutores.`;
    if (pe_direito) userPrompt += ` Pé-direito: ${pe_direito}m.`;
    if (num_pavimentos) userPrompt += ` Pavimentos: ${num_pavimentos}.`;
    if (padrao_acabamento) userPrompt += ` Padrão de acabamento solicitado: ${padrao_acabamento}.`;
    if (num_quartos) userPrompt += ` Quartos: ${num_quartos}.`;
    if (num_banheiros) userPrompt += ` Banheiros: ${num_banheiros}.`;
    if (num_vagas) userPrompt += ` Vagas de garagem: ${num_vagas}.`;
    if (tipo_fundacao && tipo_fundacao !== "nao_sei") userPrompt += ` Tipo de fundação definida: ${tipo_fundacao}.`;
    if (tipo_cobertura && tipo_cobertura !== "nao_sei") userPrompt += ` Tipo de cobertura/telhado: ${tipo_cobertura}.`;
    if (instrucoes_adicionais) userPrompt += `\n\nInstruções adicionais importantes: ${instrucoes_adicionais}`;

    let content: string;
    try {
      content = await generateWithOpenAI({
        systemPrompt,
        userText: userPrompt,
        images: analysisImages,
      });
    } catch (err: any) {
      console.error("OpenAI error:", err.message);
      throw err;
    }

    if (!content) throw new Error("Sem resposta da IA");

    let parsed;
    const rawText = content;
    const cleanText = stripMarkdownAndExtractJson(rawText);
    
    try {
      try {
        parsed = JSON.parse(cleanText);
      } catch (initialParseErr) {
        console.warn("JSON.parse inicial falhou; reparando estrutura:", initialParseErr);
        const repairedText = repairAiJson(cleanText);
        parsed = JSON.parse(repairedText);
        console.log("✅ [JSON REPAIR] Resposta estruturada convertida com sucesso.");
      }
      parsed = normalizeStructuredBlueprintResponse(parsed);
    } catch (parseErr: any) {
      console.error("Raw AI Response que falhou no parse:", rawText);
      throw new Error(`Falha ao converter resposta da IA em JSON. Erro: ${parseErr?.message || parseErr}`);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-blueprint error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});