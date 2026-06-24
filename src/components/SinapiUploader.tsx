import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { loadXlsx } from "@/lib/lazyDeps";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ListChecks,
  XCircle,
  Database,
} from "lucide-react";

interface ParsedRow {
  codigo_item: string;
  descricao_item: string;
  unidade_medida: string;
  preco_material: number | null;
  preco_mao_obra: number | null;
}

interface InvalidRow {
  rowNumber: number;
  reason: string;
  raw: Record<string, any>;
}

const REQUIRED_KEYS: (keyof ParsedRow)[] = ["codigo_item", "descricao_item", "unidade_medida"];

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

type ParseStage = "idle" | "reading" | "mapping" | "validating" | "ready" | "error";

interface ParseStatus {
  stage: ParseStage;
  message: string;
  progress: number; // 0-100
}

interface UploadSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  inserted: number;
  updated: number;
  failed: number;
  durationMs: number;
}

interface Props {
  onImported?: (count: number) => void;
}

export function SinapiUploader({ onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([]);
  const [totalRowsRead, setTotalRowsRead] = useState(0);
  const [parseStatus, setParseStatus] = useState<ParseStatus>({ stage: "idle", message: "", progress: 0 });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tipo, setTipo] = useState<"insumo" | "composicao">("insumo");
  const [regiao, setRegiao] = useState("");
  const [mesAno, setMesAno] = useState("");
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);

  const resetState = () => {
    setRows([]);
    setInvalidRows([]);
    setTotalRowsRead(0);
    setSummary(null);
    setMissingHeaders([]);
    setUploadProgress(0);
  };

  const parseRecords = (records: Record<string, any>[]) => {
    setTotalRowsRead(records.length);
    if (!records.length) {
      setParseStatus({ stage: "error", message: "Arquivo vazio.", progress: 0 });
      toast.error("Arquivo vazio.");
      return;
    }

    setParseStatus({ stage: "mapping", message: "Mapeando colunas...", progress: 40 });
    const headers = Object.keys(records[0]).map(normalizeHeader);
    const mapped = headers.map((h) => HEADER_MAP[h]).filter(Boolean);
    const missing = REQUIRED_KEYS.filter((k) => !mapped.includes(k));
    if (missing.length) {
      setMissingHeaders(missing);
      setParseStatus({ stage: "error", message: `Colunas obrigatórias ausentes`, progress: 0 });
      toast.error(`Colunas obrigatórias ausentes: ${missing.join(", ")}`);
      setRows([]);
      return;
    }
    setMissingHeaders([]);

    setParseStatus({ stage: "validating", message: "Validando linhas...", progress: 70 });
    const valid: ParsedRow[] = [];
    const invalid: InvalidRow[] = [];

    records.forEach((raw, i) => {
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
      const reasons: string[] = [];
      if (!out.codigo_item) reasons.push("código vazio");
      if (!out.descricao_item) reasons.push("descrição vazia");
      if (out.preco_material === null && out.preco_mao_obra === null) {
        reasons.push("sem preço (material e M.O. vazios)");
      }
      if (reasons.length && (!out.codigo_item || !out.descricao_item)) {
        invalid.push({ rowNumber: i + 2, reason: reasons.join(", "), raw });
        return;
      }
      valid.push({
        codigo_item: out.codigo_item!,
        descricao_item: out.descricao_item!,
        unidade_medida: out.unidade_medida || "un",
        preco_material: out.preco_material ?? null,
        preco_mao_obra: out.preco_mao_obra ?? null,
      });
    });

    setRows(valid);
    setInvalidRows(invalid);
    setParseStatus({
      stage: "ready",
      message: `${valid.length} linhas válidas · ${invalid.length} ignoradas`,
      progress: 100,
    });
    toast.success(`${valid.length} linhas válidas detectadas`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    resetState();
    setParseStatus({ stage: "reading", message: `Lendo ${f.name}...`, progress: 15 });

    try {
      const ext = f.name.toLowerCase().split(".").pop();
      if (ext === "csv") {
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => parseRecords(res.data as Record<string, any>[]),
          error: (err) => {
            setParseStatus({ stage: "error", message: `Erro CSV: ${err.message}`, progress: 0 });
            toast.error(`Erro CSV: ${err.message}`);
          },
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await loadXlsx();
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
        parseRecords(json);
      } else {
        setParseStatus({ stage: "error", message: "Formato não suportado", progress: 0 });
        toast.error("Formato não suportado. Use .csv, .xlsx ou .xls");
      }
    } catch (err: any) {
      setParseStatus({ stage: "error", message: err.message || "arquivo inválido", progress: 0 });
      toast.error(`Falha ao ler: ${err.message || "arquivo inválido"}`);
    }
  };

  const handleUpload = async () => {
    if (!rows.length || !file) return;
    setUploading(true);
    setUploadProgress(0);
    setSummary(null);

    const startedAt = Date.now();
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const BATCH = 200;

    try {
      // Detect existing codes to differentiate insert vs update.
      const codes = rows.map((r) => r.codigo_item);
      const existing = new Set<string>();
      for (let i = 0; i < codes.length; i += 500) {
        const slice = codes.slice(i, i + 500);
        const { data } = await supabase
          .from("referencia_sinapi")
          .select("codigo")
          .in("codigo", slice);
        data?.forEach((d: any) => existing.add(d.codigo));
      }

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
        const { error } = await supabase
          .from("referencia_sinapi")
          .upsert(slice, { onConflict: "codigo" });
        if (error) {
          console.error(error);
          failed += slice.length;
        } else {
          slice.forEach((r) => {
            if (existing.has(r.codigo)) updated += 1;
            else inserted += 1;
          });
        }
        setUploadProgress(Math.round(((i + slice.length) / rows.length) * 100));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("sinapi_uploads").insert({
          user_id: user.id,
          nome_arquivo: file.name,
          tipo,
          regiao: regiao || null,
          mes_ano: mesAno || null,
          qtd_itens: inserted + updated,
          status: failed === 0 ? "concluido" : "parcial",
        });
      }

      const summary: UploadSummary = {
        totalRows: totalRowsRead,
        validRows: rows.length,
        invalidRows: invalidRows.length,
        inserted,
        updated,
        failed,
        durationMs: Date.now() - startedAt,
      };
      setSummary(summary);
      onImported?.(inserted + updated);
      if (failed === 0) toast.success(`${inserted + updated} itens processados!`);
      else toast.warning(`${inserted + updated} processados, ${failed} com erro`);
    } finally {
      setUploading(false);
    }
  };

  const stageColor: Record<ParseStage, string> = {
    idle: "bg-muted",
    reading: "bg-blue-500",
    mapping: "bg-blue-500",
    validating: "bg-amber-500",
    ready: "bg-emerald-600",
    error: "bg-destructive",
  };

  const stageLabel: Record<ParseStage, string> = {
    idle: "Aguardando arquivo",
    reading: "Lendo",
    mapping: "Mapeando",
    validating: "Validando",
    ready: "Pronto",
    error: "Erro",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Ingestão SINAPI (CSV / XLSX)
        </CardTitle>
        <CardDescription>
          Parse client-side com validação. Cabeçalhos aceitos: codigo, descricao, unidade, preco_material, preco_mao_de_obra (e variantes em PT).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Form fields */}
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
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            disabled={parseStatus.stage === "reading" || uploading}
          />
        </div>

        {/* Central status widget */}
        {(parseStatus.stage !== "idle" || file) && (
          <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{file?.name || "Nenhum arquivo"}</span>
              </div>
              <Badge
                className={`${stageColor[parseStatus.stage]} text-white border-transparent shrink-0`}
              >
                {parseStatus.stage === "reading" || parseStatus.stage === "mapping" || parseStatus.stage === "validating" ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : parseStatus.stage === "ready" ? (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                ) : parseStatus.stage === "error" ? (
                  <XCircle className="h-3 w-3 mr-1" />
                ) : null}
                {stageLabel[parseStatus.stage]}
              </Badge>
            </div>

            {parseStatus.stage !== "idle" && parseStatus.stage !== "error" && (
              <div className="space-y-1.5">
                <Progress value={parseStatus.progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{parseStatus.message}</span>
                  <span>{parseStatus.progress}%</span>
                </div>
              </div>
            )}

            {/* Validation summary chips */}
            {parseStatus.stage === "ready" && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded-lg border bg-muted/30 p-2.5 text-center">
                  <div className="text-xs text-muted-foreground">Lidas</div>
                  <div className="text-lg font-semibold tabular-nums">{totalRowsRead}</div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-center">
                  <div className="text-xs text-emerald-700">Válidas</div>
                  <div className="text-lg font-semibold text-emerald-700 tabular-nums">{rows.length}</div>
                </div>
                <div className={`rounded-lg border p-2.5 text-center ${invalidRows.length ? "border-amber-200 bg-amber-50" : "bg-muted/30"}`}>
                  <div className={`text-xs ${invalidRows.length ? "text-amber-700" : "text-muted-foreground"}`}>Inválidas</div>
                  <div className={`text-lg font-semibold tabular-nums ${invalidRows.length ? "text-amber-700" : ""}`}>
                    {invalidRows.length}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Missing headers alert */}
        {missingHeaders.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              Colunas obrigatórias ausentes: <strong>{missingHeaders.join(", ")}</strong>
            </div>
          </div>
        )}

        {/* Invalid rows preview */}
        {invalidRows.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-200 bg-amber-100/50">
              <ListChecks className="h-4 w-4 text-amber-700" />
              <span className="text-sm font-medium text-amber-900">
                {invalidRows.length} linhas ignoradas
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-amber-100">
              {invalidRows.slice(0, 10).map((r, i) => (
                <div key={i} className="px-3 py-1.5 text-xs flex items-center gap-3">
                  <span className="font-mono text-amber-700 shrink-0">L{r.rowNumber}</span>
                  <span className="text-amber-900">{r.reason}</span>
                </div>
              ))}
              {invalidRows.length > 10 && (
                <div className="px-3 py-2 text-xs text-amber-700 italic">
                  ... +{invalidRows.length - 10} adicionais
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Enviando para o banco...
              </span>
              <span className="tabular-nums text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Final summary */}
        {summary && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Resumo da atualização</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {(summary.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0">
              <div className="p-3">
                <div className="text-xs text-muted-foreground">Inseridos</div>
                <div className="text-xl font-bold text-emerald-600 tabular-nums">{summary.inserted}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-muted-foreground">Atualizados</div>
                <div className="text-xl font-bold text-blue-600 tabular-nums">{summary.updated}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-muted-foreground">Ignorados</div>
                <div className="text-xl font-bold text-amber-600 tabular-nums">{summary.invalidRows}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-muted-foreground">Falhas</div>
                <div className={`text-xl font-bold tabular-nums ${summary.failed ? "text-destructive" : "text-muted-foreground"}`}>
                  {summary.failed}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action button */}
        {rows.length > 0 && !summary && (
          <div className="flex items-center justify-between pt-1">
            <Badge variant="secondary">{rows.length} linhas prontas para envio</Badge>
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
