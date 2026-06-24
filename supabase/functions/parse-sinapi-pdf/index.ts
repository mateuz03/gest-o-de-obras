// Edge Function: parse-sinapi-pdf
// Job-based: cria/retoma um job, processa em background com retry+backoff,
// e retorna imediatamente. PDFs longos podem exigir múltiplas invocações
// (auto-resume): o frontend reinvoca com { resume_job_id } se o job parar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { HttpError, toErrorResponse } from "../_shared/security.ts";
import { validateBinaryUpload } from "../_shared/upload-validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_PDF_BYTES = 20 * 1024 * 1024;

// Limites por invocação para evitar "CPU Time exceeded".
// PDFs longos serão retomados em invocações subsequentes via resume_job_id.
const MAX_CHUNKS_PER_INVOCATION = 25;
const CHUNK_CHAR_SIZE = 14000; // chunks maiores => menos chamadas IA

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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callAI(chunkText: string, tipo: string): Promise<ParsedRow[]> {
  const userMsg = `Tipo: ${tipo === "composicao" ? "COMPOSIÇÕES" : "INSUMOS"}.\n\nTrecho:\n"""\n${chunkText}\n"""\n\nExtraia TODOS os itens válidos.`;

  // Retry com backoff exponencial: 1s, 2s, 4s, 8s (máx 4 tentativas).
  const maxRetries = 4;
  let delay = 1000;
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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

      if (resp.status === 429) {
        const txt = await resp.text();
        console.warn(`AI 429 (tentativa ${attempt + 1}/${maxRetries}), aguardando ${delay}ms`, txt.slice(0, 200));
        await sleep(delay);
        delay *= 2;
        lastErr = new Error("Rate limited 429");
        continue;
      }

      if (resp.status === 402) {
        throw new Error("Créditos de IA esgotados.");
      }

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("AI error", resp.status, txt.slice(0, 300));
        // 5xx => retry; 4xx => não retry
        if (resp.status >= 500 && attempt < maxRetries - 1) {
          await sleep(delay);
          delay *= 2;
          lastErr = new Error(`AI ${resp.status}`);
          continue;
        }
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
    } catch (err: any) {
      lastErr = err;
      if (attempt < maxRetries - 1) {
        await sleep(delay);
        delay *= 2;
        continue;
      }
    }
  }

  throw lastErr || new Error("AI call failed");
}

