import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  inferDocumentKind,
  downloadStorageFile,
  parsePdfDocument,
  parseImageDocument,
} from "../_shared/document-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IngestDocumentRequest {
  analysis_id: string;
  user_id?: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  storage_bucket?: string;
  trigger_classification?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: IngestDocumentRequest = await req.json();
    const {
      analysis_id,
      user_id,
      file_name,
      mime_type,
      storage_path,
      storage_bucket = "project-files",
      trigger_classification = false,
    } = body;

    if (!analysis_id || !file_name || !mime_type || !storage_path) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const documentKind = inferDocumentKind(mime_type, file_name);

    const { data: document, error: docError } = await supabase
      .from("analysis_documents")
      .insert({
        analysis_id,
        user_id: user_id || null,
        file_name,
        mime_type,
        storage_path,
        status: "processing",
      })
      .select()
      .single();

    if (docError) throw docError;

    const fileBytes = await downloadStorageFile(supabase, storage_bucket, storage_path);

    let parsed;
    if (documentKind === "pdf") {
      parsed = await parsePdfDocument(fileBytes);
    } else if (documentKind === "image") {
      parsed = await parseImageDocument();
    } else {
      parsed = {
        kind: "unknown" as const,
        page_count: 1,
        pages: [
          {
            page_number: 1,
            embedded_text: "",
            has_embedded_text: false,
            metadata_json: {
              source: "unknown_document_type",
            },
          },
        ],
        extracted_text_preview: "",
      };
    }

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

    const { error: pageInsertError } = await supabase
      .from("analysis_document_pages")
      .insert(pageRows);

    if (pageInsertError) throw pageInsertError;

    const { error: docUpdateError } = await supabase
      .from("analysis_documents")
      .update({
        page_count: parsed.page_count,
        status: "uploaded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    if (docUpdateError) throw docUpdateError;

    const { error: runError } = await supabase
      .from("analysis_extraction_runs")
      .insert({
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
          extracted_text_preview: parsed.extracted_text_preview,
        },
      });

    if (runError) throw runError;

    if (trigger_classification) {
      EdgeRuntime.waitUntil(
        (async () => {
          try {
            await supabase.functions.invoke("classify-document-pages", {
              body: {
                analysis_id,
                document_id: document.id,
              },
              headers: {
                Authorization: authHeader,
              },
            });
          } catch (e) {
            console.error("Background classify-document-pages failed:", e);
          }
        })()
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_id: document.id,
        analysis_id,
        detected_kind: parsed.kind,
        page_count: parsed.page_count,
        extracted_text_preview: parsed.extracted_text_preview,
        status: trigger_classification ? "processing" : "uploaded",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("ingest-document error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});