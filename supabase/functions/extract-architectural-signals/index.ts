import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractArchitecturalRequest {
  analysis_id: string;
  document_id?: string;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractScale(text: string): string | null {
  const match = text.match(/escala\s*[:\-]?\s*(\d+\s*[:/]\s*\d+)/i);
  return match ? match[1].replace(/\s+/g, "") : null;
}

function extractAreaTotal(text: string): number | null {
  const patterns = [
    /area\s+total\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*m2/i,
    /area\s+total\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*m²/i,
    /area\s+construida\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*m2/i,
    /area\s+construida\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*m²/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(",", "."));
      if (!isNaN(value)) return value;
    }
  }

  return null;
}

function extractRoomAreas(text: string) {
  const lines = text.split(/\r?\n/);
  const rooms: Array<{ nome: string; area_m2: number }> = [];

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) continue;

    const match = cleaned.match(
      /^([A-Za-zÀ-ÿ0-9\s\/\-\(\)]+?)\s+(\d+(?:[.,]\d+)?)\s*m(?:2|²)$/i
    );

    if (match) {
      const nome = match[1].trim();
      const area = parseFloat(match[2].replace(",", "."));

      if (
        nome.length >= 3 &&
        !isNaN(area) &&
        area > 1 &&
        area < 1000
      ) {
        rooms.push({ nome, area_m2: area });
      }
    }
  }

  return rooms;
}

function detectArchitecturalSignals(text: string) {
  const t = normalize(text);
  const signals: string[] = [];

  if (t.includes("planta baixa")) signals.push("planta baixa identificada");
  if (t.includes("escala")) signals.push("escala identificada");
  if (t.includes("area total") || t.includes("area construida")) signals.push("área total identificada");
  if (t.includes("quadro de areas")) signals.push("quadro de áreas identificado");
  if (t.includes("sala")) signals.push("ambiente sala detectado");
  if (t.includes("cozinha")) signals.push("ambiente cozinha detectado");
  if (t.includes("banheiro")) signals.push("ambiente banheiro detectado");
  if (t.includes("suite")) signals.push("ambiente suíte detectado");
  if (t.includes("quarto")) signals.push("ambiente quarto detectado");
  if (t.includes("garagem")) signals.push("ambiente garagem detectado");
  if (t.includes("varanda")) signals.push("ambiente varanda detectado");

  return signals;
}

function inferConfidence(params: {
  areaTotal: number | null;
  scale: string | null;
  roomCount: number;
  signalsCount: number;
}) {
  let score = 0;

  if (params.areaTotal) score += 40;
  if (params.scale) score += 20;
  if (params.roomCount >= 3) score += 25;
  else if (params.roomCount > 0) score += 15;
  if (params.signalsCount >= 3) score += 15;

  if (score >= 75) return "alta";
  if (score >= 40) return "media";
  return "baixa";
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

    const body: ExtractArchitecturalRequest = await req.json();
    const { analysis_id, document_id } = body;

    if (!analysis_id) {
      return new Response(JSON.stringify({ error: "Missing analysis_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let pagesQuery = supabase
      .from("analysis_document_pages")
      .select("*")
      .eq("analysis_id", analysis_id)
      .in("page_class", ["arquitetonica", "quadro_de_areas", "legenda"])
      .order("page_number", { ascending: true });

    if (document_id) {
      pagesQuery = pagesQuery.eq("document_id", document_id);
    }

    const { data: pages, error: pagesError } = await pagesQuery;
    if (pagesError) throw pagesError;

    if (!pages || pages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No architectural pages found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mergedText = pages
      .map((p) => [p.embedded_text || "", p.ocr_text || ""].filter(Boolean).join("\n"))
      .join("\n\n");

    const areaTotal = extractAreaTotal(mergedText);
    const scale = extractScale(mergedText);
    const rooms = extractRoomAreas(mergedText);
    const signals = detectArchitecturalSignals(mergedText);
    const confidence = inferConfidence({
      areaTotal,
      scale,
      roomCount: rooms.length,
      signalsCount: signals.length,
    });

    const payload = {
      discipline: "architectural",
      analysis_id,
      document_id: document_id || null,
      pages_analyzed: pages.map((p) => ({
        id: p.id,
        page_number: p.page_number,
        page_class: p.page_class,
        confidence: p.classification_confidence,
      })),
      area_total_m2: areaTotal,
      escala_detectada: scale || "—",
      rooms,
      has_area_table: pages.some((p) => p.page_class === "quadro_de_areas"),
      signals,
      confidence,
      extracted_at: new Date().toISOString(),
    };

    const { error: runError } = await supabase
      .from("analysis_extraction_runs")
      .insert({
        analysis_id,
        document_id: document_id || pages[0]?.document_id || null,
        stage: "architectural_extraction",
        status: "completed",
        payload_json: payload,
      });

    if (runError) throw runError;

    return new Response(
      JSON.stringify({
        success: true,
        extraction: payload,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("extract-architectural-signals error:", error);
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