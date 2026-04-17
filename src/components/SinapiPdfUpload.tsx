import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  onImported: () => void;
}

interface ParsedItem {
  codigo: string;
  descricao: string;
  unidade: string;
  preco_material: number | null;
  preco_mao_de_obra: number | null;
}

const MAX_PDF_MB = 50;

export function SinapiPdfUpload({ onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<"insumo" | "composicao">("insumo");
  const [regiao, setRegiao] = useState("");
  const [mesAno, setMesAno] = useState("");
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_PDF_MB * 1024 * 1024) {
      toast.error(`PDF excede ${MAX_PDF_MB}MB`);
      return;
    }
    setFile(f);
    setItems([]);
    setResult(null);
    setPageCount(null);
    setProgress(0);
    setStatusMsg("");
  };

  function pollJob(jobId: string) {
    if (pollRef.current) window.clearInterval(pollRef.current);
    let resuming = false;
    let lastProcessed = -1;
    let stuckTicks = 0;

    pollRef.current = window.setInterval(async () => {
      const { data, error } = await supabase
        .from("sinapi_parse_jobs" as any)
        .select("status, progress, total_pages, total_chunks, processed_chunks, items, error_message")
        .eq("id", jobId)
        .maybeSingle();
      if (error) return;
      if (!data) return;
      const job: any = data;
      setProgress(job.progress || 0);
      if (job.total_chunks) {
        setStatusMsg(`Analisando chunk ${job.processed_chunks}/${job.total_chunks} (${job.total_pages} páginas)`);
      } else {
        setStatusMsg("Extraindo texto do PDF...");
      }

      if (job.status === "completed") {
        if (pollRef.current) window.clearInterval(pollRef.current);
        const parsed = (job.items || []) as ParsedItem[];
        setItems(parsed);
        setPageCount(job.total_pages || null);
        setParsing(false);
        if (!parsed.length) toast.warning("Nenhum item válido foi extraído.");
        else toast.success(`${parsed.length} itens extraídos de ${job.total_pages} páginas`);
        return;
      }

      if (job.status === "failed") {
        if (pollRef.current) window.clearInterval(pollRef.current);
        setParsing(false);
        toast.error("Falha ao processar PDF: " + (job.error_message || "tente novamente"));
        return;
      }

      // Detecta job pausado (lote concluído, falta resumir) ou travado.
      if (job.processed_chunks === lastProcessed) {
        stuckTicks++;
      } else {
        stuckTicks = 0;
        lastProcessed = job.processed_chunks;
      }

      const shouldResume =
        !resuming &&
        (job.status === "paused" || (job.status === "processing" && stuckTicks >= 8));

      if (shouldResume) {
        resuming = true;
        setStatusMsg("Retomando processamento...");
        try {
          await supabase.functions.invoke("parse-sinapi-pdf", {
            body: { resume_job_id: jobId },
          });
        } catch (err) {
          console.error("Resume falhou:", err);
        } finally {
          stuckTicks = 0;
          // pequena espera antes de liberar próximo resume
          setTimeout(() => { resuming = false; }, 5000);
        }
      }
    }, 2500);
  }

  async function handleParse() {
    if (!file) return;
    if (!tipo) return toast.error("Selecione o tipo do documento");
    setParsing(true);
    setProgress(2);
    setStatusMsg("Enviando arquivo...");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo", tipo);

    try {
      const { data, error } = await supabase.functions.invoke("parse-sinapi-pdf", { body: fd });
      if (error) throw error;
      const jobId = (data as any)?.job_id;
      if (!jobId) throw new Error("Job não retornado");
      setStatusMsg("Processando em segundo plano...");
      pollJob(jobId);
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao iniciar análise: " + (err.message || "tente novamente"));
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!items.length || !file) return;
    setImporting(true);
    let success = 0;
    let errors = 0;
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const { error } = await supabase.from("referencia_sinapi" as any).upsert(
        batch.map((r) => ({
          codigo: r.codigo,
          descricao: r.descricao,
          unidade: r.unidade,
          preco_material: r.preco_material,
          preco_mao_de_obra: r.preco_mao_de_obra,
          regiao: regiao || null,
          mes_ano: mesAno || null,
          tipo,
          fonte_arquivo: file.name,
        })),
        { onConflict: "codigo" }
      );
      if (error) {
        errors += batch.length;
        console.error(error);
      } else {
        success += batch.length;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("sinapi_uploads" as any).insert({
        user_id: user.id,
        nome_arquivo: file.name,
        tipo,
        regiao: regiao || null,
        mes_ano: mesAno || null,
        qtd_itens: success,
        qtd_paginas: pageCount,
        status: errors === 0 ? "concluido" : "parcial",
      });
    }

    setResult({ success, errors });
    setImporting(false);
    if (errors === 0) toast.success(`${success} itens importados`);
    else toast.warning(`${success} importados, ${errors} com erro`);
    onImported();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Importar PDF SINAPI
        </CardTitle>
        <CardDescription>
          Envie o PDF oficial do SINAPI (até {MAX_PDF_MB}MB). A IA processa em segundo plano — você pode acompanhar o progresso aqui.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Tipo do documento *</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="insumo">Insumos</SelectItem>
                <SelectItem value="composicao">Composições</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado / Região</Label>
            <Input placeholder="SP, RJ, MG..." value={regiao} onChange={(e) => setRegiao(e.target.value.toUpperCase())} maxLength={4} />
          </div>
          <div className="space-y-2">
            <Label>Mês/Ano referência</Label>
            <Input placeholder="10/2025" value={mesAno} onChange={(e) => setMesAno(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Arquivo PDF</Label>
          <Input type="file" accept=".pdf,application/pdf" onChange={handleFileChange} disabled={parsing || importing} />
        </div>

        {file && !items.length && (
          <Button onClick={handleParse} disabled={parsing} className="w-full md:w-auto">
            {parsing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando em segundo plano...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" /> Analisar PDF com IA</>
            )}
          </Button>
        )}

        {parsing && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{statusMsg} — {progress}%</p>
          </div>
        )}

        {items.length > 0 && !result && (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium">{items.length} itens prontos para importar</span>
                {pageCount && <Badge variant="outline" className="text-xs">{pageCount} págs</Badge>}
                <Badge variant="secondary" className="text-xs capitalize">{tipo}</Badge>
              </div>
              <Button onClick={handleImport} disabled={importing} className="bg-emerald-600 hover:bg-emerald-700">
                {importing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Importar para a base</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pré-visualização dos 3 primeiros: {items.slice(0, 3).map((i) => i.codigo).join(", ")}...
            </p>
          </div>
        )}

        {result && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              {result.errors === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">Importação finalizada</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {result.success} itens importados{result.errors > 0 && `, ${result.errors} com erro`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