function chunkPages(pages: string[], maxCharsPerChunk = CHUNK_CHAR_SIZE): string[] {
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

// Processa um lote (até MAX_CHUNKS_PER_INVOCATION) e atualiza o job.
// Se sobrar trabalho, marca status='paused' para o frontend reinvocar.
async function processJobBatch(jobId: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: job, error: jobErr } = await supabase
    .from("sinapi_parse_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr || !job) {
    console.error(`[${jobId}] Job não encontrado`, jobErr);
    return;
  }

  // Recupera chunks do storage (salvos na primeira invocação).
  // Estratégia simples: armazenamos chunks como JSON em items inicialmente? Não — usamos coluna observacoes? 
  // Melhor: cache em memória do PDF não persiste entre invocações.
  // Solução: armazenamos os CHUNKS DE TEXTO no campo `error_message` (renomeado mentalmente) — não, melhor usar storage.
  // Aqui: chunks já foram persistidos no bucket "blueprints" como JSON.
  const tipo = job.tipo;

  let chunks: string[] = [];
  try {
    const { data: blob, error: dlErr } = await supabase.storage
      .from("blueprints")
      .download(`sinapi-jobs/${jobId}/chunks.json`);
    if (dlErr || !blob) {
      throw new Error("Chunks não encontrados no storage: " + (dlErr?.message || ""));
    }
    chunks = JSON.parse(await blob.text());
  } catch (err: any) {
    console.error(`[${jobId}] Erro carregando chunks:`, err);
    await supabase
      .from("sinapi_parse_jobs")
      .update({
        status: "failed",
        error_message: "Falha ao recuperar chunks: " + (err.message || ""),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return;
  }

  await supabase
    .from("sinapi_parse_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  const allItems: ParsedRow[] = Array.isArray(job.items) ? (job.items as any) : [];
  const seen = new Set<string>(allItems.map((i: any) => String(i.codigo).trim()));
  const startIdx = job.processed_chunks || 0;
  const endIdx = Math.min(startIdx + MAX_CHUNKS_PER_INVOCATION, chunks.length);

  console.log(`[${jobId}] Processando chunks ${startIdx}..${endIdx} de ${chunks.length}`);

  for (let i = startIdx; i < endIdx; i++) {
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

    const processed = i + 1;
    const progress = 10 + Math.floor((processed / chunks.length) * 85);
    await supabase
      .from("sinapi_parse_jobs")
      .update({
        processed_chunks: processed,
        progress,
        items: allItems,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  const finished = endIdx >= chunks.length;
  await supabase
    .from("sinapi_parse_jobs")
    .update({
      status: finished ? "completed" : "paused",
      progress: finished ? 100 : 10 + Math.floor((endIdx / chunks.length) * 85),
      items: allItems,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (finished) {
    // limpa chunks do storage
    await supabase.storage
      .from("blueprints")
      .remove([`sinapi-jobs/${jobId}/chunks.json`]);
    console.log(`[${jobId}] Concluído: ${allItems.length} itens`);
  } else {
    console.log(`[${jobId}] Pausado em ${endIdx}/${chunks.length} — aguardando resume`);
  }
}

async function initJob(
  jobId: string,
  pdfBytes: Uint8Array,
) {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    await supabase
      .from("sinapi_parse_jobs")
      .update({ status: "processing", progress: 3, updated_at: new Date().toISOString() })
      .eq("id", jobId);

    const pages = await extractTextFromPdf(pdfBytes);
    console.log(`[${jobId}] Páginas: ${pages.length}`);
    const chunks = chunkPages(pages);
    console.log(`[${jobId}] Chunks: ${chunks.length}`);

    // Persiste chunks no storage para resume entre invocações.
    const chunksJson = new Blob([JSON.stringify(chunks)], { type: "application/json" });
    const { error: upErr } = await supabase.storage
      .from("blueprints")
      .upload(`sinapi-jobs/${jobId}/chunks.json`, chunksJson, {
        contentType: "application/json",
        upsert: true,
      });
    if (upErr) throw new Error("Falha ao salvar chunks: " + upErr.message);

    await supabase
      .from("sinapi_parse_jobs")
      .update({
        total_pages: pages.length,
        total_chunks: chunks.length,
        progress: 10,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await processJobBatch(jobId);
  } catch (err: any) {
    console.error(`[${jobId}] Falha init:`, err);
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

    const contentType = req.headers.get("content-type") || "";

    // Resume mode: JSON com { resume_job_id }
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const resumeId = body?.resume_job_id;
      if (resumeId && !/^[0-9a-f-]{36}$/i.test(String(resumeId))) {
        throw new HttpError(400, "resume_job_id invalido", "INVALID_JOB_ID");
      }
      if (!resumeId) {
        return new Response(JSON.stringify({ error: "resume_job_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: job } = await admin
        .from("sinapi_parse_jobs")
        .select("id, user_id, status")
        .eq("id", resumeId)
        .maybeSingle();
      if (!job || job.user_id !== userData.user.id) {
        return new Response(JSON.stringify({ error: "Job não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (job.status === "completed") {
        return new Response(JSON.stringify({ job_id: resumeId, status: "completed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // @ts-ignore - EdgeRuntime
      EdgeRuntime.waitUntil(processJobBatch(resumeId));
      return new Response(JSON.stringify({ job_id: resumeId, status: "resumed" }), {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Init mode: multipart/form-data com PDF
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
    const mimeType = file.type || (String(file.name || "").toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
    validateBinaryUpload({
      allowedMimeTypes: ["application/pdf"],
      bytes,
      fileName: file.name,
      maxBytes: MAX_PDF_BYTES,
      mimeType,
    });
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

    // @ts-ignore - EdgeRuntime
    EdgeRuntime.waitUntil(initJob(job.id, bytes));

    return new Response(JSON.stringify({ job_id: job.id }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("parse-sinapi-pdf error:", err);
    return await toErrorResponse(err, "Falha ao processar PDF", {
      functionName: "parse-sinapi-pdf",
      request: req,
      source: "edge",
    });
  }
});
