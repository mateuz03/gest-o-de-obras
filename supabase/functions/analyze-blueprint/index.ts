import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@^3.13.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_TIMEOUT_MS = 115_000;
const MAX_IMAGES_STANDARD = 3;
const MAX_IMAGES_HYBRID = 2;
const MAX_IMAGE_BASE64_LENGTH = 180_000;
const MAX_TOTAL_BASE64_LENGTH = 450_000;

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

const ELECTRICAL_SUBCATEGORIES = [
  "1. Entrada de energia e medição",
  "2. Quadros elétricos",
  "3. Dispositivos de proteção",
  "4. Iluminação",
  "5. Tomadas de uso geral — TUG",
  "6. Tomadas de uso específico — TUE",
  "7. Condutores e cabos",
  "8. Infraestrutura elétrica",
  "9. Aterramento e equipotencialização",
  "10. Comunicação, dados e TV",
  "11. Automação e comandos",
  "12. Acabamentos elétricos",
] as const;

const STRICT_JSON_RULES = `
REGRAS CRÍTICAS DE FORMATAÇÃO JSON:
- Você deve retornar APENAS um JSON válido.
- Todas as chaves e strings do JSON devem seguir a sintaxe JSON padrão com aspas duplas.
- Dentro dos valores textuais, evite usar aspas duplas desnecessárias; se precisar indicar polegadas, escreva "pol" ou use aspas simples.
- Verifique rigorosamente a estrutura do JSON.
- Garanta que TODOS os objetos dentro de arrays estejam devidamente separados por vírgula.
- Não inclua texto antes ou depois do JSON, comentários, markdown, blocos \`\`\`json, reticências ou placeholders como [...].
`;

type IncomingImage = {
  mime_type?: string;
  base64: string;
};

type ValidationResult = {
  ok: boolean;
  errors: string[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "").trim();
    if (!normalized) return null;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function sanitizeString(value: unknown, maxLen = 2000): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.slice(0, maxLen);
}

function normalizeMimeType(mime?: string): string {
  if (!mime || typeof mime !== "string") return "image/jpeg";
  const clean = mime.trim().toLowerCase();
  if (
    clean === "image/jpeg" ||
    clean === "image/jpg" ||
    clean === "image/png" ||
    clean === "image/webp"
  ) {
    return clean === "image/jpg" ? "image/jpeg" : clean;
  }
  return "image/jpeg";
}

function validateImages(images: unknown, maxAllowed: number): ValidationResult {
  const errors: string[] = [];
  let totalLen = 0;

  if (!Array.isArray(images) || images.length === 0) {
    errors.push("Pelo menos uma imagem é obrigatória.");
    return { ok: false, errors };
  }

  if (images.length > 12) {
    errors.push("Quantidade de imagens enviada é excessiva. Envie no máximo 12 arquivos.");
  }

  images.forEach((img, index) => {
    if (!isPlainObject(img)) {
      errors.push(`Imagem ${index + 1} inválida.`);
      return;
    }

    const base64 = img.base64;
    if (typeof base64 !== "string" || !base64.trim()) {
      errors.push(`Imagem ${index + 1} sem conteúdo base64.`);
      return;
    }

    const len = base64.length;
    totalLen += len;

    if (len > MAX_IMAGE_BASE64_LENGTH) {
      errors.push(
        `Imagem ${index + 1} está muito grande. Reduza a resolução/qualidade antes de enviar.`
      );
    }
  });

  if (totalLen > MAX_TOTAL_BASE64_LENGTH) {
    errors.push(
      "O conjunto de imagens está muito pesado para análise. Envie menos imagens ou imagens mais leves."
    );
  }

  if (images.length > maxAllowed) {
    errors.push(
      `Foram enviadas ${images.length} imagens, mas apenas ${maxAllowed} serão consideradas neste modo de análise.`
    );
  }

  return { ok: errors.filter((e) => !e.includes("apenas")).length === 0, errors };
}

