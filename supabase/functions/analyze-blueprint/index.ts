import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { jsonrepair } from "npm:jsonrepair@^3.13.0";
import { getAuthenticatedContext, toErrorResponse } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_TIMEOUT_MS = 90000;
const MAX_IMAGES_STANDARD = 5;
const MAX_IMAGES_HYBRID = 5;
const MAX_IMAGE_BASE64_LENGTH = 9_500_000;  // ~1.1MB por imagem
const MAX_TOTAL_BASE64_LENGTH = 9_000_000;

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
  const rawBase64 = img.base64 ?? "";

  // Bloco 1: rejeita PDF cru enviado pelo frontend por engano
  if (
    rawBase64.startsWith("data:application/pdf") ||
    rawBase64.startsWith("JVBERi") // magic bytes do PDF em base64
  ) {
    throw new Error(
      "O frontend enviou um PDF em base64 em vez da imagem renderizada pelo canvas. " +
      "Verifique a conversão no pdf.js antes de enviar."
    );
  }

  // Bloco 2: remove prefixo data:... se vier embutido no base64 (evita double-prefix)
  const cleanBase64 = rawBase64.startsWith("data:")
    ? rawBase64.replace(/^data:[^;]+;base64,/, "")
    : rawBase64;

  // Bloco 3: valida que o resultado ainda tem conteúdo após limpeza
  if (!cleanBase64 || cleanBase64.length < 100) {
    throw new Error(
      "Uma imagem chegou com base64 vazio ou inválido após sanitização. " +
      "Verifique o pipeline de conversão no frontend."
    );
  }

  const safeMime = normalizeMimeType(img.mime_type); // função já existe no código

  content.push({
    type: "image_url",
    image_url: {
      url: `data:${safeMime};base64,${cleanBase64}`, // prefixo montado aqui, uma única vez
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
        model: "gpt-4o-mini",
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
    
    const rawBody = await response.text();

    if (!response.ok) {
      let errorData: any = {};
      try { errorData = JSON.parse(rawBody); } catch { errorData = { raw: rawBody }; }

      if (response.status === 401) throw new Error("Falha de autenticação com o provedor de IA.");
      if (response.status === 429) throw new Error("Limite de uso temporariamente atingido no provedor de IA. Tente novamente.");
      if (response.status === 413) throw new Error("As imagens enviadas estão grandes demais para processamento.");
      if (response.status >= 500) throw new Error("O provedor de IA está indisponível no momento.");

      throw new Error(errorData?.error?.message || `Falha do provedor de IA (${response.status}).`);
    }

    const data = JSON.parse(rawBody);
    const contentText = data?.choices?.[0]?.message?.content;

    return contentText ?? "";
    
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.error("OpenAI timeout during analyze-blueprint");
      throw new Error("A análise excedeu o tempo seguro de processamento. A planta pode ser muito complexa.");
    }
    throw error;
  }
}

