import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Box, Upload, FileText, Loader2, CheckCircle, XCircle, ArrowLeft, Trash2, Camera, Receipt
} from "lucide-react";

interface InvoiceItem {
  nome_produto: string;
  quantidade: number;
  unidade_medida: string;
  valor_unitario: number;
  valor_total: number;
  categoria: string;
}

interface InvoiceData {
  fornecedor_nome: string | null;
  fornecedor_cnpj: string | null;
  numero_nota: string | null;
  valor_total: number;
  data_emissao: string | null;
  impostos_retidos: number;
  forma_pagamento: string | null;
  itens: InvoiceItem[];
}

export default function NotasFiscais() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<{ file: File; preview: string; base64: string; mime_type: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("");
  const [analyses, setAnalyses] = useState<{ id: string; nome_projeto: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load user analyses for linking
  useState(() => {
    if (!user) return;
    supabase
      .from("analyses")
      .select("id, nome_projeto")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setAnalyses(data);
      });
  });

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 3) {
      toast.error("Máximo de 3 imagens por nota fiscal");
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64Full = reader.result as string;
        const base64 = base64Full.split(",")[1];
        setImages((prev) => [
          ...prev,
          { file, preview: base64Full, base64, mime_type: file.type },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, [images.length]);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const processInvoice = async () => {
    if (!images.length) {
      toast.error("Adicione pelo menos uma imagem da nota fiscal");
      return;
    }

    setIsProcessing(true);
    setInvoiceData(null);
    setSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke("extract-invoice", {
        body: {
          images: images.map((img) => ({ base64: img.base64, mime_type: img.mime_type })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInvoiceData(data);
      toast.success("Nota fiscal processada com sucesso!");
    } catch (err: any) {
      console.error("Error processing invoice:", err);
      toast.error(err.message || "Erro ao processar nota fiscal");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToDatabase = async () => {
    if (!invoiceData || !selectedAnalysisId || !user) {
      toast.error("Selecione um projeto para vincular a nota fiscal");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Insert into contas_a_pagar
      const { error: contaError } = await supabase.from("contas_a_pagar").insert({
        analysis_id: selectedAnalysisId,
        user_id: user.id,
        fornecedor_nome: invoiceData.fornecedor_nome || "Não identificado",
        fornecedor_cnpj: invoiceData.fornecedor_cnpj,
        descricao: `NF ${invoiceData.numero_nota || "s/n"} - ${invoiceData.itens.length} itens`,
        valor_total: invoiceData.valor_total,
        data_emissao: invoiceData.data_emissao,
        status: "pendente",
        forma_pagamento: invoiceData.forma_pagamento,
        nota_fiscal_numero: invoiceData.numero_nota,
        impostos_retidos: invoiceData.impostos_retidos || 0,
      });

      if (contaError) throw contaError;

      // 2. Upsert into estoque_obra (sum quantity if exists)
      for (const item of invoiceData.itens) {
        // Check if item already exists
        const { data: existing } = await supabase
          .from("estoque_obra")
          .select("id, quantidade")
          .eq("analysis_id", selectedAnalysisId)
          .eq("user_id", user.id)
          .ilike("nome_produto", item.nome_produto)
          .maybeSingle();

        if (existing) {
          // Sum quantity
          await supabase
            .from("estoque_obra")
            .update({
              quantidade: Number(existing.quantidade) + item.quantidade,
              valor_unitario: item.valor_unitario,
              valor_total: (Number(existing.quantidade) + item.quantidade) * item.valor_unitario,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          // Insert new
          await supabase.from("estoque_obra").insert({
            analysis_id: selectedAnalysisId,
            user_id: user.id,
            nome_produto: item.nome_produto,
            categoria: item.categoria,
            quantidade: item.quantidade,
            unidade: item.unidade_medida,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            fornecedor: invoiceData.fornecedor_nome,
            nota_fiscal_ref: invoiceData.numero_nota,
          });
        }
      }

      setSaved(true);
      toast.success("Nota fiscal salva! Estoque e contas atualizados.");
    } catch (err: any) {
      console.error("Error saving invoice:", err);
      toast.error(err.message || "Erro ao salvar nota fiscal");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const categoryColors: Record<string, string> = {
    "Materiais Básicos": "bg-amber-100 text-amber-800",
    "Estrutura": "bg-red-100 text-red-800",
    "Alvenaria": "bg-orange-100 text-orange-800",
    "Hidráulica": "bg-blue-100 text-blue-800",
    "Elétrica": "bg-yellow-100 text-yellow-800",
    "Acabamento": "bg-purple-100 text-purple-800",
    "Pintura": "bg-pink-100 text-pink-800",
    "Cobertura": "bg-slate-100 text-slate-800",
    "Esquadrias": "bg-teal-100 text-teal-800",
    "Impermeabilização": "bg-cyan-100 text-cyan-800",
    "Louças e Metais": "bg-indigo-100 text-indigo-800",
    "Ferramentas": "bg-gray-100 text-gray-800",
    "Outros": "bg-gray-100 text-gray-600",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <Box className="h-6 w-6" />
            <span className="text-lg font-bold">Obra Link</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/nova-analise">Nova Análise</NavLink>
            <NavLink to="/notas-fiscais">Notas Fiscais</NavLink>
            <NavLink to="/sinapi">SINAPI</NavLink>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <Receipt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leitura de Notas Fiscais</h1>
            <p className="text-muted-foreground">
              Envie fotos de notas fiscais e a IA extrairá automaticamente os itens para o estoque e contas a pagar
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" /> Upload da Nota Fiscal
            </CardTitle>
            <CardDescription>
              Envie até 3 imagens (frente, verso, ou partes) — a IA lê mesmo tortas ou com baixa qualidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              {images.map((img, i) => (
                <div key={i} className="relative w-32 h-32 rounded-lg overflow-hidden border">
                  <img src={img.preview} alt={`NF ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {images.length < 3 && (
                <label className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary transition-colors text-muted-foreground">
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Adicionar</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    capture="environment"
                  />
                </label>
              )}
            </div>

            <Button onClick={processInvoice} disabled={!images.length || isProcessing} className="w-full sm:w-auto">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando com IA...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" /> Extrair Dados da Nota
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {invoiceData && (
          <div className="space-y-6">
            {/* Invoice Header */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" /> Dados Extraídos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Fornecedor</span>
                    <p className="font-medium">{invoiceData.fornecedor_nome || "Não identificado"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">CNPJ</span>
                    <p className="font-medium">{invoiceData.fornecedor_cnpj || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Nº da Nota</span>
                    <p className="font-medium">{invoiceData.numero_nota || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Data de Emissão</span>
                    <p className="font-medium">
                      {invoiceData.data_emissao
                        ? new Date(invoiceData.data_emissao + "T12:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Valor Total</span>
                    <p className="font-bold text-lg text-primary">{formatCurrency(invoiceData.valor_total)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Impostos Retidos</span>
                    <p className="font-medium">{formatCurrency(invoiceData.impostos_retidos)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Forma de Pagamento</span>
                    <p className="font-medium">{invoiceData.forma_pagamento || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Qtd. Itens</span>
                    <p className="font-medium">{invoiceData.itens.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Itens Extraídos ({invoiceData.itens.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead>Unid</TableHead>
                        <TableHead className="text-right">R$ Unit.</TableHead>
                        <TableHead className="text-right">R$ Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceData.itens.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium max-w-[200px] truncate">{item.nome_produto}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={categoryColors[item.categoria] || ""}>
                              {item.categoria}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell>{item.unidade_medida}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.valor_total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Save Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Salvar no Projeto</CardTitle>
                <CardDescription>
                  Vincule esta nota a um projeto para atualizar estoque e contas a pagar automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {saved ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      ✅ Nota fiscal salva! {invoiceData.itens.length} itens adicionados ao estoque e conta registrada em contas a pagar.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={selectedAnalysisId} onValueChange={setSelectedAnalysisId}>
                      <SelectTrigger className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Selecione um projeto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {analyses.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nome_projeto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={saveToDatabase} disabled={!selectedAnalysisId || isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                        </>
                      ) : (
                        "Salvar no Estoque e Contas"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
