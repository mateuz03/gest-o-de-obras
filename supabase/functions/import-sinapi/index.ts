// Edge Function: import-sinapi
// Receives an XLSX file (base64) and bulk-inserts rows into sinapi_base_oficial.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Map possible header variants -> canonical schema keys
const HEADER_MAP: Record<string, string> = {
  // codigo
  "codigo": "codigo",
  "código": "codigo",
  "cod": "codigo",
  "código sinapi": "codigo",
  "código do insumo": "codigo",
  "codigo do insumo": "codigo",
  "código da composição": "codigo",
  "codigo da composicao": "codigo",
  // descricao
  "descricao": "descricao",
  "descrição": "descricao",
  "descrição do insumo": "descricao",
  "descricao do insumo": "descricao",
  "descrição da composição": "descricao",
  // unidade
  "unidade": "unidade",
  "un": "unidade",
  "unidade de medida": "unidade",
  // tipo / classificação
  "tipo": "tipo",
  "classificação": "tipo",
  "classificacao": "tipo",
  // uf
  "uf": "uf",
  "estado": "uf",
  // mes_ano
  "mes_ano": "mes_ano",
  "mes/ano": "mes_ano",
  "mês/ano": "mes_ano",
  "competencia": "mes_ano",
  "competência": "mes_ano",
  // desonerado
  "desonerado": "desonerado",
  // preço material
  "preco_material": "preco_material",
  "preço material": "preco_material",
  "material": "preco_material",
  // preço mão de obra
  "preco_mao_de_obra": "preco_mao_de_obra",
  "preço mão de obra": "preco_mao_de_obra",
  "mão de obra": "preco_mao_de_obra",
  "mao_de_obra": "preco_mao_de_obra",
};

// Brazilian state codes (UF) — used to detect the "price by state" column
const UF_CODES = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]);

const normalizeKey = (s: unknown) =>
  String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

// PT-BR price sanitizer: "4.194,52" -> 4194.52, empty/invalid -> 0
const sanitizePrice = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  const raw = String(v).trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const sanitizeText = (v: unknown): string => String(v ?? "").trim().toUpperCase();

const toBool = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return ["sim", "s", "true", "1", "desonerado", "yes", "y"].includes(s);
};

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Find the row index that contains the real headers ("Código do Insumo" or similar).
 * Returns the 0-based row index inside the AOA matrix.
 */
