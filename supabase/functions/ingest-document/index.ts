import { assertAnalysisAccess, assertOwnedStoragePath, corsHeaders, getAuthenticatedContext, HttpError, json, toErrorResponse } from "../_shared/security.ts";
import {
  downloadStorageFile,
  inferDocumentKind,
  parseImageDocument,
  parsePdfDocument,
} from "../_shared/document-utils.ts";

interface IngestDocumentRequest {
  analysis_id: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  storage_bucket?: string;
  trigger_classification?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await getAuthenticatedContext(req);
    const body: IngestDocumentRequest = await req.json();
    const {
      analysis_id,
      file_name,
      mime_type,
      storage_path,
      storage_bucket = "project-files",
      trigger_classification = false,
    } = body;

    if (!analysis_id || !file_name || !mime_type || !storage_path) {
      throw new HttpError(400, "Campos obrigatórios ausentes.", "INVALID_INPUT");
    }

    await assertAnalysisAccess(ctx.adminClient, ctx.user.id, analysis_id);
    assertOwnedStoragePath(ctx.user.id, analysis_id, storage_path);

    const documentKind = inferDocumentKind(mime_type, file_name);
    const fileBytes = await downloadStorageFile(ctx.adminClient, storage_bucket, storage_path);

    const parsed = documentKind === "pdf"
      ? await parsePdfDocument(fileBytes)
      : documentKind === "image"
      ? await parseImageDocument()
      : {
          kind: "unknown" as const,
          page_count: 1,
          pages: [
            {
              page_number: 1,
              embedded_text: "",
              has_embedded_text: false,
              metadata_json: { source: "unknown_document_type" },
            },
          ],
          extracted_text_preview: "",
        };

    const { data: document, error: documentError } = await ctx.adminClient
      .from("analysis_documents")
      .insert({
        analysis_id,
        user_id: ctx.user.id,
        file_name,
        mime_type,
        storage_path,
        status: "processing",
      })
      .select("*")
      .single();

    if (documentError) throw documentError;

    const pageRows = parsed.pages.map((page) => ({
      document_id: document.id,
      analysis_id,
      page_number: page.page_number,
      image_path: null,
      embedded_text: page.embedded_text || "",
      ocr_text: "",
      has_embedded_text: !!page.has_embedded_text,
      page_class: null,
      classification_confidence: null,
      metadata_json: {
        ...(page.metadata_json || {}),
        document_kind: parsed.kind,
        file_name,
        storage_bucket,
        storage_path,
      },
    }));

    const { error: pagesError } = await ctx.adminClient.from("analysis_document_pages").insert(pageRows);
    if (pagesError) throw pagesError;

    const { error: updateError } = await ctx.adminClient
      .from("analysis_documents")
      .update({
        page_count: parsed.page_count,
        status: "uploaded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    if (updateError) throw updateError;

    await ctx.adminClient.from("analysis_extraction_runs").insert({
      analysis_id,
      document_id: document.id,
      stage: "ingestion",
      status: "completed",
      payload_json: {
        file_name,
        mime_type,
        storage_bucket,
        storage_path,
        detected_kind: parsed.kind,
        page_count: parsed.page_count,
      },
    });

    if (trigger_classification) {
      EdgeRuntime.waitUntil(
        ctx.adminClient.functions.invoke("classify-document-pages", {
          body: { analysis_id, document_id: document.id },
          headers: { Authorization: ctx.authHeader },
        }).catch((error) => {
          console.error("Background classify-document-pages failed:", error);
        }),
      );
    }

    return json({
      success: true,
      document_id: document.id,
      analysis_id,
      detected_kind: parsed.kind,
      page_count: parsed.page_count,
      extracted_text_preview: parsed.extracted_text_preview,
      status: trigger_classification ? "processing" : "uploaded",
    });
  } catch (error) {
    return toErrorResponse(error, "Não foi possível ingerir o documento.");
  }
});
