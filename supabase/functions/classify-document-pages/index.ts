import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ClassifyRequest {
  analysis_id: string;
  document_id: string;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function classifyPageFromText(text: string) {
  const t = normalize(text || "");
  const signals: string[] = [];

  let pageClass = "desconhecida";
  let confidence = 0.2;

  const has = (term: string) => t.includes(term);

  if (has("quadro de cargas") || has("circuito") || has("potencia") || has("disjuntor")) {
    pageClass = "quadro_de_cargas";
    confidence = 0.92;
    signals.push("termos de quadro elétrico");
  } else if (has("tomada") || has("iluminacao") || has("interruptor") || has("eletroduto")) {
    pageClass = "eletrica";
    confidence = 0.84;
    signals.push("termos de instalação elétrica");
  } else if (has("quadro de areas") || has("area total") || has("area privativa")) {
    pageClass = "quadro_de_areas";
    confidence = 0.93;
    signals.push("termos de quadro de áreas");
  } else if (has("escala") || has("planta baixa") || has("corte") || has("fachada")) {
    pageClass = "arquitetonica";
    confidence = 0.72;
    signals.push("termos arquitetônicos");
  } else if (has("esgoto") || has("agua fria") || has("agua quente") || has("hidraulica")) {
    pageClass = "hidraulica";
    confidence = 0.85;
    signals.push("termos hidráulicos");
  } else if (has("legenda")) {
    pageClass = "legenda";
    confidence = 0.75;
    signals.push("termo legenda");
  } else if (has("memorial")) {
    pageClass = "memorial";
    confidence = 0.8;
    signals.push("termo memorial");
  }

  return { pageClass, confidence, signals };
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

    const body: ClassifyRequest = await req.json();
    const { analysis_id, document_id } = body;

    if (!analysis_id || !document_id) {
      return new Response(JSON.stringify({ error: "Missing analysis_id or document_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pages, error: pagesError } = await supabase
      .from("analysis_document_pages")
      .select("*")
      .eq("analysis_id", analysis_id)
      .eq("document_id", document_id)
      .order("page_number", { ascending: true });

    if (pagesError) throw pagesError;

    const updates = [];
    for (const page of pages || []) {
      const sourceText = [page.embedded_text || "", page.ocr_text || ""].join("\n").trim();
      const { pageClass, confidence, signals } = classifyPageFromText(sourceText);

      updates.push(
        supabase
          .from("analysis_document_pages")
          .update({
            page_class: pageClass,
            classification_confidence: confidence,
            metadata_json: {
              ...(page.metadata_json || {}),
              signals,
              classified_at: new Date().toISOString(),
            },
          })
          .eq("id", page.id)
      );
    }

    await Promise.all(updates);

    await supabase
      .from("analysis_documents")
      .update({
        status: "classified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    await supabase.from("analysis_extraction_runs").insert({
      analysis_id,
      document_id,
      stage: "classification",
      status: "completed",
      payload_json: {
        page_count: pages?.length || 0,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        classified_pages: pages?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("classify-document-pages error:", error);
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