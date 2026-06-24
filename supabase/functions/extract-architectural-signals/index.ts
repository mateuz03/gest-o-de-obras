import { assertAnalysisAccess, corsHeaders, getAuthenticatedContext, HttpError, json, toErrorResponse } from "../_shared/security.ts";

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

    const match = cleaned.match(/^([A-Za-zÀ-ÿ0-9\s\/\-\(\)]+?)\s+(\d+(?:[.,]\d+)?)\s*m(?:2|²)$/i);
    if (!match) continue;

    const nome = match[1].trim();
    const area = parseFloat(match[2].replace(",", "."));
    if (nome.length >= 3 && !isNaN(area) && area > 1 && area < 1000) {
      rooms.push({ nome, area_m2: area });
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await getAuthenticatedContext(req);
    const body: ExtractArchitecturalRequest = await req.json();
    const { analysis_id, document_id } = body;

    if (!analysis_id) {
      throw new HttpError(400, "analysis_id é obrigatório", "INVALID_INPUT");
    }

    await assertAnalysisAccess(ctx.adminClient, ctx.user.id, analysis_id);

    let pagesQuery = ctx.adminClient
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
      return json({ success: false, error: "No architectural pages found" }, 404);
    }

    const mergedText = pages
      .map((page) => [page.embedded_text || "", page.ocr_text || ""].filter(Boolean).join("\n"))
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
      pages_analyzed: pages.map((page) => ({
        id: page.id,
        page_number: page.page_number,
        page_class: page.page_class,
        confidence: page.classification_confidence,
      })),
      area_total_m2: areaTotal,
      escala_detectada: scale || "—",
      rooms,
      has_area_table: pages.some((page) => page.page_class === "quadro_de_areas"),
      signals,
      confidence,
      extracted_at: new Date().toISOString(),
    };

    const { error: runError } = await ctx.adminClient.from("analysis_extraction_runs").insert({
      analysis_id,
      document_id: document_id || pages[0]?.document_id || null,
      stage: "architectural_extraction",
      status: "completed",
      payload_json: payload,
    });

    if (runError) throw runError;

    return json({ success: true, extraction: payload });
  } catch (error) {
    return toErrorResponse(error, "Não foi possível extrair os sinais arquitetônicos.");
  }
});