function findHeaderRow(matrix: unknown[][]): number {
  const MAX_SCAN = Math.min(matrix.length, 30);
  for (let i = 0; i < MAX_SCAN; i++) {
    const row = matrix[i] || [];
    const cells = row.map((c) => normalizeKey(c));
    const hasCodigo = cells.some(
      (c) => c === "código do insumo" || c === "codigo do insumo" || c === "código da composição" || c === "codigo da composicao",
    );
    const hasDescricao = cells.some(
      (c) => c === "descrição do insumo" || c === "descricao do insumo" || c === "descrição da composição",
    );
    if (hasCodigo && hasDescricao) return i;
  }
  // Fallback: any row containing "código" + "descrição" + "unidade"
  for (let i = 0; i < MAX_SCAN; i++) {
    const cells = (matrix[i] || []).map((c) => normalizeKey(c));
    if (
      cells.some((c) => c.startsWith("código") || c.startsWith("codigo")) &&
      cells.some((c) => c.startsWith("descrição") || c.startsWith("descricao")) &&
      cells.some((c) => c === "unidade" || c === "un")
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Detect the price column index. SINAPI insumo sheets put the price under the UF
 * code (e.g. "SP", "RJ"), often as the last column. Returns -1 if not found.
 */
function findPriceColumnIndex(headers: string[], defaultUf?: string): number {
  const norm = headers.map((h) => normalizeKey(h).toUpperCase());

  // 1) Match the requested UF column exactly
  if (defaultUf) {
    const ufUp = defaultUf.trim().toUpperCase();
    const idx = norm.indexOf(ufUp);
    if (idx >= 0) return idx;
  }

  // 2) Last column whose header is a UF code
  for (let i = norm.length - 1; i >= 0; i--) {
    if (UF_CODES.has(norm[i])) return i;
  }

  // 3) Headers like "preço" / "preço médio" / "valor"
  for (let i = norm.length - 1; i >= 0; i--) {
    const h = norm[i].toLowerCase();
    if (h.includes("preço") || h.includes("preco") || h === "valor" || h.includes("valor")) {
      return i;
    }
  }

  return -1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    let bytes: Uint8Array;
    let filename = "upload.xlsx";
    let defaults: Record<string, unknown> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body?.file_base64) return json({ error: "file_base64 is required" }, 400);
      bytes = decodeBase64(body.file_base64);
      filename = body.filename || filename;
      defaults = body.defaults || {};
    } else {
      const buf = await req.arrayBuffer();
      bytes = new Uint8Array(buf);
    }

    if (!bytes.length) return json({ error: "Empty file" }, 400);

    const wb = XLSX.read(bytes, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return json({ error: "Workbook has no sheets" }, 400);
    const sheet = wb.Sheets[sheetName];

    // Read as array-of-arrays so we can locate the real header row (SINAPI files
    // include several metadata rows before the table actually starts).
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (!matrix.length) return json({ error: "Empty sheet" }, 400);

    const headerRowIdx = findHeaderRow(matrix);
    if (headerRowIdx < 0) {
      return json(
        {
          success: false,
          error:
            "Não foi possível localizar a linha de cabeçalho (esperado: 'Código do Insumo' / 'Descrição do Insumo').",
        },
        400,
      );
    }

    const headerRow = (matrix[headerRowIdx] || []).map((h) => String(h ?? ""));
    const dataRows = matrix.slice(headerRowIdx + 1);

    // Build column index map for canonical fields
    const canonicalIdx: Record<string, number> = {};
    headerRow.forEach((h, i) => {
      const canon = HEADER_MAP[normalizeKey(h)];
      if (canon && canonicalIdx[canon] === undefined) canonicalIdx[canon] = i;
    });

    // Locate the price column (last UF column or matching defaults.uf)
    const priceColIdx = findPriceColumnIndex(headerRow, String(defaults.uf ?? ""));

    const codigoIdx = canonicalIdx.codigo;
    const descricaoIdx = canonicalIdx.descricao;
    if (codigoIdx === undefined || descricaoIdx === undefined) {
      return json(
        {
          success: false,
          error: "Colunas obrigatórias 'Código do Insumo' e 'Descrição do Insumo' não encontradas.",
          headers: headerRow,
        },
        400,
      );
    }

    const rows: Record<string, unknown>[] = [];
    const skipped: { row: number; reason: string }[] = [];

    dataRows.forEach((raw, i) => {
      const excelRow = headerRowIdx + 2 + i; // 1-based with header offset
      const codigo = sanitizeText(raw[codigoIdx]);
      const descricao = sanitizeText(raw[descricaoIdx]);
      if (!codigo || !descricao) {
        if (rows.length > 0) {
          skipped.push({ row: excelRow, reason: "codigo ou descricao ausente" });
        }
        return;
      }

      const uf = sanitizeText(
        canonicalIdx.uf !== undefined ? raw[canonicalIdx.uf] : defaults.uf ?? "",
      );
      const mes_ano = String(
        canonicalIdx.mes_ano !== undefined ? raw[canonicalIdx.mes_ano] : defaults.mes_ano ?? "",
      ).trim();
      if (!uf || !mes_ano) {
        skipped.push({ row: excelRow, reason: "uf ou mes_ano ausente" });
        return;
      }

      let precoMaterialRaw: unknown = null;
      if (priceColIdx >= 0) precoMaterialRaw = raw[priceColIdx];
      else if (canonicalIdx.preco_material !== undefined) {
        precoMaterialRaw = raw[canonicalIdx.preco_material];
      }
      const preco_material = sanitizePrice(precoMaterialRaw);
      const preco_mao_de_obra =
        canonicalIdx.preco_mao_de_obra !== undefined
          ? sanitizePrice(raw[canonicalIdx.preco_mao_de_obra])
          : 0;

      const tipoVal =
        canonicalIdx.tipo !== undefined ? sanitizeText(raw[canonicalIdx.tipo]) : "";
      const unidadeVal =
        canonicalIdx.unidade !== undefined ? sanitizeText(raw[canonicalIdx.unidade]) : "";
      const tipoDefault = defaults.tipo ? sanitizeText(defaults.tipo) : "";

      // NOTE: preco_total is a GENERATED column in the database.
      rows.push({
        codigo,
        descricao,
        unidade: unidadeVal || null,
        tipo: tipoVal || tipoDefault || null,
        uf,
        mes_ano,
        desonerado:
          canonicalIdx.desonerado !== undefined
            ? toBool(raw[canonicalIdx.desonerado])
            : toBool(defaults.desonerado),
        preco_material,
        preco_mao_de_obra,
      });
    });

    if (!rows.length) {
      return json(
        {
          success: false,
          error: "Nenhuma linha válida encontrada",
          header_row_index: headerRowIdx + 1,
          detected_headers: headerRow,
          price_column_index: priceColIdx,
          skipped: skipped.slice(0, 20),
        },
        400,
      );
    }

    // Batch insert (500 per chunk)
    const BATCH = 500;
    let inserted = 0;
    const failures: {
      batchStart: number;
      message: string;
      details?: string;
      hint?: string;
      code?: string;
      sample_row?: Record<string, unknown>;
    }[] = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      try {
        const { error } = await supabase.from("sinapi_base_oficial").insert(slice);
        if (error) {
          console.error(`Batch ${i} failed:`, {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
            sample_row: slice[0],
          });
          failures.push({
            batchStart: i,
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
            sample_row: slice[0],
          });
        } else {
          inserted += slice.length;
        }
      } catch (e: any) {
        console.error(`Batch ${i} threw:`, e);
        failures.push({
          batchStart: i,
          message: e?.message || "unknown error",
          details: e?.details,
          sample_row: slice[0],
        });
      }
    }

    return json({
      success: failures.length === 0,
      filename,
      header_row_index: headerRowIdx + 1,
      detected_headers: headerRow,
      price_column_header: priceColIdx >= 0 ? headerRow[priceColIdx] : null,
      total_rows_read: dataRows.length,
      total_mapped: rows.length,
      inserted,
      skipped_count: skipped.length,
      skipped: skipped.slice(0, 20),
      failures,
    });
  } catch (err) {
    console.error("import-sinapi error:", err);
    return json({ success: false, error: (err as Error).message }, 500);
  }
});
