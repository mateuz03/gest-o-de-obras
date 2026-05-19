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

type StageStatus =
  | "pending"
  | "completed"
  | "failed"
  | "skipped";

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

async function logRun(
  supabase: any,
  payload: {
    analysis_id?: string;
    document_id?: string;
    stage: string;
    status: string;
    payload_json?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("analysis_extraction_runs").insert({
    analysis_id: payload.analysis_id ?? null,
    document_id: payload.document_id ?? null,
    stage: payload.stage,
    status: payload.status,
    payload_json: payload.payload_json ?? {},
  });

  if (error) {
    console.warn("Falha ao registrar analysis_extraction_runs:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any = null;
  let analysis_id = "";
  let document_id: string | null = null;

  const stages: Record<string, StageStatus> = {
    ingestion: "pending",
    page_rendering: "pending",
    ocr: "pending",
    classification: "pending",
    architectural_extraction: "pending",
    electrical_extraction: "pending",
    quantity_generation: "pending",
  };

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment variables are not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: RunAnalysisPipelineRequest = await req.json();

    const {
      analysis_id: incomingAnalysisId,
      user_id,
      file_name,
      mime_type,
      storage_path,
      storage_bucket = "project-files",
      persist_result = true,
    } = body;

    analysis_id = incomingAnalysisId;

    if (!analysis_id || !file_name || !mime_type || !storage_path) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logRun(supabase, {
      analysis_id,
      stage: "pipeline_orchestration_started",
      status: "started",
      payload_json: {
        file_name,
        mime_type,
        storage_path,
        storage_bucket,
        persist_result,
      },
    });

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
    document_id = ingestData?.document_id ?? null;

    if (!document_id) {
      throw new Error("ingest-document did not return document_id");
    }

    await logRun(supabase, {
      analysis_id,
      document_id,
      stage: "ingestion",
      status: "completed",
      payload_json: {
        ingestData,
      },
    });

    // 2. Render document pages
    try {
      const renderData = await invokeStage(supabase, authHeader, "render-document-pages", {
        analysis_id,
        document_id,
        source_bucket: storage_bucket,
        target_bucket: "document-pages",
      });

      stages.page_rendering = "completed";

      await logRun(supabase, {
        analysis_id,
        document_id,
        stage: "page_rendering",
        status: "completed",
        payload_json: {
          renderData,
        },
      });
    } catch (err: any) {
      stages.page_rendering = "failed";

      await logRun(supabase, {
        analysis_id,
        document_id,
        stage: "page_rendering",
        status: "failed",
        payload_json: {
          error: err?.message || String(err),
        },
      });

      console.warn("page rendering skipped/failed:", err);
    }

    // 3. OCR
    try {
      const ocrData = await invokeStage(supabase, authHeader, "ocr-document-pages", {
        analysis_id,
        document_id,
      });

      stages.ocr = "completed";

      await logRun(supabase, {
        analysis_id,
        document_id,
        stage: "ocr",
        status: "completed",
        payload_json: {
          ocrData,
        },
      });
    } catch (err: any) {
      stages.ocr = "failed";

      await logRun(supabase, {
        analysis_id,
        document_id,
        stage: "ocr",
        status: "failed",
        payload_json: {
          error: err?.message || String(err),
        },
      });

      console.warn("ocr skipped/failed:", err);
    }

    // 4. Classification
    const classificationData = await invokeStage(supabase, authHeader, "classify-document-pages", {
      analysis_id,
      document_id,
    });

    stages.classification = "completed";

    await logRun(supabase, {
      analysis_id,
      document_id,
      stage: "classification",
      status: "completed",
      payload_json: {
        classificationData,
      },
    });

    // 5. Architectural extraction
    try {
      const architecturalData = await invokeStage(
        supabase,
        authHeader,
        "extract-architectural-signals",
        {
          analysis_id,
          document_id,
        }
      );

      stages.architectural_extraction = "completed";

      await logRun(supabase, {
        analysis_id,
        document_id,
        stage: "architectural_extraction",
        status: "completed",
        payload_json: {
          architecturalData,
        },
      });
    } catch (err: any) {
      stages.architectural_extraction = "failed";

      await logRun(supabase, {
        analysis_id,
        document_id,
        stage: "architectural_extraction",
        status: "failed",
        payload_json: {
          error: err?.message || String(err),
        },
      });

      console.warn("architectural extraction skipped/failed:", err);
    }

    // 6. Electrical extraction
    try {
      const electricalData = await invokeStage(
        supabase,
        authHeader,
        "extract-electrical-signals",
        {
          analysis_id,
          document_id,
        }
      );

      stages.electrical_extraction = "completed";

      await logRun(supabase, {
        analysis_id,
        document_id,
        stage: "electrical_extraction",
        status: "completed",
        payload_json: {
          electricalData,
        },
      });
    } catch (err: any) {
      stages.electrical_extraction = "failed";

      await logRun(supabase, {
        analysis_id,
        document_id,
        stage: "electrical_extraction",
        status: "failed",
        payload_json: {
          error: err?.message || String(err),
        },
      });

      console.warn("electrical extraction skipped/failed:", err);
    }

    // 7. Quantity generation
    const quantityData = await invokeStage(supabase, authHeader, "generate-quantity-items", {
      analysis_id,
      document_id,
    });

    stages.quantity_generation = "completed";

    const resultado_json = quantityData?.quantitativo ?? null;

    await logRun(supabase, {
      analysis_id,
      document_id,
      stage: "quantity_generation",
      status: "completed",
      payload_json: {
        quantityData,
      },
    });

    if (persist_result && resultado_json) {
      await logRun(supabase, {
        analysis_id,
        document_id,
        stage: "final_result",
        status: "completed",
        payload_json: {
          resultado_json,
        },
      });
    }

    await logRun(supabase, {
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
        analysis_id,
        document_id,
        stages,
        resultado_json,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("run-analysis-pipeline error:", error);

    if (supabase && analysis_id) {
      await logRun(supabase, {
        analysis_id,
        document_id: document_id ?? undefined,
        stage: "pipeline_orchestration",
        status: "failed",
        payload_json: {
          error: error?.message || String(error),
          stages,
        },
      });
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        analysis_id,
        document_id,
        stages,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});