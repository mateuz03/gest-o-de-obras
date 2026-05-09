import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI, SchemaType } from "npm:@google/generative-ai@^0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CAPITULOS = [
  { key: "objetivo", titulo: "1. Objetivo" },
  { key: "dados_projeto", titulo: "2. Dados do Projeto" },
  { key: "fundacoes", titulo: "3. Fundações" },
  { key: "estrutura", titulo: "4. Estrutura" },
  { key: "alvenaria", titulo: "5. Alvenaria e Vedações" },
  { key: "cobertura", titulo: "6. Cobertura" },
  { key: "instalacoes_hidraulicas", titulo: "7. Instalações Hidrossanitárias" },
  { key: "instalacoes_eletricas", titulo: "8. Instalações Elétricas" },
  { key: "revestimentos", titulo: "9. Revestimentos e Acabamentos" },
  { key: "pintura", titulo: "10. Pintura" },
  { key: "esquadrias", titulo: "11. Esquadrias" },
  { key: "consideracoes_finais", titulo: "12. Considerações Finais" },
] as const;

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: Object.fromEntries(
    CAPITULOS.map((c) => [c.key, { type: SchemaType.STRING }]),
  ),
  required: CAPITULOS.map((c) => c.key),
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { materiais, resumo_obra, nome_projeto, area_m2, tipo_construcao } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `Você é um Engenheiro Civil Sênior brasileiro especialista em documentação técnica de obras (NBR 15575, NBR 6118, NBR 5410, NBR 5626).

Sua missão é redigir um Memorial Descritivo TÉCNICO, FORMAL e COMPLETO, dividido em capítulos.

Regras:
- Tom profissional, impessoal, em português brasileiro.
- Cite normas ABNT relevantes em cada capítulo quando aplicável.
- Descreva materiais, marcas sugeridas, quantitativos, critérios de execução e padrões de qualidade.
- Cada capítulo deve ter pelo menos 2 parágrafos densos.
- NÃO use markdown (##, **). Texto corrido limpo.
- NUNCA use aspas duplas dentro do conteúdo dos campos string. Para polegadas use 'pol' ou aspas simples (').`;

    const userPrompt = `Redija o Memorial Descritivo do projeto abaixo.

PROJETO: ${nome_projeto}
TIPO: ${tipo_construcao || "Residencial"}
ÁREA: ${area_m2} m²

RESUMO DA OBRA:
${resumo_obra}

LISTA DE MATERIAIS E QUANTITATIVOS:
${materiais}

Retorne um JSON com EXATAMENTE estas chaves (uma para cada capítulo): ${CAPITULOS.map((c) => c.key).join(", ")}.
Cada valor é uma string contendo o texto completo daquele capítulo.`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    });

    const raw = result.response.text();
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Falha ao parsear memorial JSON. Raw:", raw);
      throw new Error("Resposta da IA não é um JSON válido.");
    }

    const memorial = CAPITULOS
      .map((c) => `${c.titulo}\n\n${(parsed[c.key] || "").trim()}`)
      .join("\n\n");

    return new Response(JSON.stringify({ memorial, capitulos: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-memorial error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = /quota|rate/i.test(msg) ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
