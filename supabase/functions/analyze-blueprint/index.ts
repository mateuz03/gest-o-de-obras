import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI, SchemaType } from "npm:@google/generative-ai@^0.21.0";
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

const ORCAMENTO_ITEM_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    item: { type: SchemaType.STRING },
    descricao: { type: SchemaType.STRING },
    local_aplicacao: { type: SchemaType.STRING },
    fornecedor: { type: SchemaType.STRING },
    marca: { type: SchemaType.STRING },
    quantidade: { type: SchemaType.NUMBER },
    unidade: { type: SchemaType.STRING },
    preco_unitario: { type: SchemaType.NUMBER },
    preco_total: { type: SchemaType.NUMBER },
    codigo_sinapi: { type: SchemaType.STRING },
    origem_preco: { type: SchemaType.STRING },
    perda_aplicada: { type: SchemaType.STRING },
  },
  required: ["descricao", "quantidade", "unidade", "preco_unitario"],
} as const;

const BLUEPRINT_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    resumo: { type: SchemaType.STRING },
    area_total_m2: { type: SchemaType.NUMBER },
    escala_detectada: { type: SchemaType.STRING },
    referencia_sinapi: { type: SchemaType.STRING },
    ...Object.fromEntries(
      MACRO_ETAPA_SCHEMA_KEYS.map(({ key }) => [
        key,
        { type: SchemaType.ARRAY, items: ORCAMENTO_ITEM_SCHEMA },
      ]),
    ),
    quantitativo_por_comodo: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          comodo: { type: SchemaType.STRING },
          itens: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                item: { type: SchemaType.STRING },
                descricao: { type: SchemaType.STRING },
                quantidade: { type: SchemaType.NUMBER },
                unidade: { type: SchemaType.STRING },
                subtotal: { type: SchemaType.NUMBER },
              },
            },
          },
          subtotal: { type: SchemaType.NUMBER },
        },
      },
    },
    recomendacoes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          material: { type: SchemaType.STRING },
          marcas: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                nome: { type: SchemaType.STRING },
                justificativa: { type: SchemaType.STRING },
              },
            },
          },
        },
      },
    },
  },
  required: MACRO_ETAPA_SCHEMA_KEYS.map(({ key }) => key),
} as const;

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
  const hasStructuredStages = MACRO_ETAPA_SCHEMA_KEYS.some(({ key }) => Array.isArray(parsed[key]));
  if (!hasStructuredStages) return parsed;

  const macro_etapas = MACRO_ETAPA_SCHEMA_KEYS.map(({ key, nome }, stageIndex) => {
    const itens = (Array.isArray(parsed[key]) ? parsed[key] : []).map((rawItem: any, itemIndex: number) => {
      const quantidade = Number(rawItem?.quantidade ?? rawItem?.quant ?? rawItem?.quantity ?? 0) || 0;
      const precoUnitario = Number(rawItem?.preco_unitario ?? rawItem?.preco_unit ?? rawItem?.unit_price ?? 0) || 0;
      const precoTotal = Number(rawItem?.preco_total ?? rawItem?.subtotal ?? quantidade * precoUnitario) || 0;
      return {
        item: rawItem?.item || `${stageIndex + 1}.${itemIndex + 1}`,
        descricao: rawItem?.descricao || rawItem?.description || "Item estimado",
        local_aplicacao: rawItem?.local_aplicacao || rawItem?.local || "Obra geral",
        fornecedor: rawItem?.fornecedor || "—",
        marca: rawItem?.marca || "—",
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

async function generateWithGemini(opts: {
  systemPrompt: string;
  userText: string;
  images: Array<{ mime_type?: string; base64: string }>;
  maxOutputTokens: number;
  responseSchema?: any;
}): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const parts: any[] = [{ text: opts.userText }];
  for (const img of opts.images) {
    parts.push({
      inlineData: { mimeType: img.mime_type || "image/jpeg", data: img.base64 },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  const tryModel = async (modelName: string) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: opts.systemPrompt,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
      },
    });
    const t0 = Date.now();
    const result = await model.generateContent(
      { contents: [{ role: "user", parts }] },
      { signal: controller.signal } as any,
    );
    const text = result.response.text();
    console.log(`✅ [SUCESSO] Análise concluída. Modelo utilizado: ${modelName} | Tempo de processamento: ${Date.now() - t0}ms`);
    return text;
  };

  try {
    try {
      return await tryModel("gemini-2.5-flash");
    } catch (error: any) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      const msg = error?.message || String(error);
      if (/\b(503|500)\b|service unavailable|overloaded|high demand/i.test(msg)) {
        console.warn("Primary model failed, trying fallback gemini-1.5-flash:", msg);
        return await tryModel("gemini-1.5-flash");
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("A análise excedeu o tempo seguro de processamento. Envie menos imagens ou imagens mais leves e tente novamente.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
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
DETALHAMENTO OBRIGATÓRIO — INSTALAÇÕES ELÉTRICAS
==============================
- Cabos discriminados por bitola (1,5 / 2,5 / 4 / 6 / 10 mm²) e cor (azul/neutro, verde/terra, vermelho ou preto/fase)
- Disjuntores por amperagem (10A, 16A, 20A, 25A, 32A, 40A, 50A)
- Eletrodutos (corrugado 3/4', PVC rígido), caixas 4x2 e 4x4
- Tomadas 2P+T 10A e 20A, interruptores simples/paralelo/intermediário, pontos de luz
- Quadro de distribuição, DR, DPS
(use 'pol' ou aspas simples para indicar polegadas — NUNCA aspas duplas)

==============================
DETALHAMENTO OBRIGATÓRIO — INSTALAÇÕES HIDRÁULICAS
==============================
- Tubos PVC água fria por diâmetro (20, 25, 32, 50 mm)
- CPVC/PPR para água quente
- Tubos esgoto (40, 50, 75, 100 mm) e ventilação
- Conexões (joelhos, tês, luvas), registros (gaveta, pressão, esfera)
- Caixas sifonadas, ralos, válvulas, caixa d'água

==============================
PREÇOS DE REFERÊNCIA SINAPI
==============================
- Use UF/cidade do projeto quando informada
- Informe mês/ano da referência SINAPI no campo 'referencia_sinapi'

==============================
QUANTITATIVO POR CÔMODO
==============================
Gere também um quantitativo separado por cômodo, cada um com seus itens e subtotal.

==============================
RESUMO FINAL
==============================
Total materiais, total mão de obra (se aplicável), total geral, BDI (padrão 25% se não informado).

==============================
RECOMENDAÇÕES DE MARCAS
==============================
Sugira 3 marcas brasileiras com bom custo-benefício para cada categoria principal (cimento, tinta, louças, metais, cerâmica, fios, tubos).

==============================
LEMBRETE FINAL
==============================
Orçamentos com menos de 30 itens OU que pulem qualquer das 8 macroetapas serão considerados FALHA grave. Trabalhe como um orçamentista profissional entregando uma planilha real para um cliente pagante.`;

const PHOTO_SYSTEM_PROMPT = `Você é um Engenheiro Civil e Orçamentista especializado em análise de ambientes reais a partir de fotos e orçamentos de obras/reformas no padrão brasileiro.

Ao receber fotos de um ambiente real (banheiro, cozinha, sala, quarto, etc.), você deve:

1. IDENTIFICAR O AMBIENTE:
   - Determine o tipo de cômodo/ambiente fotografado
   - Liste todos os elementos visíveis (piso, revestimento, louças, metais, iluminação, esquadrias, etc.)

2. ESTIMAR DIMENSÕES:
   - Use objetos de referência visíveis para estimar dimensões (portas padrão ~2,10m x 0,80m, tomadas a ~30cm do chão, azulejos padrão 30x60cm, etc.)
   - Se houver trena ou objeto de referência na foto, use como base principal
   - Informe SEMPRE a margem de erro estimada (ex: "±15%")
   - Calcule área estimada do piso, paredes, e perímetro

3. ANALISAR MATERIAIS EXISTENTES:
   - Identifique tipo de piso (cerâmica, porcelanato, vinílico, etc.) e formato estimado
   - Identifique revestimentos de parede (azulejo, pintura, pastilha, etc.)
   - Identifique louças e metais (marca se visível, tipo, estado de conservação)
   - Identifique iluminação (spots, plafons, luminárias)
   - Identifique esquadrias (portas, janelas, box)
   - Identifique instalações visíveis (torneiras, registros, ralos, tomadas, interruptores)

4. GERAR ORÇAMENTO DE REFORMA/SUBSTITUIÇÃO organizado por MACROETAPAS:
   - Demolição e remoção (se necessário)
   - Revestimentos e pisos
   - Instalações hidráulicas
   - Instalações elétricas
   - Louças e metais
   - Esquadrias
   - Pintura
   - Complementares / limpeza

5. PARA CADA ITEM do orçamento:
   - Código do item (estruturado por grupo)
   - Descrição detalhada
   - Local de aplicação (nome do ambiente)
   - Fornecedor (se souber; caso contrário "—")
   - Marca (se souber; caso contrário "—")
   - Quantidade com perdas incluídas
   - Unidade
   - Preço unitário R$
   - Preço total R$
   - Código SINAPI (quando aplicável; caso contrário "")
   - Origem do preço: "SINAPI" ou "Sem correspondência SINAPI — estimativa de mercado"
   - Taxa de perda aplicada

6. QUANTITATIVO POR CÔMODO:
   - Agrupar todos os materiais pelo ambiente identificado

7. RESUMO FINAL:
   - Total materiais, Total mão de obra, Total geral, BDI

8. RECOMENDAÇÕES DE MARCAS:
   - Sugira 3 marcas brasileiras por custo-benefício

IMPORTANTE: Sempre informe no resumo que as medidas são ESTIMATIVAS baseadas em análise visual e que uma medição in loco é recomendada para precisão.`;

// HYBRID MODE: only raw measurements, NO prices, NO SINAPI lookup.
// Pricing is computed downstream by match-sinapi against the local DB.
const HYBRID_SYSTEM_PROMPT = `Você é um Engenheiro Civil Sênior especializado em ORÇAMENTAÇÃO RESIDENCIAL no Brasil.

Sua ÚNICA missão é IDENTIFICAR e MEDIR os itens construtivos visíveis nas imagens. Você NÃO deve estimar preços, NÃO consultar SINAPI, NÃO calcular orçamentos. Os preços serão buscados depois em uma base de dados local pelo sistema.

REGRAS ESTRITAS (NÃO VIOLE EM HIPÓTESE ALGUMA):

1. NUNCA inclua AQUISIÇÃO de maquinário pesado (tratores, perfuratrizes, guindastes, betoneiras industriais, retroescavadeiras, gruas, caminhões). Obras residenciais ALUGAM equipamentos ou contratam o SERVIÇO de execução. Se for indispensável, descreva como SERVIÇO (ex: "Serviço de perfuração de estaca", unidade "m") — nunca como compra de equipamento.

2. UNIDADES DE MEDIDA — preste muita atenção e use a unidade fisicamente correta:
   - Concreto: m³
   - Aço/ferragem: kg
   - Tubos, cabos, rodapés, perfis: m (metro linear)
   - Alvenaria, revestimentos, pisos, pintura, forma: m²
   - Tijolos, blocos, telhas, louças, metais, luminárias: un
   - Cimento, argamassa, cal: sc (saco) ou kg
   NUNCA use "un" para itens contínuos como concreto, aço, tubos ou cabos.

3. CATEGORIZAÇÃO ESTRITA por macro_etapa — não misture categorias:
   - Fundação: estacas, sapatas, blocos, baldrame, lastro
   - Estrutura: pilares, vigas, lajes, escadas de concreto
   - Alvenaria: blocos, tijolos, vergas, contravergas
   - Cobertura: telhas, estrutura de telhado, calhas, rufos
   - Esquadrias: portas, janelas, ferragens
   - Hidráulica: tubos, conexões, registros, caixas
   - Elétrica: cabos, eletrodutos, disjuntores, tomadas, interruptores
   - Revestimentos: cerâmica, porcelanato, reboco, gesso
   - Pintura: tintas, massas, seladores
   - Louças e Metais: vasos, pias, torneiras, chuveiros, acessórios de banheiro
   ATENÇÃO: Fundação NÃO pode ir para Louças/Metais ou Acabamentos. Estacas de concreto pertencem à Fundação.

4. QUANTIDADES REALISTAS para escala residencial. Desconfie de números absurdos (ex: 100 estacas para uma casa pequena). Inclua perdas razoáveis (5–10%).

DETALHE INSTALAÇÕES ELÉTRICAS (cabos por bitola, disjuntores por amperagem, eletrodutos, caixas, módulos).
DETALHE INSTALAÇÕES HIDRÁULICAS (tubos por diâmetro, conexões, registros).

Retorne APENAS um JSON válido (sem markdown):
{
  "resumo": "Descrição breve do projeto medido",
  "area_total_m2": 0,
  "escala_detectada": "1:50" | "estimativa visual",
  "measurements": [
    { "macro_etapa": "Alvenaria", "item": "...", "descricao": "...", "quantidade": 0, "unidade": "m²", "local_aplicacao": "Sala" }
  ]
}
${STRICT_JSON_RULES}`;

const JSON_STRUCTURE = `
Retorne APENAS um JSON válido (sem markdown, sem backticks) com esta estrutura:
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
          "descricao": "Descrição completa do item",
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
  "quantitativo_por_comodo": [
    {
      "comodo": "Banheiro",
      "itens": [
        { "item": "1.1", "descricao": "Descrição do item", "quantidade": 0, "unidade": "un", "subtotal": 0.00 }
      ],
      "subtotal": 0.00
    }
  ],
  "resumo_final": {
    "total_materiais": 0.00,
    "total_mao_de_obra": 0.00,
    "total_geral": 0.00,
    "bdi_percentual": 25,
    "bdi_valor": 0.00,
    "premissas_bdi": "BDI padrão de 25% aplicado"
  },
  "recomendacoes": [
    {
      "material": "Categoria",
      "marcas": [
        {"nome": "Marca", "justificativa": "Por que recomendada"}
      ]
    }
  ]
}
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
      : (isPhotoMode ? PHOTO_SYSTEM_PROMPT : BLUEPRINT_SYSTEM_PROMPT) + JSON_STRUCTURE;

    let userPrompt = isHybrid
      ? "Identifique e meça TODOS os itens construtivos visíveis. NÃO estime preços. Devolva apenas o array measurements no JSON solicitado."
      : isPhotoMode
        ? "Analise esta(s) foto(s) do ambiente real e retorne o orçamento de reforma/substituição completo no formato JSON solicitado."
        : "Analise esta(s) planta(s) baixa(s) e retorne o orçamento completo no formato JSON solicitado.";
    if (!isPhotoMode && escala && escala !== "auto") userPrompt += ` A escala informada é ${escala}.`;
    if (tipo_construcao) userPrompt += ` Tipo de construção: ${tipo_construcao}.`;
    if (regiao) userPrompt += ` Região: ${regiao} (use SINAPI desta UF/cidade).`;
    if (bdi_percentual && bdi_percentual !== 25) userPrompt += ` Use BDI de ${bdi_percentual}% (em vez do padrão de 25%).`;

    // New detailed parameters
    if (area_m2) userPrompt += ` IMPORTANTE: A área total construída é ${area_m2} m². Use este valor como referência principal — NÃO tente estimar a metragem pela planta.`;
    if (pe_direito) userPrompt += ` Pé-direito: ${pe_direito}m.`;
    if (num_pavimentos) userPrompt += ` Número de pavimentos: ${num_pavimentos}.`;
    if (padrao_acabamento) {
      const padraoMap: Record<string, string> = { popular: "Popular (materiais econômicos)", medio: "Médio (custo-benefício)", alto: "Alto (marcas premium)", luxo: "Luxo (materiais importados/top de linha)" };
      userPrompt += ` Padrão de acabamento: ${padraoMap[padrao_acabamento] || padrao_acabamento}. Ajuste os preços e marcas de acordo com este padrão.`;
    }
    if (num_quartos) userPrompt += ` Quartos: ${num_quartos}.`;
    if (num_banheiros) userPrompt += ` Banheiros: ${num_banheiros}.`;
    if (num_vagas) userPrompt += ` Vagas de garagem: ${num_vagas}.`;
    if (tipo_fundacao && tipo_fundacao !== "nao_sei") userPrompt += ` Tipo de fundação definida: ${tipo_fundacao}.`;
    if (tipo_cobertura && tipo_cobertura !== "nao_sei") userPrompt += ` Tipo de cobertura/telhado: ${tipo_cobertura}.`;

    if (instrucoes_adicionais) userPrompt += `\n\nInstruções adicionais: ${instrucoes_adicionais}`;

    let content: string;
    try {
      content = await generateWithGemini({
        systemPrompt,
        userText: userPrompt,
        images: analysisImages,
        maxOutputTokens: isHybrid ? 6000 : 12000,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error("Gemini error:", msg);
      if (/quota|rate/i.test(msg)) {
        return new Response(JSON.stringify({ error: "Limite de requisições da API Gemini excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }
    if (!content) throw new Error("No content in AI response");

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
        console.log("✅ [JSON REPAIR] Resposta da IA reparada e parseada com sucesso.");
      }
    } catch (parseErr: any) {
      console.error("Raw AI Response que falhou no parse:", rawText);
      throw new Error(`Failed to parse AI response as JSON. Error: ${parseErr?.message || parseErr}`);
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
