import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Loader2, FileSpreadsheet, ShieldAlert, CheckCircle2 } from "lucide-react";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export default function AdminSinapiImport() {
  const { user } = useAuth();
  const { isAdmin, isAdminLoading } = useAdminRole(user?.id);
  const [file, setFile] = useState<File | null>(null);
  const [uf, setUf] = useState("");
  const [mesAno, setMesAno] = useState("");
  const [desonerado, setDesonerado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const onSelectFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Apenas arquivos .xlsx são aceitos");
      return;
    }
    setFile(f);
  };

  const reset = () => {
    setFile(null);
    setUf("");
    setMesAno("");
    setDesonerado(false);
    setProgress(0);
  };

  const validate = () => {
    if (!file) return "Selecione um arquivo .xlsx";
    if (!uf) return "Selecione o Estado (UF)";
    if (!/^\d{4}-\d{2}$/.test(mesAno)) return "Mês/Ano deve estar no formato YYYY-MM";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }

    setLoading(true);
    setProgress(10);
    setLastResult(null);

    try {
      setProgress(25);
      const file_base64 = await fileToBase64(file!);
      setProgress(55);

      const { data, error } = await supabase.functions.invoke("import-sinapi", {
        body: {
          file_base64,
          filename: file!.name,
          defaults: { uf, mes_ano: mesAno, desonerado },
        },
      });
      setProgress(95);

      if (error) throw error;
      if (data?.success === false) throw new Error(data?.error || "Falha na importação");

      setProgress(100);
      setLastResult(data);
      toast.success(`Importação concluída! ${data?.inserted ?? 0} linhas inseridas.`);
      reset();
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro: ${e?.message || "Falha ao importar"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1500);
    }
  };

  if (isAdminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso restrito</AlertTitle>
          <AlertDescription>
            Esta página é exclusiva para administradores.{" "}
            <Link to="/dashboard" className="underline">Voltar ao painel</Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Importação Manual - Base SINAPI</h1>
          <p className="text-muted-foreground mt-1">
            Envie planilhas oficiais SINAPI (.xlsx) para popular a base de referência.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Upload de planilha
            </CardTitle>
            <CardDescription>
              Os campos abaixo serão usados como padrão (defaults) caso o arquivo não os contenha.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                onSelectFile(e.dataTransfer.files?.[0] || null);
              }}
              className={`rounded-xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
              }`}
              onClick={() => document.getElementById("xlsx-input")?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-slate-400 mb-2" />
              <p className="font-medium text-slate-700">
                Arraste o arquivo .xlsx ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Apenas arquivos Excel (.xlsx)
              </p>
              <Input
                id="xlsx-input"
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => onSelectFile(e.target.files?.[0] || null)}
              />
              {file && (
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700 bg-white border rounded-lg px-3 py-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado (UF) *</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mês/Ano *</Label>
                <Input
                  placeholder="YYYY-MM (ex: 2025-03)"
                  value={mesAno}
                  onChange={(e) => setMesAno(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="desonerado"
                checked={desonerado}
                onCheckedChange={(v) => setDesonerado(!!v)}
              />
              <Label htmlFor="desonerado" className="cursor-pointer">
                Versão Desonerada?
              </Label>
            </div>

            {/* Progress */}
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Processando importação...
                  </span>
                  <span className="tabular-nums text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Last result */}
            {lastResult && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="text-emerald-900">Importação concluída</AlertTitle>
                <AlertDescription className="text-emerald-800 text-sm">
                  Inseridos: <strong>{lastResult.inserted}</strong> · Lidas:{" "}
                  <strong>{lastResult.total_rows_read}</strong> · Ignoradas:{" "}
                  <strong>{lastResult.skipped_count}</strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSubmit}
                disabled={loading || !file}
                className="bg-emerald-600 hover:bg-emerald-700"
                size="lg"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Iniciar Importação</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
