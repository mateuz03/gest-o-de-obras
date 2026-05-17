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

// ==========================================
// NOVO MOTOR DA OPENAI (GPT-4o)
// ==========================================
async function generateWithOpenAI(opts: {
  systemPrompt: string;
  userText: string;
  images: Array<{ mime_type?: string; base64: string }>;
}): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

  // Monta o array de conteúdo misturando texto e imagens de alta resolução
  const content: any[] = [{ type: "text", text: opts.userText }];
  for (const img of opts.images) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mime_type || "image/jpeg"};base64,${img.base64}`,
        detail: "high" // Fundamental para plantas baixas
      }
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const t0 = Date.now();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" }, // Obriga a retornar JSON perfeito
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
    console.log(`✅ [SUCESSO] Análise concluída. Modelo: gpt-4o | Tempo: ${Date.now() - t0}ms`);
    return data.choices[0].message.content;

  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("A análise excedeu o tempo seguro de processamento. Envie menos imagens ou imagens mais leves e tente novamente.");
    }
    throw error;
  }
}

const BLUEPRINT_SYSTEM_PROMPT = `Você é um Engenheiro de Custos Sênior no Brasil, especialista em orçamentos paramétricos e analíticos utilizando a tabela SINAPI. Sua reputação depende de entregar orçamentos COMPLETOS, AUDITÁVEIS e fiéis às boas práticas da engenharia civil brasileira (NBR 12721, SINAPI, TCPO).

==============================
MISSÃO
==============================
Analisar a(s) planta(s) baixa(s) recebida(s) e produzir um ORÇAMENTO ANALÍTICO COMPLETO no padrão brasileiro, seguindo uma Estrutura Analítica de Projeto (EAP / WBS) rigorosa.

==============================
OBRIGATORIEDADE DA EAP (WBS) — INEGOCIÁVEL
==============================
Você é OBRIGADO a gerar o orçamento contemplando TODAS as macroetapas abaixo, NA ORDEM, SEM PULAR NENHUMA. Mesmo que a planta não detalhe explicitamente, você deve deduzir os itens com base nos padrões da engenharia civil residencial brasileira:

1. Serviços Preliminares (placa de obra, barracão, ligações provisórias, limpeza do terreno, locação da obra)
2. Infraestrutura / Fundação (escavação, lastro, sapatas/baldrame/estacas, impermeabilização, ferragem, concreto)
3. Superestrutura — Alvenaria / Concreto (pilares, vigas, lajes, blocos cerâmicos, vergas, contravergas, argamassa de assentamento)
4. Cobertura (estrutura de madeira/metálica, telhas, cumeeiras, calhas, rufos, manta)
5. Esquadrias (portas internas, porta de entrada, janelas, ferragens, fechaduras, batentes, vidros)
6. Instalações Elétricas (cabos por bitola e cor, eletrodutos, caixas 4x2 e 4x4, tomadas, interruptores, disjuntores, quadro de distribuição, pontos de luz, DR/DPS)
7. Instalações Hidrossanitárias (tubos PVC água fria por diâmetro, CPVC/PPR água quente, esgoto, ventilação, conexões, registros, caixas sifonadas, ralos, caixa d'água)
8. Acabamentos (chapisco, reboco, massa corrida, selador, tinta látex/acrílica, pisos cerâmicos/porcelanato, rodapés, azulejos, rejuntes, louças, metais)

==============================
REGRA ANTI-PREGUIÇA (ANTI-LAZINESS) — CRÍTICA
==============================
É EXPRESSAMENTE PROIBIDO retornar um orçamento incompleto, resumido ou simbólico. Orçamentos com menos de 30 itens serão REJEITADOS pelo sistema.

- Baseado na área total identificada na planta, você DEVE deduzir e listar NO MÍNIMO 30 a 50 itens fundamentais para a construção (idealmente 40+).
- Cada uma das 8 macroetapas DEVE conter pelo menos 3 a 6 itens detalhados.
- Se a planta não mostrar o detalhe (ex: bitola de tubo PVC, quantidade de sacos de cimento, metros de cabo elétrico), você DEVE ESTIMAR usando índices paramétricos consagrados:
  • Cimento: ~1 saco/m² de área construída (estrutura + alvenaria + contrapiso)
  • Tijolo cerâmico 9x19x19: ~25 un/m² de parede
  • Cabo elétrico 2,5mm²: ~3 m/m² de área construída
  • Tubo PVC esgoto 100mm: ~0,5 m/m² de área construída
  • Tinta látex: ~1 L para cada 10 m² (2 demãos)
  • Areia/brita: conforme traço de concreto (1:2:3 ou 1:3:6)
- NUNCA encerre o JSON após 1 ou 2 itens. NUNCA use placeholders como "..." ou "demais itens omitidos".

==============================
DETALHAMENTO POR ITEM
==============================
Para CADA item do orçamento, preencha:
- Código (1.1, 1.2, 2.1 ...)
- Descrição técnica completa
- Local de aplicação (cômodo ou área)
- Fornecedor (se souber; caso contrário '—')
- Marca (se souber; caso contrário '—')
- Quantidade COM perdas incluídas
- Unidade fisicamente correta (m, m², m³, kg, sc, un, L)
- Preço unitário em R$ (referência SINAPI quando aplicável)
- Preço total em R$
- Código SINAPI (quando aplicável; senão '')
- Origem do preço: 'SINAPI' ou 'Sem correspondência SINAPI — estimativa de mercado'
- Taxa de perda aplicada (ex: '5% cerâmica', '10% argamassa', '15% tubo')

==============================
DETALHAMENTO OBRIGATÓRIO — INSTALAÇÕES ELÉTRICAS E HIDRÁULICAS
==============================
Elétrica: Cabos discriminados por bitola e cor, disjuntores por amperagem, eletrodutos, caixas, tomadas, interruptores, quadro, DR, DPS. (use 'pol' ou aspas simples para indicar polegadas — NUNCA aspas duplas).
Hidráulica: Tubos PVC água fria por diâmetro, CPVC/PPR para água quente, esgoto e ventilação, conexões, registros, caixas sifonadas, ralos, caixa d'água.

==============================
TRAVAS DE ENGENHARIA (GUARDRAILS) — INEGOCIÁVEIS
==============================
1. PROIBIÇÃO DE INSUMOS SOLTOS E MAQUINÁRIO PESADO: Você está orçando obra RESIDENCIAL. PROIBIDO listar maquinário pesado como item individual (retroescavadeira un). Use Serviços Compostos (Escavação mecanizada m³).
2. CONSOLIDAÇÃO OBRIGATÓRIA: Não repita serviços na mesma macroetapa. Some tudo e crie uma única linha de "Escavação", "Aço", "Pintura" etc.
3. SANITY CHECK MATEMÁTICO: Custo total por m² não deve passar de R$ 8.000/m². 
4. COMPORTAMENTO PROFISSIONAL: Seja conservador e realista. Extraia áreas reais e aplique paramétricos consagrados.
`;

const PHOTO_SYSTEM_PROMPT = `Você é um Engenheiro Civil e Orçamentista especializado em análise de ambientes reais a partir de fotos e orçamentos de obras/reformas no padrão brasileiro.

Ao receber fotos de um ambiente real, você deve:
1. IDENTIFICAR O AMBIENTE
2. ESTIMAR DIMENSÕES (use referências como portas, azulejos e informe margem de erro)
3. ANALISAR MATERIAIS EXISTENTES
4. GERAR ORÇAMENTO DE REFORMA/SUBSTITUIÇÃO organizado por MACROETAPAS
5. DETALHAR CADA ITEM (descrição, quant, unid, preço, perdas, marcas)
IMPORTANTE: Sempre informe no resumo que as medidas são ESTIMATIVAS baseadas em análise visual e que uma medição in loco é recomendada para precisão.`;

const HYBRID_SYSTEM_PROMPT = `Você é um Engenheiro Civil Sênior especializado em ORÇAMENTAÇÃO RESIDENCIAL no Brasil.

Sua ÚNICA missão é IDENTIFICAR e MEDIR os itens construtivos visíveis nas imagens. Você NÃO deve estimar preços, NÃO consultar SINAPI, NÃO calcular orçamentos. Os preços serão buscados depois em uma base de dados local pelo sistema.

REGRAS ESTRITAS:
1. NUNCA inclua AQUISIÇÃO de maquinário pesado.
2. UNIDADES DE MEDIDA corretas (m³, kg, m, m², un, sc).
3. CATEGORIZAÇÃO ESTRITA por macro_etapa (Fundação, Estrutura, etc).
4. QUANTIDADES REALISTAS para escala residencial.

Retorne APENAS um JSON válido.
${STRICT_JSON_RULES}`;

const JSON_STRUCTURE = `
Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{
  "resumo": "Descrição do ambiente/planta analisada",
  "area_total_m2": 0,
  "escala_detectada": "estimativa visual" ou "1:50",
  "referencia_sinapi": "SINAPI - UF/Mês/Ano",
  "macro_etapas": [
    {
      "nome": "Nome da Macroetapa",
      "itens": [
        {
          "item": "1.1",
          "descricao": "Descrição",
          "local_aplicacao": "Sala",
          "fornecedor": "—",
          "marca": "—",
          "quantidade": 0,
          "unidade": "m²",
          "preco_unitario": 0.00,
          "preco_total": 0.00,
          "codigo_sinapi": "12345",
          "origem_preco": "SINAPI",
          "perda_aplicada": "5%"
        }
      ],
      "subtotal": 0.00
    }
  ],
  "quantitativo_por_comodo": [],
  "resumo_final": {
    "total_materiais": 0.00,
    "total_mao_de_obra": 0.00,
    "total_geral": 0.00,
    "bdi_percentual": 25,
    "bdi_valor": 0.00,
    "premissas_bdi": "BDI padrão de 25% aplicado"
  },
  "recomendacoes": []
}
${STRICT_JSON_RULES}`;

const STRUCTURED_BLUEPRINT_JSON_STRUCTURE = `
Retorne APENAS um JSON válido (sem markdown).
A resposta DEVE usar as 8 chaves obrigatórias de macroetapas no nível raiz:
"1_servicos_preliminares", "2_infraestrutura", "3_superestrutura", "4_cobertura", "5_esquadrias", "6_eletrica", "7_hidraulica", "8_acabamentos".
Cada chave deve conter um OBJETO com: "itens" e "duracao_dias_estimada".
NÃO retorne "macro_etapas" diretamente; o sistema fará esse mapeamento depois.
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
      ? "Identifique e meça TODOS os itens construtivos visíveis. NÃO estime preços. Devolva apenas o array measurements no JSON solicitado."
      : isPhotoMode
        ? "Analise esta(s) foto(s) do ambiente real e retorne o orçamento de reforma/substituição completo no formato JSON solicitado."
        : "Analise esta(s) planta(s) baixa(s) e retorne o orçamento completo no formato JSON solicitado.";
    
    if (!isPhotoMode && escala && escala !== "auto") userPrompt += ` A escala informada é ${escala}.`;
    if (tipo_construcao) userPrompt += ` Tipo de construção: ${tipo_construcao}.`;
    if (regiao) userPrompt += ` Região: ${regiao} (use SINAPI desta UF/cidade).`;
    if (bdi_percentual && bdi_percentual !== 25) userPrompt += ` Use BDI de ${bdi_percentual}% (em vez do padrão de 25%).`;
    if (area_m2) userPrompt += ` IMPORTANTE: A área total construída é ${area_m2} m². Use este valor como referência principal — NÃO tente estimar a metragem pela planta.`;
    if (pe_direito) userPrompt += ` Pé-direito: ${pe_direito}m.`;
    if (num_pavimentos) userPrompt += ` Número de pavimentos: ${num_pavimentos}.`;
    if (padrao_acabamento) userPrompt += ` Padrão de acabamento: ${padrao_acabamento}.`;
    if (num_quartos) userPrompt += ` Quartos: ${num_quartos}.`;
    if (num_banheiros) userPrompt += ` Banheiros: ${num_banheiros}.`;
    if (num_vagas) userPrompt += ` Vagas de garagem: ${num_vagas}.`;
    if (tipo_fundacao && tipo_fundacao !== "nao_sei") userPrompt += ` Tipo de fundação definida: ${tipo_fundacao}.`;
    if (tipo_cobertura && tipo_cobertura !== "nao_sei") userPrompt += ` Tipo de cobertura/telhado: ${tipo_cobertura}.`;
    if (instrucoes_adicionais) userPrompt += `\n\nInstruções adicionais: ${instrucoes_adicionais}`;

    let content: string;
    try {
      // ✅ Chamada com o Novo Motor
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
        console.warn("JSON.parse inicial falhou; tentando reparar resposta da IA:", initialParseErr);
        const repairedText = repairAiJson(cleanText);
        parsed = JSON.parse(repairedText);
        console.log("✅ [JSON REPAIR] Resposta da IA reparada com sucesso.");
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