function stripMarkdownAndExtractJson(text: string): string {
  const cleaned = text
    .replace(/```json\s?/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstObject = cleaned.indexOf("{");
  const firstArray = cleaned.indexOf("[");
  const start =
    firstObject === -1
      ? firstArray
      : firstArray === -1
      ? firstObject
      : Math.min(firstObject, firstArray);

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
    console.warn("jsonrepair falhou na primeira tentativa:", repairErr);
    return jsonrepair(escapeLikelyUnescapedQuotes(normalized));
  }
}

function classifyAnalysisMode(
  modo_analise: unknown,
  modo_precisao: unknown
): { isPhotoMode: boolean; isHybrid: boolean; modeLabel: string } {
  const isPhotoMode = modo_analise === "foto_ambiente";
  const isHybrid = modo_precisao === "hibrido";

  return {
    isPhotoMode,
    isHybrid,
    modeLabel: isHybrid ? "hibrido" : isPhotoMode ? "foto_ambiente" : "planta_documento",
  };
}

function ensureAllowedElectricalSubcategory(value: unknown): string {
  if (typeof value !== "string") return "";
  const clean = value.trim();
  return ELECTRICAL_SUBCATEGORIES.includes(clean as (typeof ELECTRICAL_SUBCATEGORIES)[number])
    ? clean
    : "";
}

function buildWarningsFromMacroEtapas(macro_etapas: any[], areaTotal: number | null): string[] {
  const warnings: string[] = [];

  const emptyStages = macro_etapas.filter((etapa) => !Array.isArray(etapa.itens) || etapa.itens.length === 0);
  if (emptyStages.length > 0) {
    warnings.push(
      `Algumas macroetapas vieram sem itens detalhados: ${emptyStages
        .map((e) => e.nome)
        .join(", ")}.`
    );
  }

  const itemsWithoutPrice: string[] = [];
  const itemsWithZeroQty: string[] = [];

  for (const etapa of macro_etapas) {
    for (const item of etapa.itens ?? []) {
      if ((Number(item.preco_unitario) || 0) <= 0) {
        itemsWithoutPrice.push(`${etapa.nome}: ${item.descricao}`);
      }
      if ((Number(item.quantidade) || 0) <= 0) {
        itemsWithZeroQty.push(`${etapa.nome}: ${item.descricao}`);
      }
    }
  }

  if (itemsWithoutPrice.length > 0) {
    warnings.push("Há itens com preço unitário zerado ou ausente.");
  }

  if (itemsWithZeroQty.length > 0) {
    warnings.push("Há itens com quantidade zerada ou ausente.");
  }

  const resumoTotal = macro_etapas.reduce(
    (sum, etapa) => sum + (Number(etapa.subtotal) || 0),
    0
  );

  if (areaTotal && areaTotal > 0 && resumoTotal > 0) {
    const custoM2 = resumoTotal / areaTotal;
    if (custoM2 < 50) {
      warnings.push(
        `O custo estimado por m² (${custoM2.toFixed(
          2
        )}) parece baixo para um orçamento analítico completo. Revise a extração.`
      );
    }
    if (custoM2 > 15000) {
      warnings.push(
        `O custo estimado por m² (${custoM2.toFixed(
          2
        )}) parece alto para uma obra residencial padrão. Revise a extração.`
      );
    }
  }

  return warnings;
}

function normalizeStructuredBlueprintResponse(parsed: any, context?: { area_m2?: number | null; bdi_percentual?: number | null }) {
  if (!parsed || typeof parsed !== "object") return parsed;

  const hasStructuredStages = MACRO_ETAPA_SCHEMA_KEYS.some(({ key }) => {
    const val = parsed[key];
    return Array.isArray(val) || (val && typeof val === "object" && Array.isArray(val.itens));
  });

  if (!hasStructuredStages) return parsed;

  const DEFAULT_DURATIONS = [7, 25, 30, 15, 10, 15, 15, 30];
  const normalizationWarnings: string[] = [];

  const macro_etapas = MACRO_ETAPA_SCHEMA_KEYS.map(({ key, nome }, stageIndex) => {
    const raw = parsed[key];
    const itensSrc = Array.isArray(raw) ? raw : raw && Array.isArray(raw.itens) ? raw.itens : [];
    const rawDuration = Number(
      (raw && !Array.isArray(raw) && raw.duracao_dias_estimada) ??
        DEFAULT_DURATIONS[stageIndex] ??
        15
    );
    const duracao_dias_estimada =
      Number.isFinite(rawDuration) && rawDuration > 0
        ? rawDuration
        : DEFAULT_DURATIONS[stageIndex];

    const itens = itensSrc.map((rawItem: any, itemIndex: number) => {
      const quantidade =
        toFiniteNumber(rawItem?.quantidade ?? rawItem?.quant ?? rawItem?.quantity) ?? 0;
      const precoUnitario =
        toFiniteNumber(rawItem?.preco_unitario ?? rawItem?.preco_unit ?? rawItem?.unit_price) ?? 0;
      const precoTotal =
        toFiniteNumber(rawItem?.preco_total ?? rawItem?.subtotal) ??
        quantidade * precoUnitario;

      const itemNormalizado = {
        item: sanitizeString(rawItem?.item, 50) || `${stageIndex + 1}.${itemIndex + 1}`,
        descricao:
          sanitizeString(rawItem?.descricao ?? rawItem?.description, 500) || "Item estimado",
        local_aplicacao:
          sanitizeString(rawItem?.local_aplicacao ?? rawItem?.local, 200) || "Obra geral",
        fornecedor: sanitizeString(rawItem?.fornecedor, 120) || "—",
        marca: sanitizeString(rawItem?.marca, 120) || "—",
        marca_sugerida:
          sanitizeString(rawItem?.marca_sugerida ?? rawItem?.marca, 120) || "—",
        quantidade,
        unidade: sanitizeString(rawItem?.unidade ?? rawItem?.unit, 30) || "un",
        preco_unitario: precoUnitario,
        preco_total: Number.isFinite(precoTotal) ? precoTotal : 0,
        codigo_sinapi: sanitizeString(rawItem?.codigo_sinapi, 80) || "",
        origem_preco:
          sanitizeString(rawItem?.origem_preco, 80) || "SINAPI",
        perda_aplicada:
          sanitizeString(rawItem?.perda_aplicada ?? rawItem?.perda, 50) || "10%",
        subcategoria_especifica:
          key === "6_eletrica"
            ? ensureAllowedElectricalSubcategory(
                rawItem?.subcategoria_eletrica ?? rawItem?.subcategoria_especifica
              )
            : sanitizeString(
                rawItem?.subcategoria_especifica ?? rawItem?.subcategoria_eletrica,
                120
              ) || "",
        criterio_extracao:
          sanitizeString(rawItem?.criterio_extracao, 80) || "inferido_parametricamente",
        memoria_calculo:
          sanitizeString(rawItem?.memoria_calculo, 300) || "",
      };

      if (key === "6_eletrica" && !itemNormalizado.subcategoria_especifica) {
        normalizationWarnings.push(
          `Item elétrico sem subcategoria válida: ${itemNormalizado.descricao}`
        );
      }

      return itemNormalizado;
    });

    return {
      nome,
      itens,
      duracao_dias_estimada,
      subtotal: itens.reduce(
        (sum: number, item: any) => sum + (Number(item.preco_total) || 0),
        0
      ),
    };
  });

  const totalMateriais = macro_etapas.reduce((sum, etapa) => sum + etapa.subtotal, 0);
  const requestedBdi = context?.bdi_percentual;
  const bdiPercentual =
    toFiniteNumber(parsed?.resumo_final?.bdi_percentual) ??
    requestedBdi ??
    25;

  const bdiValor =
    toFiniteNumber(parsed?.resumo_final?.bdi_valor) ??
    totalMateriais * (bdiPercentual / 100);

  const totalMaoDeObra =
    toFiniteNumber(parsed?.resumo_final?.total_mao_de_obra) ?? 0;

  const totalGeral =
    toFiniteNumber(parsed?.resumo_final?.total_geral) ??
    totalMateriais + totalMaoDeObra + bdiValor;

  const areaFromParsed =
    toFiniteNumber(parsed?.area_total_m2) ??
    context?.area_m2 ??
    null;

  const warnings = [
    ...(Array.isArray(parsed?.warnings)
      ? parsed.warnings.filter((w: unknown) => typeof w === "string")
      : []),
    ...normalizationWarnings,
    ...buildWarningsFromMacroEtapas(macro_etapas, areaFromParsed),
  ];

  const normalized = {
    ...parsed,
    tipo_analise: sanitizeString(parsed?.tipo_analise, 60) || "orcamento_analitico",
    area_total_m2: areaFromParsed ?? 0,
    macro_etapas,
    warnings,
    confiabilidade: {
      nivel_geral:
        sanitizeString(parsed?.confiabilidade?.nivel_geral, 20) || "medio",
      observacoes:
        Array.isArray(parsed?.confiabilidade?.observacoes)
          ? parsed.confiabilidade.observacoes.filter((v: unknown) => typeof v === "string")
          : [],
    },
    resumo_final: {
      total_materiais:
        toFiniteNumber(parsed?.resumo_final?.total_materiais) ?? totalMateriais,
      total_mao_de_obra: totalMaoDeObra,
      total_geral: totalGeral,
      bdi_percentual: bdiPercentual,
      bdi_valor: bdiValor,
      premissas_bdi:
        sanitizeString(parsed?.resumo_final?.premissas_bdi, 300) ||
        "BDI padrão aplicado conforme premissas do orçamento",
    },
  };

  for (const { key } of MACRO_ETAPA_SCHEMA_KEYS) delete normalized[key];

  return normalized;
}

function validateFinalStructuredResponse(parsed: any, mode: { isPhotoMode: boolean; isHybrid: boolean }): ValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(parsed)) {
    errors.push("A resposta final não é um objeto JSON válido.");
    return { ok: false, errors };
  }

  if (mode.isPhotoMode || mode.isHybrid) {
    if (!Array.isArray(parsed.macro_etapas)) {
      errors.push("A resposta final não possui macro_etapas em formato de array.");
    }
    if (!isPlainObject(parsed.resumo_final)) {
      errors.push("A resposta final não possui resumo_final válido.");
    }
    return { ok: errors.length === 0, errors };
  }

  if (!Array.isArray(parsed.macro_etapas)) {
    errors.push("A resposta final não possui macro_etapas em formato de array.");
  } else {
    if (parsed.macro_etapas.length !== 8) {
      errors.push("A resposta final deveria conter exatamente 8 macroetapas.");
    }

    parsed.macro_etapas.forEach((etapa: any, index: number) => {
      if (!isPlainObject(etapa)) {
        errors.push(`Macroetapa ${index + 1} inválida.`);
        return;
      }

      if (typeof etapa.nome !== "string" || !etapa.nome.trim()) {
        errors.push(`Macroetapa ${index + 1} sem nome válido.`);
      }

      if (!Array.isArray(etapa.itens)) {
        errors.push(`Macroetapa ${index + 1} sem array de itens.`);
      }
    });
  }

  if (!isPlainObject(parsed.resumo_final)) {
    errors.push("A resposta final não possui resumo_final válido.");
  }

  return { ok: errors.length === 0, errors };
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
        detail: "low",
      },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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
          { role: "user", content: content },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error raw body:", errorText);

      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }

      if (response.status === 401) {
        throw new Error("Falha de autenticação com o provedor de IA.");
      }
      if (response.status === 429) {
        throw new Error("Limite de uso temporariamente atingido no provedor de IA. Tente novamente.");
      }
      if (response.status === 413) {
        throw new Error("As imagens enviadas estão grandes demais para processamento. Reduza a resolução/qualidade e tente novamente.");
      }
      if (response.status >= 500) {
        throw new Error("O provedor de IA está indisponível no momento. Tente novamente em instantes.");
      }

      throw new Error(
        `OpenAI Erro: ${response.status} - ${
          errorData?.error?.message || errorData?.raw || response.statusText
        }`
      );
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? "";
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error(
        "A análise excedeu o tempo seguro de processamento. Envie menos imagens ou imagens mais leves e tente novamente."
      );
    }
    throw error;
  }
}

const BLUEPRINT_SYSTEM_PROMPT = `Você é um Engenheiro de Custos e Orçamentista Sênior no Brasil, especialista em orçamentos analíticos utilizando a tabela SINAPI, NBR 12721 e TCPO.

==============================================
OBJETIVO PRINCIPAL
==============================================
Sua missão é analisar plantas, quadros técnicos, diagramas, fotos e documentos de engenharia e retornar um orçamento analítico estruturado, com quantitativos tecnicamente coerentes e itens desmembrados de forma compatível com bases de preço como SINAPI.

O orçamento deve priorizar itens precificáveis e conciliáveis com bases referenciais brasileiras.
Evite agrupamentos genéricos que impeçam a vinculação com preço unitário.

==============================================
ESTRATÉGIA DE LEITURA COMPLEMENTAR DE PROJETOS
==============================================
Se os arquivos recebidos forem plantas arquitetônicas, meça e infira as 8 macroetapas padrão da obra.

Se os arquivos forem de ESPECIALIDADES, como:
- Engenharia Elétrica
- Quadros de Cargas
- Diagramas Unifilares
- Hidráulica
- Diagramas Hidrossanitários
- Memorial técnico
- Planilhas auxiliares

então:
- mude o foco imediatamente;
- NÃO dependa apenas da leitura visual de símbolos;
- LEIA DIRETAMENTE tabelas, quadros, diagramas, legendas, observações e anotações técnicas;
- trate quadros e tabelas como a principal fonte de verdade para extração de circuitos, cargas, proteção, condutores e infraestrutura.

==============================================
REGRAS DE OURO PARA PRECIFICAÇÃO
==============================================
- Nunca use descrições genéricas como:
  "diversos",
  "materiais diversos",
  "disjuntores diversos",
  "cabos diversos",
  "infraestrutura elétrica",
  "pontos elétricos gerais",
  "itens gerais"
- Sempre desmembre os itens em unidades técnicas mínimas compatíveis com orçamento e SINAPI.
- Se não houver dado suficiente para especificação exata, produza uma descrição técnica estimada, mas ainda específica.
- Não deixe item com preço zerado sem justificar.
- Quando não for possível obter preço confiável, preencha:
  - "preco_unitario": 0
  - "preco_total": 0
  - "sem_preco_sinapi": true
  - "alerta_revisao": true
  - "origem_preco": "sem_preco_encontrado"
- Quando houver inferência paramétrica, preencha:
  - "criterio_extracao": "inferido_parametricamente"
- Quando o item vier de quadro, legenda ou tabela técnica, preencha:
  - "criterio_extracao": "lido_em_tabela"
- Quando o item for medido diretamente em planta, preencha:
  - "criterio_extracao": "medido_em_documento"

==============================================
DIRETRIZES ESPECÍFICAS PARA A ETAPA 6 — INSTALAÇÕES ELÉTRICAS
==============================================
Ao preencher os itens da macroetapa "6_eletrica", você deve mapear os materiais e insumos garantindo o enquadramento em uma destas 12 subcategorias de engenharia, preenchendo o campo "subcategoria_eletrica" com exatamente um dos nomes abaixo:

1. Entrada de energia e medição
2. Quadros elétricos
3. Dispositivos de proteção
4. Iluminação
5. Tomadas de uso geral — TUG
6. Tomadas de uso específico — TUE
7. Condutores e cabos
8. Infraestrutura elétrica
9. Aterramento e equipotencialização
10. Comunicação, dados e TV
11. Automação e comandos
12. Acabamentos elétricos

==============================================
REGRAS OBRIGATÓRIAS DE DETALHAMENTO PARA ELÉTRICA
==============================================
NUNCA agrupe elétrica em itens genéricos.

Você deve sempre detalhar minimamente:

1. DISJUNTORES
- Separar por tipo e amperagem quando houver evidência.
- Exemplos:
  - disjuntor monopolar 10A
  - disjuntor bipolar 32A
  - disjuntor tripolar 63A
- Nunca escrever "disjuntores diversos".

2. CONDUTORES E CABOS
- Separar por bitola:
  - 1,5 mm²
  - 2,5 mm²
  - 4 mm²
  - 6 mm²
  - 10 mm²
  - 16 mm²
  - 25 mm²
  - 35 mm²
- Sempre que possível, separar por função:
  - fase
  - neutro
  - terra
  - retorno
- Nunca escrever "cabos diversos" ou "condutores diversos".

3. TOMADAS
- Separar TUG e TUE.
- Quando possível, separar:
  - TUG 10A
  - TUG 20A
- Separar tomadas específicas para:
  - ar-condicionado
  - chuveiro
  - forno
  - micro-ondas
  - boiler
  - bomba
  - carregador veicular
- Nunca consolidar todas como "tomadas".

4. ILUMINAÇÃO
- Separar:
  - pontos de iluminação
  - luminárias
  - plafons
  - spots
  - arandelas
  - fitas LED
  - refletores
- Se só existir a quantidade de pontos, use descrição específica como "ponto de iluminação".

5. INFRAESTRUTURA
- Separar eletrodutos por tipo e diâmetro quando houver indício:
  - corrugado 20 mm
  - corrugado 25 mm
  - corrugado 32 mm
- Separar:
  - caixas 4x2
  - caixas 4x4
  - caixas octogonais
  - caixas de passagem
- Nunca usar apenas "infraestrutura elétrica".

6. QUADROS E ENTRADA
- Separar, quando houver evidência:
  - quadro de distribuição
  - barramento
  - identificação
  - disjuntor geral
  - DPS
  - DR
  - medição
  - padrão de entrada
  - ramal
  - aterramento

==============================================
ENGENHARIA REVERSA DE QUADROS DE CARGA
==============================================
Se houver quadro de cargas, diagrama unifilar ou legenda elétrica:
- use essas informações como base principal;
- a partir da lista de circuitos, derive os insumos de:
  - disjuntores
  - cabos por bitola
  - quadros
  - proteção DR/DPS
  - infraestrutura associada
- se houver área total construída, use esse valor para complementar proporcionalmente os quantitativos paramétricos não explícitos.

==============================================
FORMATO TÉCNICO OBRIGATÓRIO PARA ITENS ELÉTRICOS
==============================================
Sempre que possível, descreva os itens elétricos no seguinte padrão:

- Disjuntor + tipo + amperagem
- Cabo + material + bitola + função
- Eletroduto + tipo + diâmetro
- Tomada + amperagem + tipo de uso
- Quadro + identificação + capacidade
- Luminária/ponto + tipo

Exemplos de boas descrições:
- "Disjuntor termomagnético monopolar 10A"
- "Disjuntor bipolar 32A"
- "Cabo de cobre flexível 2,5 mm² para tomadas TUG"
- "Cabo de cobre flexível 6 mm² para chuveiro elétrico"
- "Eletroduto corrugado 25 mm"
- "Caixa 4x2 em PVC"
- "Tomada 2P+T 10A"
- "Tomada 2P+T 20A para uso específico"
- "Quadro de distribuição embutir 24 disjuntores"

Exemplos proibidos:
- "Disjuntores diversos"
- "Cabos diversos"
- "Infraestrutura elétrica"
- "Tomadas em geral"
- "Materiais elétricos"

==============================================
MEMÓRIA DE CÁLCULO E RASTREABILIDADE
==============================================
Sempre que possível, inclua:
- "memoria_calculo": explicação curta de como a quantidade foi obtida
- "criterio_extracao": "medido_em_documento", "lido_em_tabela" ou "inferido_parametricamente"

Exemplos:
- "memoria_calculo": "12 circuitos identificados no quadro elétrico"
- "memoria_calculo": "estimado por 1 tomada a cada 6 m² de área molhada"
- "memoria_calculo": "bitola inferida com base em circuito de chuveiro 5500W"

==============================================
TRAVAS DE ENGENHARIA (GUARDRAILS) — INEGOCIÁVEIS
==============================================
1. PROIBIÇÃO DE MAQUINÁRIO SOLTO
Use exclusivamente serviços compostos da SINAPI quando aplicável.

2. CONSOLIDAÇÃO OBRIGATÓRIA
Consolidar apenas itens tecnicamente equivalentes.
Exemplos:
- somar todos os cabos 2,5 mm² em uma linha única
- somar todos os eletrodutos corrugados 20 mm em uma linha única
Mas nunca agrupar:
- bitolas diferentes
- tipos diferentes
- funções diferentes

3. SANITY CHECK
O custo por metro quadrado e os quantitativos devem permanecer dentro de faixas plausíveis para obras residenciais no Brasil.

4. REGRAS DE QUANTIDADE
Garanta coerência de unidade:
- aço em kg
- concreto em m³
- cabos em m
- eletrodutos em m
- caixas, tomadas, luminárias e disjuntores em un

5. NÃO INVENTAR MARCAS
Não invente marcas comerciais sem evidência documental. Se não houver marca, use "—".

6. NÃO DUPLICAR INSUMOS
Não repetir o mesmo insumo em duas linhas com a mesma especificação dentro da mesma macroetapa.

7. PRIORIZAR PRECIFICABILIDADE
Se houver dúvida entre uma descrição bonita e uma descrição orçamentável, escolha a descrição orçamentável.
`;

const PHOTO_SYSTEM_PROMPT = `Você é um Engenheiro Civil e Orçamentista especializado em análise de ambientes reais a partir de fotos e orçamentos de reformas no padrão brasileiro.`;

const HYBRID_SYSTEM_PROMPT = `Você é um Engenheiro Civil Sênior especializado em ORÇAMENTAÇÃO RESIDENCIAL no Brasil.
Sua missão é identificar itens construtivos visíveis, separar o que foi medido visualmente do que foi inferido por parâmetro e retornar um quantitativo físico preliminar sem inventar preços.`;

const JSON_STRUCTURE = `
Retorne APENAS um JSON válido (sem markdown) com esta estrutura:
{
  "tipo_analise": "levantamento_fotografico" ou "quantitativo_preliminar",
  "resumo": "Descrição da análise",
  "area_total_m2": 0,
  "escala_detectada": "1:50",
  "referencia_sinapi": "SINAPI - SP",
  "macro_etapas": [],
  "quantitativo_por_comodo": [],
  "resumo_final": {
    "total_materiais": 0,
    "total_mao_de_obra": 0,
    "total_geral": 0,
    "bdi_percentual": 25,
    "bdi_valor": 0,
    "premissas_bdi": "BDI aplicado"
  },
  "warnings": [],
  "confiabilidade": {
    "nivel_geral": "alto, medio ou baixo",
    "observacoes": []
  },
  "recomendacoes": []
}
${STRICT_JSON_RULES}`;

const STRUCTURED_BLUEPRINT_JSON_STRUCTURE = `
Retorne APENAS um JSON válido (sem markdown).

A resposta DEVE usar as 8 chaves obrigatórias de macroetapas no nível raiz:
"1_servicos_preliminares",
"2_infraestrutura",
"3_superestrutura",
"4_cobertura",
"5_esquadrias",
"6_eletrica",
"7_hidraulica",
"8_acabamentos".

Cada chave deve conter um OBJETO com:
- "itens"
- "duracao_dias_estimada"

Cada item dentro de "itens" deve conter, sempre que possível:
- "item"
- "descricao"
- "local_aplicacao"
- "fornecedor"
- "marca"
- "marca_sugerida"
- "quantidade"
- "unidade"
- "preco_unitario"
- "preco_total"
- "codigo_sinapi"
- "origem_preco"
- "perda_aplicada"
- "criterio_extracao"
- "memoria_calculo"
- "alerta_revisao"
- "sem_preco_sinapi"

Regras obrigatórias:
- "descricao" deve ser técnica e precificável.
- Nunca usar a palavra "diversos" na descrição.
- "preco_unitario" e "preco_total" não devem ficar zerados sem justificativa.
- Se não houver preço confiável, preencher:
  - "preco_unitario": 0
  - "preco_total": 0
  - "sem_preco_sinapi": true
  - "alerta_revisao": true
  - "origem_preco": "sem_preco_encontrado"

Dentro do array "itens" de "6_eletrica", inclua o campo "subcategoria_eletrica" com exatamente um dos 12 nomes permitidos:
1. Entrada de energia e medição
2. Quadros elétricos
3. Dispositivos de proteção
4. Iluminação
5. Tomadas de uso geral — TUG
6. Tomadas de uso específico — TUE
7. Condutores e cabos
8. Infraestrutura elétrica
9. Aterramento e equipotencialização
10. Comunicação, dados e TV
11. Automação e comandos
12. Acabamentos elétricos

Inclua também no nível raiz:
- "resumo"
- "area_total_m2"
- "referencia_sinapi"
- "warnings"
- "confiabilidade"
- "resumo_final"
- "recomendacoes"

Em "confiabilidade", use:
{
  "nivel_geral": "alto" | "medio" | "baixo",
  "observacoes": []
}

Em "resumo_final", use:
{
  "total_materiais": 0,
  "total_mao_de_obra": 0,
  "total_geral": 0,
  "bdi_percentual": 25,
  "bdi_valor": 0,
  "premissas_bdi": "texto"
}

${STRICT_JSON_RULES}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      images,
      escala,
      tipo_construcao,
      regiao,
      bdi_percentual,
      instrucoes_adicionais,
      modo_analise,
      area_m2,
      pe_direito,
      num_pavimentos,
      padrao_acabamento,
      tipo_fundacao,
      tipo_cobertura,
      num_quartos,
      num_banheiros,
      num_vagas,
      modo_precisao,
      tipo_documento,
    } = body ?? {};

    const mode = classifyAnalysisMode(modo_analise, modo_precisao);
    const { isPhotoMode, isHybrid, modeLabel } = mode;

    const maxImages = isHybrid ? MAX_IMAGES_HYBRID : MAX_IMAGES_STANDARD;
    const imageValidation = validateImages(images, maxImages);

    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "At least one image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hardErrors = imageValidation.errors.filter((e) => !e.includes("apenas"));
    if (hardErrors.length > 0) {
      return new Response(JSON.stringify({ error: hardErrors.join(" ") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysisImages: IncomingImage[] = images
      .slice(0, maxImages)
      .map((img: any) => ({
        mime_type: normalizeMimeType(img?.mime_type),
        base64: String(img?.base64 || ""),
      }));

    const totalBase64Length = analysisImages.reduce((sum, img) => sum + img.base64.length, 0);
    console.log("analyze-blueprint payload stats:", {
      imagens_recebidas: Array.isArray(images) ? images.length : 0,
      imagens_processadas: analysisImages.length,
      totalBase64Length,
      modo: modeLabel,
    });

    const safeEscala = sanitizeString(escala, 50);
    const safeTipoConstrucao = sanitizeString(tipo_construcao, 120);
    const safeRegiao = sanitizeString(regiao, 120);
    const safeInstrucoes = sanitizeString(instrucoes_adicionais, 2000);
    const safePadraoAcabamento = sanitizeString(padrao_acabamento, 120);
    const safeTipoFundacao = sanitizeString(tipo_fundacao, 120);
    const safeTipoCobertura = sanitizeString(tipo_cobertura, 120);
    const safeTipoDocumento = sanitizeString(tipo_documento, 80);

    const safeBdi = toFiniteNumber(bdi_percentual);
    const safeArea = toFiniteNumber(area_m2);
    const safePeDireito = toFiniteNumber(pe_direito);
    const safeNumPavimentos = toFiniteNumber(num_pavimentos);
    const safeNumQuartos = toFiniteNumber(num_quartos);
    const safeNumBanheiros = toFiniteNumber(num_banheiros);
    const safeNumVagas = toFiniteNumber(num_vagas);

    const systemPrompt = isHybrid
      ? HYBRID_SYSTEM_PROMPT + JSON_STRUCTURE
      : isPhotoMode
      ? PHOTO_SYSTEM_PROMPT + JSON_STRUCTURE
      : BLUEPRINT_SYSTEM_PROMPT + STRUCTURED_BLUEPRINT_JSON_STRUCTURE;

    let userPrompt = isHybrid
      ? "Identifique e meça os itens construtivos visíveis. Separe o que foi observado visualmente do que foi inferido por parâmetro. Não invente preços."
      : isPhotoMode
      ? "Analise esta(s) foto(s) do ambiente real e retorne o orçamento de reforma completo no formato JSON solicitado."
      : "Analise esta(s) planta(s), quadros técnicos ou documentos de engenharia e retorne o orçamento analítico completo estruturado no formato JSON solicitado.";

    if (!isPhotoMode && safeEscala && safeEscala !== "auto") {
      userPrompt += ` A escala informada é ${safeEscala}.`;
    }

    if (safeTipoDocumento && safeTipoDocumento !== "auto") {
      userPrompt += ` Tipo de documento principal: ${safeTipoDocumento}.`;
    }

    if (safeTipoConstrucao) userPrompt += ` Tipo de construção: ${safeTipoConstrucao}.`;
    if (safeRegiao) userPrompt += ` Região do projeto: ${safeRegiao}.`;

    if (safeBdi !== null && safeBdi > 0 && safeBdi !== 25) {
      userPrompt += ` Use BDI de ${safeBdi}%.`;
    }

    if (safeArea !== null && safeArea > 0) {
      userPrompt += ` IMPORTANTE: A área total construída é ${safeArea} m². Use este valor para calcular proporcionalmente as metragens paramétricas de infraestrutura e condutores.`;
    }

    if (safePeDireito !== null && safePeDireito > 0) {
      userPrompt += ` Pé-direito: ${safePeDireito}m.`;
    }

    if (safeNumPavimentos !== null && safeNumPavimentos > 0) {
      userPrompt += ` Pavimentos: ${safeNumPavimentos}.`;
    }

    if (safePadraoAcabamento) {
      userPrompt += ` Padrão de acabamento solicitado: ${safePadraoAcabamento}.`;
    }

    if (safeNumQuartos !== null && safeNumQuartos >= 0) {
      userPrompt += ` Quartos: ${safeNumQuartos}.`;
    }

    if (safeNumBanheiros !== null && safeNumBanheiros >= 0) {
      userPrompt += ` Banheiros: ${safeNumBanheiros}.`;
    }

    if (safeNumVagas !== null && safeNumVagas >= 0) {
      userPrompt += ` Vagas de garagem: ${safeNumVagas}.`;
    }

    if (safeTipoFundacao && safeTipoFundacao !== "nao_sei") {
      userPrompt += ` Tipo de fundação definida: ${safeTipoFundacao}.`;
    }

    if (safeTipoCobertura && safeTipoCobertura !== "nao_sei") {
      userPrompt += ` Tipo de cobertura/telhado: ${safeTipoCobertura}.`;
    }

    if (safeInstrucoes) {
      userPrompt += `\n\nInstruções adicionais importantes: ${safeInstrucoes}`;
    }

    let content = "";
    try {
      content = await generateWithOpenAI({
        systemPrompt,
        userText: userPrompt,
        images: analysisImages,
      });
    } catch (err: any) {
      console.error("OpenAI error:", err?.message || err);
      throw err;
    }

    if (!content) throw new Error("Sem resposta da IA");

    const rawText = content;
    const cleanText = stripMarkdownAndExtractJson(rawText);

    let parsed: any;
    let repaired = false;
    let repairedText = "";

    try {
      try {
        parsed = JSON.parse(cleanText);
      } catch (initialParseErr) {
        console.warn("JSON.parse inicial falhou; reparando estrutura:", initialParseErr);
        repairedText = repairAiJson(cleanText);
        parsed = JSON.parse(repairedText);
        repaired = true;
        console.log("JSON REPAIR aplicado com sucesso.");
      }

      parsed = normalizeStructuredBlueprintResponse(parsed, {
        area_m2: safeArea,
        bdi_percentual: safeBdi,
      });

      const finalValidation = validateFinalStructuredResponse(parsed, mode);
      if (!finalValidation.ok) {
        throw new Error(
          `A resposta estruturada da IA ficou incompleta após normalização: ${finalValidation.errors.join(
            " "
          )}`
        );
      }
    } catch (parseErr: any) {
      console.error("Raw AI Response que falhou no parse:", rawText);
      throw new Error(
        `Falha ao converter resposta da IA em JSON. Erro: ${
          parseErr?.message || parseErr
        }`
      );
    }

    const responseWarnings = [
      ...(Array.isArray(parsed?.warnings)
        ? parsed.warnings.filter((w: unknown) => typeof w === "string")
        : []),
      ...imageValidation.errors.filter((e) => e.includes("apenas")),
    ];

    const responsePayload = {
      ...parsed,
      meta_processamento: {
        modo_analise: modeLabel,
        imagens_recebidas: Array.isArray(images) ? images.length : 0,
        imagens_processadas: analysisImages.length,
        reparo_json_aplicado: repaired,
        prompt_documento_tipo: safeTipoDocumento || "auto",
      },
      warnings: responseWarnings,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-blueprint error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});