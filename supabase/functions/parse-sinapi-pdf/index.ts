// Edge Function: parse-sinapi-pdf
// Estratégia híbrida: extrai texto do PDF e usa Gemini para estruturar
// linhas (codigo, descricao, unidade, preco_material, preco_mao_de_obra).

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ParsedRow {
  codigo: string;
  descricao: string;
  unidade: string;
  preco_material: number | null;
  preco_mao_de_obra: number | null;
}

const SYSTEM_PROMPT = `Você é um extrator especializado em tabelas SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil).
Recebe trechos de texto extraídos de PDFs oficiais do SINAPI (insumos OU composições) e deve retornar JSON estruturado.

Regras:
- Cada item tem: codigo (numérico/alfanumérico), descricao (texto longo, pode ter múltiplas linhas), unidade (M3, KG, UN, M2, H, etc), e um ou dois preços.
- Para INSUMOS: geralmente há 1 preço (preco_material).
- Para COMPOSIÇÕES: pode haver preço de material e mão de obra separados, ou apenas o total (use preco_material como total).
- Preços brasileiros usam vírgula como decimal: "12,50" => 12.50. Pontos podem ser separadores de milhar: "1.234,56" => 1234.56.
- IGNORE cabeçalhos, rodapés, números de página, totais e linhas em branco.
- Se um campo não estiver claro, omita o item inteiro (precisão > quantidade).
- Descrições podem quebrar em várias linhas — junte-as em uma única string limpa.

Retorne APENAS JSON no formato: { "items": [ { "codigo": "...", "descricao": "...", "unidade": "...", "preco_material": 12.50, "preco_mao_de_obra": null } ] }`;

async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string[]> {
  // Use unpdf (works in Deno) to extract text per page
  const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.12.1");
  const pdf = await getDocumentProxy(pdfBytes);
  const result = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(result.text) ? result.text : [String(result.text)];
  return pages.map((p) => String(p || ""));
}

async function callAI(chunkText: string, tipo: string): Promise<ParsedRow[]> {
  const userMsg = `Tipo do documento: ${tipo === "composicao" ? "COMPOSIÇÕES" : "INSUMOS"}.

Trecho do PDF SINAPI:
"""
${chunkText}
"""

Extraia TODOS os itens válidos deste trecho.`;

  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("AI error", resp.status, txt);
    if (resp.status === 429) throw new Error("Limite de requisições atingido. Tente em alguns instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`Falha na IA: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function chunkPages(pages: string[], maxCharsPerChunk = 12000): string[] {
  const chunks: string[] = [];
  let buf = "";
  for (const p of pages) {
    const txt = (p || "").trim();
    if (!txt) continue;
    if ((buf + "\n\n" + txt).length > maxCharsPerChunk && buf) {
      chunks.push(buf);
      buf = txt;
    } else {
      buf = buf ? buf + "\n\n" + txt : txt;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const tipo = String(form.get("tipo") || "insumo");
    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo PDF obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    console.log(`PDF recebido: ${file.name}, ${bytes.length} bytes, tipo=${tipo}`);

    const pages = await extractTextFromPdf(bytes);
    console.log(`Páginas extraídas: ${pages.length}`);

    const chunks = chunkPages(pages);
    console.log(`Chunks para IA: ${chunks.length}`);

    const allItems: ParsedRow[] = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const items = await callAI(chunks[i], tipo);
        allItems.push(...items);
        console.log(`Chunk ${i + 1}/${chunks.length}: +${items.length} itens (total: ${allItems.length})`);
      } catch (err) {
        console.error(`Erro chunk ${i}:`, err);
        // continua os próximos chunks mesmo se um falhar
      }
    }

    // dedup por codigo (mantém o primeiro)
    const seen = new Set<string>();
    const uniques = allItems.filter((it) => {
      if (!it.codigo) return false;
      const k = String(it.codigo).trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return new Response(
      JSON.stringify({ items: uniques, paginas: pages.length, chunks: chunks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("parse-sinapi-pdf error:", err);
    return new Response(JSON.stringify({ error: err.message || "Falha ao processar PDF" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