const BLUEPRINT_SYSTEM_PROMPT = `Você é um Engenheiro Civil e Orçamentista Sênior no Brasil.

==============================================
OBJETIVO PRINCIPAL: ORÇAMENTO EXAUSTIVO
==============================================
Sua missão é gerar um orçamento paramétrico COMPLETO. É ESTRITAMENTE PROIBIDO gerar orçamentos superficiais. Uma obra real não é feita com 10 itens. Você deve desmembrar os serviços até o nível do insumo (material e mão de obra).

REGRA DE OURO PARA PREÇOS:
Você NÃO deve calcular valores em reais. Deixe que o sistema faça o cruzamento com o SINAPI. Para TODOS os itens gerados, defina obrigatoriamente:
- "preco_unitario": 0
- "preco_total": 0
- "sem_preco_sinapi": true
- "estimado_ia": false
- "origem_preco": "aguardando_sinapi"

==============================================
CHECKLIST OBRIGATÓRIO POR ETAPA (ANTI-PREGUIÇA)
==============================================
Para a área total (m²) fornecida ou extraída da planta, você DEVE calcular proporcionalmente e incluir TODOS os itens aplicáveis da lista abaixo. Não omita a mão de obra.

1. Serviços Preliminares:
   - Materiais: Tapume de tapume/madeira, Placa de obra, Ligação provisória de água/luz.
   - Mão de obra: Servente (h).

2. Infraestrutura / Fundação:
   - Materiais: Escavação (m³), Lastro de concreto, Concreto usinado (m³), Aço CA-50 (kg), Aço CA-60 (kg), Arame recozido, Forma de tábua/madeira, Lona plástica, Impermeabilizante asfáltico.
   - Mão de obra: Pedreiro (h), Armador (h), Carpinteiro (h), Servente (h).

3. Superestrutura e Alvenaria:
   - Materiais: Bloco cerâmico ou de concreto (un), Cimento Portland (sc), Areia (m³), Cal hidratada (sc), Concreto para vergas/contravergas, Aço para vergas.
   - Mão de obra: Pedreiro (h), Servente (h).

4. Cobertura:
   - Materiais: Madeira para estrutura (caibros, ripas, terças) OU Estrutura metálica, Telha (cerâmica, fibrocimento ou metálica), Cumeeira, Calha em chapa galvanizada, Rufo, Pregos/Parafusos.
   - Mão de obra: Telhadista (h), Carpinteiro (h), Servente (h).

5. Esquadrias:
   - Materiais: Portas de madeira (internas), Portas de alumínio/vidro (externas), Janelas, Fechaduras, Dobradiças, Vidros, Espuma expansiva.
   - Mão de obra: Montador (h), Carpinteiro (h).

6. Instalações Elétricas:
   - Materiais: Eletroduto corrugado (m), Cabo flexível 1.5mm, 2.5mm, 4mm, 6mm (m), Disjuntores DIN (un), Quadro de distribuição, Caixas 4x2 e 4x4, Tomadas 10A e 20A, Interruptores, Fita isolante.
   - Mão de obra: Eletricista (h), Ajudante de eletricista (h).

7. Instalações Hidrossanitárias:
   - Materiais: Tubos PVC água fria (m), Tubos PVC esgoto (m), Conexões (joelhos, tês), Registros de gaveta/pressão, Adesivo plástico (cola), Fita veda rosca, Caixa d'água, Caixa sifonada, Caixa de gordura.
   - Mão de obra: Encanador (h), Ajudante de encanador (h).

8. Acabamentos:
   - Materiais de Base: Chapisco (cimento/areia), Emboço/Massa única, Massa corrida ou acrílica.
   - Revestimentos: Piso (Porcelanato/Cerâmica), Revestimento de parede (m²), Argamassa colante (ACII/ACIII), Rejunte, Rodapé.
   - Pintura: Tinta látex/acrílica, Fundo preparador/Selador, Lixa, Rolo/Pincel.
   - Louças/Metais: Bacia sanitária, Lavatório, Torneiras, Chuveiro, Sifão, Engate flexível.
   - Mão de obra: Pedreiro (h), Pintor (h), Azulejista (h), Servente (h).

NOMENCLATURA: Use os nomes técnicos exatos e separe Material de Mão de Obra em itens diferentes.
`;

