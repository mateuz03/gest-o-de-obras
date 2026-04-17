import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Box, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { SinapiPdfUpload } from "@/components/SinapiPdfUpload";
import { SinapiUploadHistory } from "@/components/SinapiUploadHistory";

interface SinapiRow {
  codigo: string;
  descricao: string;
  unidade: string;
  preco_material: number | null;
  preco_mao_de_obra: number | null;
  regiao: string;
  mes_ano: string;
}

export default function SinapiUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<SinapiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: number } | null>(null);
  const [tipo, setTipo] = useState<"insumo" | "composicao">("insumo");
  const [historyKey, setHistoryKey] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploadResult(null);
    setLoading(true);

    try {
      const data = await f.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const parsed: SinapiRow[] = rows
        .filter((r) => r["CODIGO"] || r["Codigo"] || r["codigo"] || r["COD"] || r["Cod"])
        .map((r) => ({
          codigo: String(r["CODIGO"] || r["Codigo"] || r["codigo"] || r["COD"] || r["Cod"] || "").trim(),
          descricao: String(r["DESCRICAO"] || r["Descricao"] || r["descricao"] || r["DESCRIÇÃO"] || r["Descrição"] || "").trim(),
          unidade: String(r["UNIDADE"] || r["Unidade"] || r["unidade"] || r["UN"] || r["Un"] || "").trim(),
          preco_material: parseFloat(String(r["PRECO_MATERIAL"] || r["Preco_Material"] || r["preco_material"] || r["MATERIAL"] || r["Material"] || 0)) || null,
          preco_mao_de_obra: parseFloat(String(r["PRECO_MAO_DE_OBRA"] || r["Preco_Mao_De_Obra"] || r["preco_mao_de_obra"] || r["MAO_DE_OBRA"] || r["Mao_De_Obra"] || 0)) || null,
          regiao: String(r["REGIAO"] || r["Regiao"] || r["regiao"] || r["UF"] || r["Uf"] || "").trim(),
          mes_ano: String(r["MES_ANO"] || r["Mes_Ano"] || r["mes_ano"] || r["REFERENCIA"] || r["Referencia"] || "").trim(),
        }))
        .filter((r) => r.codigo && r.descricao);

      setParsedData(parsed);
      toast.success(`${parsed.length} itens encontrados na planilha`);
    } catch (err: any) {
      toast.error("Erro ao ler planilha: " + (err.message || "formato inválido"));
      setParsedData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!parsedData.length || !file) return;
    setUploading(true);
    let success = 0;
    let errors = 0;

    const batchSize = 100;
    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize);
      const { error } = await supabase.from("referencia_sinapi" as any).upsert(
        batch.map((r) => ({
          codigo: r.codigo,
          descricao: r.descricao,
          unidade: r.unidade,
          preco_material: r.preco_material,
          preco_mao_de_obra: r.preco_mao_de_obra,
          regiao: r.regiao,
          mes_ano: r.mes_ano,
          tipo,
          fonte_arquivo: file.name,
        })),
        { onConflict: "codigo" }
      );
      if (error) {
        errors += batch.length;
        console.error("Batch error:", error);
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
        regiao: parsedData[0]?.regiao || null,
        mes_ano: parsedData[0]?.mes_ano || null,
        qtd_itens: success,
        status: errors === 0 ? "concluido" : "parcial",
      });
    }

    setUploadResult({ success, errors });
    setUploading(false);
    setHistoryKey((k) => k + 1);
    if (errors === 0) toast.success(`${success} itens importados com sucesso!`);
    else toast.warning(`${success} importados, ${errors} com erro`);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-primary text-primary-foreground">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-primary-foreground hover:bg-primary-foreground/10">
            <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
          </Button>
          <div className="flex items-center gap-2 font-bold">
            <Box className="h-5 w-5" />
            Base SINAPI
          </div>
        </div>
      </nav>

      <div className="container max-w-5xl py-8 space-y-6">
        <Tabs defaultValue="pdf" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="pdf" className="gap-2"><FileText className="h-4 w-4" /> PDF Oficial</TabsTrigger>
            <TabsTrigger value="excel" className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Planilha Excel</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="mt-4">
            <SinapiPdfUpload onImported={() => setHistoryKey((k) => k + 1)} />
          </TabsContent>

          <TabsContent value="excel" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Importar Planilha SINAPI (.xlsx / .csv)
                </CardTitle>
                <CardDescription>
                  Colunas esperadas: CODIGO, DESCRICAO, UNIDADE, PRECO_MATERIAL, PRECO_MAO_DE_OBRA, REGIAO, MES_ANO.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <Label>Arquivo da planilha</Label>
                    <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} disabled={loading} />
                  </div>
                </div>

                {loading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Lendo planilha...
                  </div>
                )}

                {uploadResult && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      {uploadResult.errors === 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      <span className="font-medium">Resultado da importação</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {uploadResult.success} itens importados com sucesso
                      {uploadResult.errors > 0 && `, ${uploadResult.errors} com erro`}
                    </p>
                  </div>
                )}

                {parsedData.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{parsedData.length} itens encontrados</Badge>
                      <Button onClick={handleUpload} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700">
                        {uploading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
                        ) : (
                          <><Upload className="mr-2 h-4 w-4" /> Importar para o banco</>
                        )}
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead className="text-right">Material R$</TableHead>
                            <TableHead className="text-right">M.O. R$</TableHead>
                            <TableHead>Região</TableHead>
                            <TableHead>Ref.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.slice(0, 20).map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                              <TableCell className="text-sm max-w-[300px] truncate">{r.descricao}</TableCell>
                              <TableCell className="text-xs">{r.unidade}</TableCell>
                              <TableCell className="text-right text-sm">{r.preco_material?.toFixed(2) || "—"}</TableCell>
                              <TableCell className="text-right text-sm">{r.preco_mao_de_obra?.toFixed(2) || "—"}</TableCell>
                              <TableCell className="text-xs">{r.regiao}</TableCell>
                              <TableCell className="text-xs">{r.mes_ano}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {parsedData.length > 20 && (
                        <p className="p-3 text-xs text-muted-foreground text-center">
                          Mostrando 20 de {parsedData.length} itens. Todos serão importados.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <SinapiUploadHistory refreshKey={historyKey} />
      </div>
    </div>
  );
}
