import { assertAnalysisAccess, assertDocumentAccess, corsHeaders, getAuthenticatedContext, HttpError, json, toErrorResponse } from "../_shared/security.ts";
import { downloadStorageFile } from "../_shared/document-utils.ts";
import { renderPdfToImages } from "../_shared/pdf-renderer.ts";

interface RenderDocumentPagesRequest {
  analysis_id: string;
  document_id: string;
  source_bucket?: string;
  target_bucket?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await getAuthenticatedContext(req);
    const body: RenderDocumentPagesRequest = await req.json();
    const {
      analysis_id,
      document_id,
      source_bucket = "project-files",
      target_bucket = "document-pages",
    } = body;

    if (!analysis_id || !document_id) {
      throw new HttpError(400, "analysis_id e document_id são obrigatórios.", "INVALID_INPUT");
    }

    await assertAnalysisAccess(ctx.adminClient, ctx.user.id, analysis_id);
    const document = await assertDocumentAccess(ctx.adminClient, analysis_id, document_id);

    const mimeType = String(document.mime_type || "").toLowerCase();
    if (!mimeType.includes("pdf")) {
      return json({
        success: true,
        skipped: true,
        reason: "Document is not a PDF",
      });
    }

    await ctx.adminClient.from("analysis_extraction_runs").insert({
      analysis_id,
      document_id,
      stage: "page_rendering",
      status: "processing",
      payload_json: {
        source_bucket,
        target_bucket,
      },
    });

    const fileBytes = await downloadStorageFile(ctx.adminClient, source_bucket, document.storage_path);
    const renderedPages = await renderPdfToImages(fileBytes, {
      scale: 2,
      format: "png",
    });

    const uploadResults: Array<{ page_number: number; image_path: string }> = [];

    for (const page of renderedPages) {
      const imagePath = `analysis/${analysis_id}/documents/${document_id}/pages/page-${page.page_number}.png`;
      const { error: uploadError } = await ctx.adminClient.storage
        .from(target_bucket)
        .upload(imagePath, page.bytes, {
          contentType: page.content_type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: existingPage } = await ctx.adminClient
        .from("analysis_document_pages")
        .select("metadata_json")
        .eq("document_id", document_id)
        .eq("analysis_id", analysis_id)
        .eq("page_number", page.page_number)
        .maybeSingle();

      const { error: updatePageError } = await ctx.adminClient
        .from("analysis_document_pages")
        .update({
          image_path: imagePath,
          metadata_json: {
            ...(existingPage?.metadata_json || {}),
            rendered_at: new Date().toISOString(),
            target_bucket,
          },
        })
        .eq("document_id", document_id)
        .eq("analysis_id", analysis_id)
        .eq("page_number", page.page_number);

      if (updatePageError) throw updatePageError;

      uploadResults.push({
        page_number: page.page_number,
        image_path: imagePath,
      });
    }

    await ctx.adminClient
      .from("analysis_documents")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", document_id);

    await ctx.adminClient.from("analysis_extraction_runs").insert({
      analysis_id,
      document_id,
      stage: "page_rendering",
      status: "completed",
      payload_json: {
        rendered_pages: uploadResults.length,
      },
    });

    return json({
      success: true,
      rendered_pages: uploadResults.length,
      pages: uploadResults,
    });
  } catch (error) {
    return toErrorResponse(error, "Não foi possível renderizar as páginas do documento.");
  }
});
