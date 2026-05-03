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
  codigo: "codigo",
  código: "codigo",
  cod: "codigo",
  "código sinapi": "codigo",
  descricao: "descricao",
  descrição: "descricao",
  "descrição do insumo": "descricao",
  "descricao do insumo": "descricao",
  unidade: "unidade",
  un: "unidade",
  "unidade de medida": "unidade",
  tipo: "tipo",
  uf: "uf",
  estado: "uf",
  mes_ano: "mes_ano",
  "mes/ano": "mes_ano",
  "mês/ano": "mes_ano",
  competencia: "mes_ano",
  competência: "mes_ano",
  desonerado: "desonerado",
  preco_material: "preco_material",
  "preço material": "preco_material",
  material: "preco_material",
  preco_mao_de_obra: "preco_mao_de_obra",
  "preço mão de obra": "preco_mao_de_obra",
  "mão de obra": "preco_mao_de_obra",
  mao_de_obra: "preco_mao_de_obra",
  preco_total: "preco_total",
  "preço total": "preco_total",
  total: "preco_total",
};

const normalizeKey = (s: string) =>
  String(s).trim().toLowerCase().replace(/\s+/g, " ");

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Accept either JSON {file_base64, filename?, defaults?} or raw binary upload
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

    // Parse workbook
    const wb = XLSX.read(bytes, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return json({ error: "Workbook has no sheets" }, 400);
    const sheet = wb.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (!records.length) return json({ error: "Empty sheet" }, 400);

    // Map rows to schema
    const rows: Record<string, unknown>[] = [];
    const skipped: { row: number; reason: string }[] = [];

    records.forEach((raw, i) => {
      const mapped: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw)) {
        const canon = HEADER_MAP[normalizeKey(k)];
        if (!canon) continue;
        mapped[canon] = v;
      }

      const codigo = String(mapped.codigo ?? "").trim();
      const descricao = String(mapped.descricao ?? "").trim();
      if (!codigo || !descricao) {
        skipped.push({ row: i + 2, reason: "codigo ou descricao ausente" });
        return;
      }

      const uf = String(mapped.uf ?? defaults.uf ?? "").trim().toUpperCase();
      const mes_ano = String(mapped.mes_ano ?? defaults.mes_ano ?? "").trim();
      if (!uf || !mes_ano) {
        skipped.push({ row: i + 2, reason: "uf ou mes_ano ausente" });
        return;
      }

      const preco_material = toNumber(mapped.preco_material) ?? 0;
      const preco_mao_de_obra = toNumber(mapped.preco_mao_de_obra) ?? 0;
      const preco_total =
        toNumber(mapped.preco_total) ?? preco_material + preco_mao_de_obra;

      rows.push({
        codigo,
        descricao,
        unidade: mapped.unidade ? String(mapped.unidade).trim() : null,
        tipo: mapped.tipo ? String(mapped.tipo).trim() : (defaults.tipo ?? null),
        uf,
        mes_ano,
        desonerado:
          mapped.desonerado !== undefined
            ? toBool(mapped.desonerado)
            : toBool(defaults.desonerado),
        preco_material,
        preco_mao_de_obra,
        preco_total,
      });
    });

    if (!rows.length) {
      return json(
        { success: false, error: "Nenhuma linha válida encontrada", skipped },
        400,
      );
    }

    // Batch insert (500 per chunk)
    const BATCH = 500;
    let inserted = 0;
    const failures: { batchStart: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { error } = await supabase.from("sinapi_base_oficial").insert(slice);
      if (error) {
        console.error(`Batch ${i} failed:`, error.message);
        failures.push({ batchStart: i, error: error.message });
      } else {
        inserted += slice.length;
      }
    }

    return json({
      success: failures.length === 0,
      filename,
      total_rows_read: records.length,
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
