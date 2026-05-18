import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractElectricalRequest {
  analysis_id: string;
  document_id?: string;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractAmperagens(text: string): number[] {
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*a\b/gi)];
  const values = matches
    .map((m) => parseFloat(m[1].replace(",", ".")))
    .filter((n) => !isNaN(n) && n > 0 && n < 1000);

  return [...new Set(values)].sort((a, b) => a - b);
}

function extractBitolas(text: string): number[] {
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:mm2|mm²)/gi)];
  const values = matches
    .map((m) => parseFloat(m[1].replace(",", ".")))
    .filter((n) => !isNaN(n) && n > 0 && n < 1000);

  return [...new Set(values)].sort((a, b) => a - b);
}

function countKeyword(text: string, regex: RegExp): number {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function extractCircuitLabels(text: string): string[] {
  const matches = [...text.matchAll(/\b(circuito|circ\.?|c)\s*[-:]?\s*(\d{1,3})\b/gi)];
  const labels = matches.map((m) => `C${m[2]}`);
  return [...new Set(labels)];
}

function extractCircuitRows(text: string) {
  const lines = text.split(/\r?\n/);
  const circuits: Array<{
    circuito: string;
    descricao?: string;
    amperagem?: number | null;
    bitola_mm2?: number | null;
  }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const circuitMatch = line.match(/\b(circuito|circ\.?|c)\s*[-:]?\s*(\d{1,3})\b/i);
    if (!circuitMatch) continue;

    const circuito = `C${circuitMatch[2]}`;
    const ampMatch = line.match(/(\d+(?:[.,]\d+)?)\s*a\b/i);
    const bitolaMatch = line.match(/(\d+(?:[.,]\d+)?)\s*(?:mm2|mm²)/i);

    const amperagem = ampMatch ? parseFloat(ampMatch[1].replace(",", ".")) : null;
    const bitola = bitolaMatch ? parseFloat(bitolaMatch[1].replace(",", ".")) : null;

    let descricao = line
      .replace(/\b(circuito|circ\.?|c)\s*[-:]?\s*\d{1,3}\b/i, "")
      .replace(/(\d+(?:[.,]\d+)?)\s*a\b/i, "")
      .replace(/(\d+(?:[.,]\d+)?)\s*(?:mm2|mm²)/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!descricao) descricao = undefined;

    circuits.push({
      circuito,
      descricao,
      amperagem,
      bitola_mm2: bitola,
    });
  }

  const dedup = new Map<string, { circuito: string; descricao?: string; amperagem?: number | null; bitola_mm2?: number | null }>();
  for (const c of circuits) {
    if (!dedup.has(c.circuito)) dedup.set(c.circuito, c);
  }

  return Array.from(dedup.values());
}

function detectElectricalSignals(text: string) {
  const t = normalize(text);
  const signals: string[] = [];

  if (t.includes("quadro de cargas")) signals.push("quadro de cargas identificado");
  if (t.includes("quadro de distribuicao")) signals.push("quadro de distribuição identificado");
  if (t.includes("disjuntor")) signals.push("disjuntores identificados");
  if (t.includes("tomada")) signals.push("tomadas identificadas");
  if (t.includes("iluminacao")) signals.push("iluminação identificada");
  if (t.includes("chuveiro")) signals.push("chuveiro identificado");
  if (t.includes("ar condicionado")) signals.push("ar-condicionado identificado");
  if (t.includes("eletroduto")) signals.push("eletrodutos identificados");
  if (t.includes("cabo") || t.includes("condutor")) signals.push("cabos/condutores identificados");
  if (t.includes("tug")) signals.push("TUG identificada");
  if (t.includes("tue")) signals.push("TUE identificada");
  if (t.includes("dr")) signals.push("DR identificado");
  if (t.includes("dps")) signals.push("DPS identificado");

  return signals;
}

function inferConfidence(params: {
  circuitsCount: number;
  amperagensCount: number;
  bitolasCount: number;
  signalsCount: number;
  hasQuadroDeCargas: boolean;
}) {
  let score = 0;

  if (params.hasQuadroDeCargas) score += 35;
  if (params.circuitsCount >= 3) score += 30;
  else if (params.circuitsCount > 0) score += 20;
  if (params.amperagensCount > 0) score += 15;
  if (params.bitolasCount > 0) score += 10;
  if (params.signalsCount >= 3) score += 10;

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

    const body: ExtractElectricalRequest = await req.json();
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
      .in("page_class", ["eletrica", "quadro_de_cargas", "legenda"])
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
          error: "No electrical pages found",
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

    const normalizedText = normalize(mergedText);

    const amperagens = extractAmperagens(mergedText);
    const bitolas = extractBitolas(mergedText);
    const circuits = extractCircuitRows(mergedText);
    const circuitLabels = extractCircuitLabels(mergedText);

    const tugCount = countKeyword(normalizedText, /\btug\b/g);
    const tueCount = countKeyword(normalizedText, /\btue\b/g);
    const lightingPointsCount =
      countKeyword(normalizedText, /ponto[s]?\s+de\s+iluminacao/g) +
      countKeyword(normalizedText, /\biluminacao\b/g);

    const showerCount = countKeyword(normalizedText, /\bchuveiro\b/g);
    const acCount =
      countKeyword(normalizedText, /ar\s*condicionado/g) +
      countKeyword(normalizedText, /\bac\b/g);

    const disjuntorCount = countKeyword(normalizedText, /\bdisjuntor(?:es)?\b/g);
    const quadroCount =
      countKeyword(normalizedText, /quadro\s+de\s+distribuicao/g) +
      countKeyword(normalizedText, /\bqdlf?\b/g);

    const hasQuadroDeCargas = pages.some((p) => p.page_class === "quadro_de_cargas");
    const signals = detectElectricalSignals(mergedText);

    const confidence = inferConfidence({
      circuitsCount: Math.max(circuits.length, circuitLabels.length),
      amperagensCount: amperagens.length,
      bitolasCount: bitolas.length,
      signalsCount: signals.length,
      hasQuadroDeCargas,
    });

    const payload = {
      discipline: "electrical",
      analysis_id,
      document_id: document_id || null,
      pages_analyzed: pages.map((p) => ({
        id: p.id,
        page_number: p.page_number,
        page_class: p.page_class,
        confidence: p.classification_confidence,
      })),
      has_quadro_de_cargas: hasQuadroDeCargas,
      quadros_detectados: quadroCount,
      disjuntores_mencionados: disjuntorCount,
      circuitos_detectados: circuits,
      circuit_labels: circuitLabels,
      amperagens_detectadas: amperagens,
      bitolas_detectadas_mm2: bitolas,
      contagens_inferidas: {
        tug: tugCount,
        tue: tueCount,
        pontos_iluminacao: lightingPointsCount,
        chuveiros: showerCount,
        ar_condicionado: acCount,
      },
      signals,
      confidence,
      extracted_at: new Date().toISOString(),
    };

    const { error: runError } = await supabase
      .from("analysis_extraction_runs")
      .insert({
        analysis_id,
        document_id: document_id || pages[0]?.document_id || null,
        stage: "electrical_extraction",
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
    console.error("extract-electrical-signals error:", error);
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