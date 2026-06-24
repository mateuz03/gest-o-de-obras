import { assertAnalysisAccess, assertOwnedStoragePath, corsHeaders, getAuthenticatedContext, HttpError, json, toErrorResponse } from "../_shared/security.ts";

interface RunAnalysisPipelineRequest {
  analysis_id: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  storage_bucket?: string;
  persist_result?: boolean;
}

type StageStatus = "pending" | "completed" | "failed" | "skipped";

async function invokeStage(
  supabase: any,
  authHeader: string,
  functionName: string,
  body: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: { Authorization: authHeader },
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
  },
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let analysisId = "";
  let documentId: string | null = null;
  let supabase: any = null;

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
    const ctx = await getAuthenticatedContext(req);
    supabase = ctx.adminClient;

    const body: RunAnalysisPipelineRequest = await req.json();
    const {
      analysis_id,
      file_name,
      mime_type,
      storage_path,
      storage_bucket = "project-files",
      persist_result = true,
    } = body;

    if (!analysis_id || !file_name || !mime_type || !storage_path) {
      throw new HttpError(400, "Campos obrigatórios ausentes.", "INVALID_INPUT");
    }

    analysisId = analysis_id;
    await assertAnalysisAccess(supabase, ctx.user.id, analysis_id);
    assertOwnedStoragePath(ctx.user.id, analysis_id, storage_path);

    await logRun(supabase, {
      analysis_id,
      stage: "pipeline_orchestration_started",
      status: "started",
      payload_json: { file_name, mime_type, storage_path, storage_bucket, persist_result },
    });

    const ingestData = await invokeStage(supabase, ctx.authHeader, "ingest-document", {
      analysis_id,
      file_name,
      mime_type,
      storage_path,
      storage_bucket,
      trigger_classification: false,
    });

    stages.ingestion = "completed";
    documentId = ingestData?.document_id ?? null;
    if (!documentId) {
      throw new Error("ingest-document did not return document_id");
    }

    await logRun(supabase, {
      analysis_id,
      document_id: documentId,
      stage: "ingestion",
      status: "completed",
      payload_json: { ingestData },
    });

    try {
      const renderData = await invokeStage(supabase, ctx.authHeader, "render-document-pages", {
        analysis_id,
        document_id: documentId,
        source_bucket: storage_bucket,
        target_bucket: "document-pages",
      });
      stages.page_rendering = "completed";
      await logRun(supabase, {
        analysis_id,
        document_id: documentId,
        stage: "page_rendering",
        status: "completed",
        payload_json: { renderData },
      });
    } catch (error: any) {
      stages.page_rendering = "failed";
      await logRun(supabase, {
        analysis_id,
        document_id: documentId,
        stage: "page_rendering",
        status: "failed",
        payload_json: { error: error?.message || String(error) },
      });
    }

    try {
      const ocrData = await invokeStage(supabase, ctx.authHeader, "ocr-document-pages", {
        analysis_id,
        document_id: documentId,
        target_bucket: "document-pages",
        only_missing: true,
      });
      stages.ocr = "completed";
      await logRun(supabase, {
        analysis_id,
        document_id: documentId,
        stage: "ocr",
        status: "completed",
        payload_json: { ocrData },
      });
    } catch (error: any) {
      stages.ocr = "failed";
      await logRun(supabase, {
        analysis_id,
        document_id: documentId,
        stage: "ocr",
        status: "failed",
        payload_json: { error: error?.message || String(error) },
      });
    }

    const classificationData = await invokeStage(supabase, ctx.authHeader, "classify-document-pages", {
      analysis_id,
      document_id: documentId,
    });
    stages.classification = "completed";
    await logRun(supabase, {
      analysis_id,
      document_id: documentId,
      stage: "classification",
      status: "completed",
      payload_json: { classificationData },
    });

    try {
      const architecturalData = await invokeStage(supabase, ctx.authHeader, "extract-architectural-signals", {
        analysis_id,
        document_id: documentId,
      });
      stages.architectural_extraction = "completed";
      await logRun(supabase, {
        analysis_id,
        document_id: documentId,
        stage: "architectural_extraction",
        status: "completed",
        payload_json: { architecturalData },
      });
    } catch (error: any) {
      stages.architectural_extraction = "failed";
      await logRun(supabase, {
        analysis_id,
        document_id: documentId,
        stage: "architectural_extraction",
        status: "failed",
        payload_json: { error: error?.message || String(error) },
      });
    }

    try {
      const electricalData = await invokeStage(supabase, ctx.authHeader, "extract-electrical-signals", {
        analysis_id,
        document_id: documentId,
      });
      stages.electrical_extraction = "completed";
      await logRun(supabase, {
        analysis_id,
        document_id: documentId,
        stage: "electrical_extraction",
        status: "completed",
        payload_json: { electricalData },
      });
    } catch (error: any) {
      stages.electrical_extraction = "failed";
      await logRun(supabase, {
        analysis_id,
        document_id: documentId,
        stage: "electrical_extraction",
        status: "failed",
        payload_json: { error: error?.message || String(error) },
      });
    }

    const quantityData = await invokeStage(supabase, ctx.authHeader, "generate-quantity-items", {
      analysis_id,
      document_id: documentId,
    });
    stages.quantity_generation = "completed";
    const resultado_json = quantityData?.quantitativo ?? null;

    if (persist_result && resultado_json) {
      await supabase
        .from("analyses")
        .update({ resultado_json, status: "completed" })
        .eq("id", analysis_id)
        .eq("user_id", ctx.user.id);
    }

    await logRun(supabase, {
      analysis_id,
      document_id: documentId,
      stage: "pipeline_orchestration",
      status: "completed",
      payload_json: { file_name, mime_type, storage_path, storage_bucket, stages },
    });

    return json({
      success: true,
      analysis_id,
      document_id: documentId,
      stages,
      resultado_json,
    });
  } catch (error: any) {
    if (supabase && analysisId) {
      await logRun(supabase, {
        analysis_id: analysisId,
        document_id: documentId ?? undefined,
        stage: "pipeline_orchestration",
        status: "failed",
        payload_json: {
          error: error?.message || String(error),
          stages,
        },
      });
    }

    return toErrorResponse(error, "Não foi possível executar o pipeline da análise.");
  }
});