const STRUCTURED_BLUEPRINT_JSON_STRUCTURE = `
Retorne APENAS um JSON válido (sem markdown ou textos adicionais).

O JSON DEVE obrigatoriamente conter estas 8 chaves exatas no nível raiz:
"1_servicos_preliminares",
"2_infraestrutura",
"3_superestrutura",
"4_cobertura",
"5_esquadrias",
"6_eletrica",
"7_hidraulica",
"8_acabamentos".

Cada chave de macroetapa deve ser um objeto contendo:
- "itens": array de objetos (deixe vazio [] se não houver materiais para esta etapa)
- "duracao_dias_estimada": número

Dentro do array "itens", cada objeto DEVE ter:
- "item": string (ex: "1.1")
- "descricao": string (Nome técnico do material/serviço)
- "local_aplicacao": string
- "fornecedor": "—"
- "marca": "—"
- "quantidade": número (quantidade extraída ou inferida baseada na área)
- "unidade": string (un, m, m², m³, kg, sc, h)
- "preco_unitario": 0
- "preco_total": 0
- "codigo_sinapi": ""
- "origem_preco": "aguardando_sinapi"
- "sem_preco_sinapi": true
- "estimado_ia": false
- "criterio_extracao": "medido_em_documento" ou "inferido_parametricamente"
- "memoria_calculo": string (explicando como chegou à quantidade, ex: "Estimado 1,5 saco de cimento por m2")

No nível raiz do JSON, inclua também OBRIGATORIAMENTE:
- "resumo": "Visão geral da extração."
- "area_total_m2": número
- "referencia_sinapi": "SINAPI - SP"
- "warnings": []
- "confiabilidade": { "nivel_geral": "alto", "observacoes": [] }
- "resumo_final": { "total_materiais": 0, "total_mao_de_obra": 0, "total_geral": 0, "bdi_percentual": 25, "bdi_valor": 0 }
- "recomendacoes": []

${STRICT_JSON_RULES}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await getAuthenticatedContext(req);
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

    const systemPrompt = BLUEPRINT_SYSTEM_PROMPT + STRUCTURED_BLUEPRINT_JSON_STRUCTURE;

    let userPrompt = isPhotoMode
      ? "Analise esta(s) foto(s) do ambiente real e retorne o orçamento de reforma completo no formato JSON solicitado."
      : "Analise esta(s) planta(s), quadros técnicos ou documentos de engenharia e retorne o orçamento analítico completo estruturado no formato JSON solicitado.";

    if (!isPhotoMode && safeEscala && safeEscala !== "auto") userPrompt += ` A escala informada é ${safeEscala}.`;
    if (safeTipoDocumento && safeTipoDocumento !== "auto") userPrompt += ` Tipo de documento principal: ${safeTipoDocumento}.`;
    if (safeTipoConstrucao) userPrompt += ` Tipo de construção: ${safeTipoConstrucao}.`;
    if (safeRegiao) userPrompt += ` Região do projeto: ${safeRegiao}.`;
    if (safeBdi !== null && safeBdi > 0 && safeBdi !== 25) userPrompt += ` Use BDI de ${safeBdi}%.`;
    if (safeArea !== null && safeArea > 0) userPrompt += ` IMPORTANTE: A área total construída é ${safeArea} m².`;
    if (safePeDireito !== null && safePeDireito > 0) userPrompt += ` Pé-direito: ${safePeDireito}m.`;
    if (safeNumPavimentos !== null && safeNumPavimentos > 0) userPrompt += ` Pavimentos: ${safeNumPavimentos}.`;
    if (safePadraoAcabamento) userPrompt += ` Padrão de acabamento solicitado: ${safePadraoAcabamento}.`;
    if (safeNumQuartos !== null && safeNumQuartos >= 0) userPrompt += ` Quartos: ${safeNumQuartos}.`;
    if (safeNumBanheiros !== null && safeNumBanheiros >= 0) userPrompt += ` Banheiros: ${safeNumBanheiros}.`;
    if (safeNumVagas !== null && safeNumVagas >= 0) userPrompt += ` Vagas de garagem: ${safeNumVagas}.`;
    if (safeTipoFundacao && safeTipoFundacao !== "nao_sei") userPrompt += ` Tipo de fundação definida: ${safeTipoFundacao}.`;
    if (safeTipoCobertura && safeTipoCobertura !== "nao_sei") userPrompt += ` Tipo de cobertura/telhado: ${safeTipoCobertura}.`;
    if (safeInstrucoes) userPrompt += `\n\nInstruções adicionais importantes: ${safeInstrucoes}`;

    let content = "";
    try {
      content = await generateWithOpenAI({
        systemPrompt,
        userText: userPrompt,
        images: analysisImages,
      });
    } catch (err: any) {
      console.error("OpenAI error during analyze-blueprint:", err?.message || err);
      throw err;
    }

    if (!content) throw new Error("Sem resposta da IA");

    const rawText = content;
    const cleanText = stripMarkdownAndExtractJson(rawText);

    let parsed: any;
    let repaired = false;

    try {
      try {
        parsed = JSON.parse(cleanText);
      } catch (initialParseErr) {
        const repairedText = repairAiJson(cleanText);
        parsed = JSON.parse(repairedText);
        repaired = true;
      }

      parsed = normalizeStructuredBlueprintResponse(parsed, {
        area_m2: safeArea,
        bdi_percentual: safeBdi,
      });

      const finalValidation = validateFinalStructuredResponse(parsed, mode);
      if (!finalValidation.ok) {
        throw new Error(`A resposta da IA ficou incompleta: ${finalValidation.errors.join(" ")}`);
      }
    } catch (parseErr: any) {
      console.error("Falha ao parsear resposta da IA em analyze-blueprint:", {
        length: rawText?.length ?? 0,
        message: parseErr?.message || String(parseErr),
      });
      throw new Error(`Falha ao converter resposta da IA em JSON. Erro: ${parseErr?.message || parseErr}`);
    }

    // ========================================
    // NOVA SEÇÃO: CHAMAR match-sinapi
    // ========================================
    let matchSinapiResult: any = null;
    try {
      const itemsToMatch = [];
      
      // Extrair todos os itens de todas as macroetapas
      for (const etapa of parsed.macro_etapas || []) {
        for (const item of etapa.itens || []) {
          itemsToMatch.push({
            item: item.item,
            descricao: item.descricao,
          });
        }
      }

      // Chamar match-sinapi apenas se houver itens
      if (itemsToMatch.length > 0) {
        const matchResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/match-sinapi`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: ctx.authHeader,
            },
            body: JSON.stringify({ items: itemsToMatch }),
          }
        );

        if (matchResponse.ok) {
          matchSinapiResult = await matchResponse.json();
        } else {
          const errorText = await matchResponse.text();
          console.error("match-sinapi erro:", matchResponse.status, errorText);
          matchSinapiResult = { error: errorText, status: matchResponse.status };
        }
      }
    } catch (matchErr: any) {
      console.error("Erro ao chamar match-sinapi:", matchErr.message);
      matchSinapiResult = { error: matchErr.message };
    }
    // ========================================

    const responseWarnings = [
      ...(Array.isArray(parsed?.warnings) ? parsed.warnings.filter((w: unknown) => typeof w === "string") : []),
      ...imageValidation.errors.filter((e) => e.includes("apenas")),
    ];

    const responsePayload = {
      ...parsed,
      match_sinapi_resultado: matchSinapiResult,
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
    return toErrorResponse(error, "Não foi possível processar a análise agora.");
  }
});
