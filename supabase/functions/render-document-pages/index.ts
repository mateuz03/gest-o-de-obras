import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { downloadStorageFile } from "../_shared/document-utils.ts";
import { renderPdfToImages } from "../_shared/pdf-renderer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RenderDocumentPagesRequest {
  analysis_id: string;
  document_id: string;
  source_bucket?: string;
  target_bucket?: string;
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

    const body: RenderDocumentPagesRequest = await req.json();
    const {
      analysis_id,
      document_id,
      source_bucket = "project-files",
      target_bucket = "document-pages",
    } = body;

    if (!analysis_id || !document_id) {
      return new Response(JSON.stringify({ error: "Missing analysis_id or document_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: document, error: docError } = await supabase
      .from("analysis_documents")
      .select("*")
      .eq("id", document_id)
      .eq("analysis_id", analysis_id)
      .single();

    if (docError) throw docError;
    if (!document) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mimeType = String(document.mime_type || "").toLowerCase();
    if (!mimeType.includes("pdf")) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "Document is not a PDF",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("analysis_extraction_runs")
      .insert({
        analysis_id,
        document_id,
        stage: "page_rendering",
        status: "processing",
        payload_json: {
          source_bucket,
          target_bucket,
        },
      });

    const fileBytes = await downloadStorageFile(supabase, source_bucket, document.storage_path);
    const renderedPages = await renderPdfToImages(fileBytes, {
      scale: 2,
      format: "png",
    });

    if (!renderedPages.length) {
      await supabase
        .from("analysis_extraction_runs")
        .insert({
          analysis_id,
          document_id,
          stage: "page_rendering",
          status: "completed",
          payload_json: {
            rendered_pages: 0,
            warning: "No rendered pages produced by renderer",
          },
        });

      return new Response(
        JSON.stringify({
          success: true,
          rendered_pages: 0,
          warning: "Renderer returned no pages",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const uploadResults: Array<{ page_number: number; image_path: string }> = [];

    for (const page of renderedPages) {
      const extension = page.content_type.includes("jpeg") ? "jpg" : "png";
      const imagePath = `analysis/${analysis_id}/documents/${document_id}/pages/page-${page.page_number}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(target_bucket)
        .upload(imagePath, page.bytes, {
          contentType: page.content_type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: updatePageError } = await supabase
        .from("analysis_document_pages")
        .update({
          image_path: imagePath,
          metadata_json: {
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

    await supabase
      .from("analysis_documents")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    await supabase
      .from("analysis_extraction_runs")
      .insert({
        analysis_id,
        document_id,
        stage: "page_rendering",
        status: "completed",
        payload_json: {
          rendered_pages: uploadResults.length,
          pages: uploadResults,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        rendered_pages: uploadResults.length,
        pages: uploadResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("render-document-pages error:", error);

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