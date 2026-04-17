// Edge Function: parse-sinapi-pdf
// Job-based: cria um job, processa em background (EdgeRuntime.waitUntil)
// e retorna imediatamente. O frontend consulta sinapi_parse_jobs por polling.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ParsedRow {
  codigo: string;
  descricao: string;
  unidade: string;
  preco_material: number | null;
  preco_mao_de_obra: number | null;
}

const SYSTEM_PROMPT = `Você é um extrator especializado em tabelas SINAPI.
Receba trechos de texto de PDFs oficiais (insumos OU composições) e retorne JSON.

Regras:
- Cada item: codigo, descricao, unidade (M3, KG, UN, M2, H...), e 1-2 preços.
- INSUMOS: 1 preço (preco_material). COMPOSIÇÕES: pode ter material + mão de obra, ou só total (use preco_material).
- Vírgula = decimal: "12,50" => 12.50. Ponto pode ser milhar: "1.234,56" => 1234.56.
- IGNORE cabeçalhos, rodapés, números de página, totais.
- Se um campo não estiver claro, omita o item (precisão > quantidade).
- Junte descrições quebradas em múltiplas linhas.

Retorne APENAS JSON: { "items": [ { "codigo": "...", "descricao": "...", "unidade": "...", "preco_material": 12.50, "preco_mao_de_obra": null } ] }`;

async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string[]> {
  const { extractText, getDocumentProxy } = await import(
    "https://esm.sh/unpdf@0.12.1"
  );
  const pdf = await getDocumentProxy(pdfBytes);
  const result = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(result.text)
    ? result.text
    : [String(result.text)];
  return pages.map((p) => String(p || ""));
}

async function callAI(chunkText: string, tipo: string): Promise<ParsedRow[]> {
  const userMsg = `Tipo: ${tipo === "composicao" ? "COMPOSIÇÕES" : "INSUMOS"}.\n\nTrecho:\n"""\n${chunkText}\n"""\n\nExtraia TODOS os itens válidos.`;
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
    if (resp.status === 429)
      throw new Error("Limite de requisições da IA atingido.");
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

function chunkPages(pages: string[], maxCharsPerChunk = 8000): string[] {
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

async function processJob(
  jobId: string,
  pdfBytes: Uint8Array,
  tipo: string,
) {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    await supabase
      .from("sinapi_parse_jobs")
      .update({ status: "processing", progress: 5, updated_at: new Date().toISOString() })
      .eq("id", jobId);

    const pages = await extractTextFromPdf(pdfBytes);
    console.log(`[${jobId}] Páginas: ${pages.length}`);
    const chunks = chunkPages(pages);
    console.log(`[${jobId}] Chunks: ${chunks.length}`);

    await supabase
      .from("sinapi_parse_jobs")
      .update({
        total_pages: pages.length,
        total_chunks: chunks.length,
        progress: 10,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    const allItems: ParsedRow[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < chunks.length; i++) {
      try {
        const items = await callAI(chunks[i], tipo);
        for (const it of items) {
          if (!it.codigo) continue;
          const k = String(it.codigo).trim();
          if (seen.has(k)) continue;
          seen.add(k);
          allItems.push(it);
        }
      } catch (err) {
        console.error(`[${jobId}] Erro chunk ${i}:`, err);
      }

      const progress = 10 + Math.floor(((i + 1) / chunks.length) * 85);
      await supabase
        .from("sinapi_parse_jobs")
        .update({
          processed_chunks: i + 1,
          progress,
          items: allItems,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    await supabase
      .from("sinapi_parse_jobs")
      .update({
        status: "completed",
        progress: 100,
        items: allItems,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`[${jobId}] Concluído com ${allItems.length} itens`);
  } catch (err: any) {
    console.error(`[${jobId}] Falha:`, err);
    await supabase
      .from("sinapi_parse_jobs")
      .update({
        status: "failed",
        error_message: err?.message || "Erro desconhecido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: job, error: jobErr } = await admin
      .from("sinapi_parse_jobs")
      .insert({
        user_id: userData.user.id,
        nome_arquivo: file.name,
        tipo,
        status: "pending",
      })
      .select()
      .single();

    if (jobErr || !job) {
      console.error("Erro criando job:", jobErr);
      return new Response(JSON.stringify({ error: "Falha ao criar job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // @ts-ignore - EdgeRuntime is available in Supabase Deno runtime
    EdgeRuntime.waitUntil(processJob(job.id, bytes, tipo));

    return new Response(JSON.stringify({ job_id: job.id }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("parse-sinapi-pdf error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Falha ao processar PDF" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
