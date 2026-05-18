import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RunAnalysisPipelineRequest {
  analysis_id: string;
  user_id?: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  storage_bucket?: string;
  persist_result?: boolean;
}

async function invokeStage(
  supabase: any,
  authHeader: string,
  functionName: string,
  body: Record<string, unknown>
) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: {
      Authorization: authHeader,
    },
  });

  if (error) {
    throw new Error(`${functionName} failed: ${error.message}`);
  }

  return data;
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

    const body: RunAnalysisPipelineRequest = await req.json();

    const {
      analysis_id,
      user_id,
      file_name,
      mime_type,
      storage_path,
      storage_bucket = "project-files",
      persist_result = true,
    } = body;

    if (!analysis_id || !file_name || !mime_type || !storage_path) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stages: Record<string, string> = {
      ingestion: "pending",
      page_rendering: "pending",
      ocr_pages: "pending",
      classification: "pending",
      architectural_extraction: "pending",
      electrical_extraction: "pending",
      quantity_generation: "pending",
    };

    // 1. Ingestion
    const ingestData = await invokeStage(supabase, authHeader, "ingest-document", {
      analysis_id,
      user_id,
      file_name,
      mime_type,
      storage_path,
      storage_bucket,
      trigger_classification: false,
    });

    stages.ingestion = "completed";

    const document_id = ingestData?.document_id;
    if (!document_id) {
      throw new Error("ingest-document did not return document_id");
    }

    // 2. Render document pages
    try {
      await invokeStage(supabase, authHeader, "render-document-pages", {
        analysis_id,
        document_id,
        source_bucket: storage_bucket,
        target_bucket: "document-pages",
      });
      stages.page_rendering = "completed";
    } catch (err) {
      console.warn("page rendering skipped/failed:", err);
      stages.page_rendering = "failed";
    }

    // 3. OCR document pages
    try {
      await invokeStage(supabase, authHeader, "ocr-document-pages", {
        analysis_id,
        document_id,
        target_bucket: "document-pages",
        only_missing: true,
      });
      stages.ocr_pages = "completed";
    } catch (err) {
      console.warn("ocr pages skipped/failed:", err);
      stages.ocr_pages = "failed";
    }

    // 4. Classification
    await invokeStage(supabase, authHeader, "classify-document-pages", {
      analysis_id,
      document_id,
    });
    stages.classification = "completed";

    // 5. Architectural extraction
    try {
      await invokeStage(supabase, authHeader, "extract-architectural-signals", {
        analysis_id,
        document_id,
      });
      stages.architectural_extraction = "completed";
    } catch (err) {
      console.warn("architectural extraction skipped/failed:", err);
      stages.architectural_extraction = "failed";
    }

    // 6. Electrical extraction
    try {
      await invokeStage(supabase, authHeader, "extract-electrical-signals", {
        analysis_id,
        document_id,
      });
      stages.electrical_extraction = "completed";
    } catch (err) {
      console.warn("electrical extraction skipped/failed:", err);
      stages.electrical_extraction = "failed";
    }

    // 7. Quantity generation
    const quantityData = await invokeStage(supabase, authHeader, "generate-quantity-items", {
      analysis_id,
    });
    stages.quantity_generation = "completed";

    const resultado_json = quantityData?.quantitativo || null;

    if (persist_result && resultado_json) {
      const { error: updateError } = await supabase
        .from("analyses")
        .update({
          resultado_json,
          status: "completed",
        } as any)
        .eq("id", analysis_id);

      if (updateError) {
        throw updateError;
      }
    }

    await supabase.from("analysis_extraction_runs").insert({
      analysis_id,
      document_id,
      stage: "pipeline_orchestration",
      status: "completed",
      payload_json: {
        file_name,
        mime_type,
        storage_path,
        storage_bucket,
        stages,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        stages,
        resultado_json,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("run-analysis-pipeline error:", error);

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