import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";

/**
 * Standard SINAPI row mapped to the existing referencia_sinapi table.
 * The user-facing keys are the canonical ones requested in the spec
 * (codigo_item, descricao_item, etc.) and we re-map to the actual DB
 * columns at insert time.
 */
interface ParsedRow {
  codigo_item: string;
  descricao_item: string;
  unidade_medida: string;
  preco_material: number | null;
  preco_mao_obra: number | null;
}

const REQUIRED_KEYS: (keyof ParsedRow)[] = ["codigo_item", "descricao_item", "unidade_medida"];

// Map common header variants to our canonical keys.
const HEADER_MAP: Record<string, keyof ParsedRow> = {
  codigo: "codigo_item",
  código: "codigo_item",
  cod: "codigo_item",
  codigo_item: "codigo_item",
  "código do item": "codigo_item",
  descricao: "descricao_item",
  descrição: "descricao_item",
  descricao_item: "descricao_item",
  "descrição do item": "descricao_item",
  unidade: "unidade_medida",
  un: "unidade_medida",
  unidade_medida: "unidade_medida",
  "unidade de medida": "unidade_medida",
  preco_material: "preco_material",
  "preço material": "preco_material",
  material: "preco_material",
  preco_mao_obra: "preco_mao_obra",
  preco_mao_de_obra: "preco_mao_obra",
  "preço mão de obra": "preco_mao_obra",
  "mão de obra": "preco_mao_obra",
  mao_de_obra: "preco_mao_obra",
};

const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/\s+/g, " ");

const toNumber = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

const remapRow = (raw: Record<string, any>): ParsedRow | null => {
  const out: Partial<ParsedRow> = {};
  for (const [rawKey, val] of Object.entries(raw)) {
    const canonical = HEADER_MAP[normalizeHeader(rawKey)];
    if (!canonical) continue;
    if (canonical === "preco_material" || canonical === "preco_mao_obra") {
      out[canonical] = toNumber(val);
    } else {
      out[canonical] = String(val ?? "").trim() as any;
    }
  }
  if (!out.codigo_item || !out.descricao_item) return null;
  return {
    codigo_item: out.codigo_item,
    descricao_item: out.descricao_item,
    unidade_medida: out.unidade_medida || "un",
    preco_material: out.preco_material ?? null,
    preco_mao_obra: out.preco_mao_obra ?? null,
  };
};

interface Props {
  onImported?: (count: number) => void;
}

export function SinapiUploader({ onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState<"insumo" | "composicao">("insumo");
  const [regiao, setRegiao] = useState("");
  const [mesAno, setMesAno] = useState("");
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);

  const parseRecords = (records: Record<string, any>[]) => {
    if (!records.length) {
      toast.error("Arquivo vazio.");
      return;
    }
    const headers = Object.keys(records[0]).map(normalizeHeader);
    const mapped = headers.map((h) => HEADER_MAP[h]).filter(Boolean);
    const missing = REQUIRED_KEYS.filter((k) => !mapped.includes(k));
    if (missing.length) {
      setMissingHeaders(missing);
      toast.error(`Colunas obrigatórias ausentes: ${missing.join(", ")}`);
      setRows([]);
      return;
    }
    setMissingHeaders([]);
    const parsed = records.map(remapRow).filter((r): r is ParsedRow => r !== null);
    setRows(parsed);
    toast.success(`${parsed.length} linhas válidas detectadas`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setRows([]);
    setResult(null);
    setLoading(true);

    try {
      const ext = f.name.toLowerCase().split(".").pop();
      if (ext === "csv") {
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            parseRecords(res.data as Record<string, any>[]);
            setLoading(false);
          },
          error: (err) => {
            toast.error(`Erro CSV: ${err.message}`);
            setLoading(false);
          },
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
        parseRecords(json);
        setLoading(false);
      } else {
        toast.error("Formato não suportado. Use .csv, .xlsx ou .xls");
        setLoading(false);
      }
    } catch (err: any) {
      toast.error(`Falha ao ler: ${err.message || "arquivo inválido"}`);
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!rows.length || !file) return;
    setUploading(true);
    let ok = 0, failed = 0;
    const BATCH = 200;

    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH).map((r) => ({
          codigo: r.codigo_item,
          descricao: r.descricao_item,
          unidade: r.unidade_medida,
          preco_material: r.preco_material,
          preco_mao_de_obra: r.preco_mao_obra,
          regiao: regiao || null,
          mes_ano: mesAno || null,
          tipo,
          fonte_arquivo: file.name,
        }));
        const { error } = await supabase.from("referencia_sinapi").upsert(slice, { onConflict: "codigo" });
        if (error) {
          console.error(error);
          failed += slice.length;
        } else ok += slice.length;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("sinapi_uploads").insert({
          user_id: user.id,
          nome_arquivo: file.name,
          tipo,
          regiao: regiao || null,
          mes_ano: mesAno || null,
          qtd_itens: ok,
          status: failed === 0 ? "concluido" : "parcial",
        });
      }

      setResult({ ok, failed });
      onImported?.(ok);
      if (failed === 0) toast.success(`${ok} itens importados!`);
      else toast.warning(`${ok} importados, ${failed} com erro`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Ingestão SINAPI (CSV / XLSX)
        </CardTitle>
        <CardDescription>
          Parse client-side, sem IA. Cabeçalhos aceitos: codigo, descricao, unidade, preco_material, preco_mao_de_obra (e variantes em PT).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="insumo">Insumos</SelectItem>
                <SelectItem value="composicao">Composições</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Região (UF)</Label>
            <Input value={regiao} onChange={(e) => setRegiao(e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" />
          </div>
          <div className="space-y-2">
            <Label>Mês/Ano</Label>
            <Input value={mesAno} onChange={(e) => setMesAno(e.target.value)} placeholder="11/2024" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Arquivo (.csv, .xlsx, .xls) *</Label>
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} disabled={loading || uploading} />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lendo arquivo...
          </div>
        )}

        {missingHeaders.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div>
              Colunas obrigatórias ausentes: <strong>{missingHeaders.join(", ")}</strong>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-lg border p-3 flex items-center gap-2 text-sm">
            {result.failed === 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
            <span>{result.ok} importados {result.failed > 0 && `· ${result.failed} com erro`}</span>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{rows.length} linhas prontas</Badge>
            <Button onClick={handleUpload} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700">
              {uploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Importar {rows.length} itens</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
