import { assertAnalysisAccess, assertDocumentAccess, corsHeaders, getAuthenticatedContext, HttpError, json, toErrorResponse } from "../_shared/security.ts";
import { runGoogleVisionOcr } from "../_shared/ocr-providers.ts";

interface OcrDocumentPagesRequest {
  analysis_id: string;
  document_id: string;
  target_bucket?: string;
  only_missing?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await getAuthenticatedContext(req);
    const body: OcrDocumentPagesRequest = await req.json();
    const {
      analysis_id,
      document_id,
      target_bucket = "document-pages",
      only_missing = true,
    } = body;

    if (!analysis_id || !document_id) {
      throw new HttpError(400, "analysis_id e document_id são obrigatórios.", "INVALID_INPUT");
    }

    await assertAnalysisAccess(ctx.adminClient, ctx.user.id, analysis_id);
    await assertDocumentAccess(ctx.adminClient, analysis_id, document_id);

    const { data: pages, error: pagesError } = await ctx.adminClient
      .from("analysis_document_pages")
      .select("*")
      .eq("analysis_id", analysis_id)
      .eq("document_id", document_id)
      .order("page_number", { ascending: true });

    if (pagesError) throw pagesError;

    const candidates = (pages || []).filter((page) => {
      if (!page.image_path) return false;
      if (!only_missing) return true;
      return !String(page.ocr_text || "").trim();
    });

    let processed = 0;
    for (const page of candidates) {
      const { data: fileData, error: fileError } = await ctx.adminClient.storage
        .from(target_bucket)
        .download(page.image_path);

      if (fileError) throw fileError;
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      const ocr = await runGoogleVisionOcr(bytes);

      const { error: updateError } = await ctx.adminClient
        .from("analysis_document_pages")
        .update({
          ocr_text: ocr.fullText,
          metadata_json: {
            ...(page.metadata_json || {}),
            ocr_provider: ocr.provider,
            ocr_at: new Date().toISOString(),
          },
        })
        .eq("id", page.id);

      if (updateError) throw updateError;
      processed += 1;
    }

    await ctx.adminClient.from("analysis_extraction_runs").insert({
      analysis_id,
      document_id,
      stage: "ocr",
      status: "completed",
      payload_json: {
        processed_pages: processed,
        skipped_pages: Math.max(0, (pages?.length || 0) - processed),
        target_bucket,
      },
    });

    return json({
      success: true,
      processed_pages: processed,
    });
  } catch (error) {
    return toErrorResponse(error, "Não foi possível executar o OCR das páginas.");
  }
});
