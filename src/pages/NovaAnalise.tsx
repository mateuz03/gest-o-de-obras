import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ArrowLeft, Box, Loader2, FileImage, Save, ChevronRight, MapPin, Ruler, Settings2, Lightbulb, CheckCircle2, X, Plus, DollarSign, Camera, FileText, Home, Layers } from "lucide-react";

const TIPO_LABELS: Record<string, string> = {
  casa_terrea: "Casa Térrea",
  sobrado: "Sobrado",
  apartamento: "Apartamento",
  comercial: "Comercial",
};

const ESCALA_LABELS: Record<string, string> = {
  "1:25": "1:25",
  "1:50": "1:50",
  "1:75": "1:75",
  "1:100": "1:100",
  "1:200": "1:200",
};

const MAX_FILES = 5;

type AnalysisMode = "planta" | "foto_ambiente";

const MODE_CONFIG = {
  planta: {
    title: "Upload da Planta Baixa",
    description: `Envie até ${MAX_FILES} arquivos (JPG, PNG, PDF) ou DWG para uma análise mais completa`,
    dropText: "Arraste as plantas aqui ou clique para selecionar",
    dropSubtext: `Até ${MAX_FILES} arquivos — JPG, PNG, PDF ou DWG (máx. 20MB cada / DWG até 50MB)`,
    loadingText: "A IA está analisando suas plantas, identificando dimensões e calculando o orçamento completo com referência SINAPI.",
  },
  foto_ambiente: {
    title: "Fotos do Ambiente",
    description: `Envie até ${MAX_FILES} fotos reais do ambiente para análise de materiais e medidas`,
    dropText: "Arraste as fotos do ambiente aqui ou clique para selecionar",
    dropSubtext: `Até ${MAX_FILES} fotos — JPG, PNG (máx. 20MB cada). Dica: inclua uma trena ou objeto de referência na foto.`,
    loadingText: "A IA está analisando as fotos do ambiente, identificando materiais, estimando dimensões e calculando o orçamento.",
  },
};

export default function NovaAnalise() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AnalysisMode | null>(null);
  const [step, setStep] = useState(0); // 0 = mode selection
  const [files, setFiles] = useState<File[]>([]);
  const [dwgFile, setDwgFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nome_projeto: "",
    escala: "",
    tipo_construcao: "casa_terrea",
    regiao: "",
    bdi_percentual: "25",
    instrucoes_adicionais: "",
    area_m2: "",
    pe_direito: "2.80",
    num_pavimentos: "1",
    padrao_acabamento: "medio",
    tipo_fundacao: "",
    tipo_cobertura: "",
    num_quartos: "",
    num_banheiros: "",
    num_vagas: "",
  });

  const isDwg = (f: File) => f.name.toLowerCase().endsWith(".dwg");

  const addFile = useCallback((f: File) => {
    if (isDwg(f)) {
      if (mode === "foto_ambiente") { toast.error("Arquivos DWG não são aceitos no modo Foto do Ambiente"); return; }
      if (f.size > 50 * 1024 * 1024) { toast.error("Arquivo DWG máximo de 50MB"); return; }
      setDwgFile(f);
      toast.success("Arquivo DWG anexado! Envie também imagens ou PDFs para a IA analisar.");
      return;
    }
    if (mode === "foto_ambiente") {
      if (!f.type.startsWith("image/")) { toast.error("No modo Foto do Ambiente, envie apenas imagens (JPG, PNG)"); return; }
    } else {
      if (!f.type.startsWith("image/") && f.type !== "application/pdf") { toast.error("Envie imagens (JPG, PNG), PDF ou DWG"); return; }
    }
    if (f.size > 20 * 1024 * 1024) { toast.error("Cada arquivo pode ter no máximo 20MB"); return; }

    setFiles(prev => {
      if (prev.length >= MAX_FILES) { toast.error(`Máximo de ${MAX_FILES} arquivos`); return prev; }
      const next = [...prev, f];
      // Generate preview
      if (f.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviews(p => { const n = [...p]; n[next.length - 1] = e.target?.result as string; return n; });
        reader.readAsDataURL(f);
      } else {
        setPreviews(p => [...p, null]);
      }
      return next;
    });
  }, [mode]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(f => addFile(f));
  }, [addFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(f => addFile(f));
    }
    e.target.value = "";
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome_projeto.trim() || formData.nome_projeto.trim().length < 3)
      newErrors.nome_projeto = "Nome do projeto deve ter pelo menos 3 caracteres";
    if (formData.nome_projeto.trim().length > 100)
      newErrors.nome_projeto = "Nome do projeto deve ter no máximo 100 caracteres";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validate()) setShowSummary(true); };

  const handleSaveDraft = async () => {
    if (!files.length || !user) return;
    setSavingDraft(true);
    try {
      const firstFile = files[0];
      const ext = firstFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      await supabase.storage.from("blueprints").upload(path, firstFile);
      const { data: urlData } = supabase.storage.from("blueprints").getPublicUrl(path);

      if (dwgFile) {
        const dwgPath = `${user.id}/${Date.now()}.dwg`;
        await supabase.storage.from("blueprints").upload(dwgPath, dwgFile);
      }

      await supabase.from("analyses").insert({
        user_id: user.id,
        nome_projeto: formData.nome_projeto || "Rascunho sem título",
        imagem_url: urlData.publicUrl,
        escala: formData.escala || null,
        tipo_construcao: formData.tipo_construcao,
        regiao: formData.regiao || null,
        status: "pending",
      });
      toast.success("Rascunho salvo!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar rascunho");
    } finally {
      setSavingDraft(false);
    }
  };

  const fileToBase64 = (f: File): Promise<{ base64: string; mime_type: string }> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ base64: result.split(",")[1], mime_type: f.type });
      };
      reader.readAsDataURL(f);
    });

  const handleSubmit = async () => {
    if (!files.length || !user) return;
    if (!validate()) return;
    setLoading(true);
    setShowSummary(false);

    try {
      // Upload first file for storage reference
      const firstFile = files[0];
      const ext = firstFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      await supabase.storage.from("blueprints").upload(path, firstFile);
      const { data: urlData } = supabase.storage.from("blueprints").getPublicUrl(path);

      if (dwgFile) {
        const dwgPath = `${user.id}/${Date.now()}.dwg`;
        await supabase.storage.from("blueprints").upload(dwgPath, dwgFile);
      }

      // Convert all image/pdf files to base64
      const imageFiles = files.filter(f => !isDwg(f));
      const images = await Promise.all(imageFiles.map(fileToBase64));

      const bdiValue = parseFloat(formData.bdi_percentual) || 25;

      const { data: analysis, error: insertErr } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          nome_projeto: formData.nome_projeto || "Análise sem título",
          imagem_url: urlData.publicUrl,
          escala: formData.escala || null,
          tipo_construcao: formData.tipo_construcao,
          regiao: formData.regiao || null,
          bdi_percentual: bdiValue,
          status: "processing",
        } as any)
        .select()
        .single();
      if (insertErr) throw insertErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke("analyze-blueprint", {
        body: {
          images,
          escala: formData.escala,
          tipo_construcao: formData.tipo_construcao,
          regiao: formData.regiao,
          bdi_percentual: bdiValue,
          instrucoes_adicionais: formData.instrucoes_adicionais,
          modo_analise: mode,
        },
      });

      if (fnErr) throw fnErr;

      const totalGeral = result?.resumo_final?.total_geral ? parseFloat(String(result.resumo_final.total_geral)) : null;

      await supabase
        .from("analyses")
        .update({ resultado_json: result, status: "completed", total_estimado: totalGeral } as any)
        .eq("id", (analysis as any).id);

      toast.success("Análise concluída!");
      navigate(`/analise/${(analysis as any).id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao processar análise");
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-8">
      <nav className="border-b bg-primary text-primary-foreground">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-primary-foreground hover:bg-primary-foreground/10">
            <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
          <div className="flex items-center gap-2 font-bold">
            <Box className="h-5 w-5" />
            Nova Análise
          </div>
        </div>
      </nav>

      <div className="container max-w-2xl py-8">
        {/* Step indicators */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[0, 1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s + 1}</div>
              <span className={`text-sm hidden sm:inline ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                {s === 0 ? "Modo" : s === 1 ? "Upload" : "Detalhes"}
              </span>
              {s < 2 && <div className={`h-px w-8 sm:w-12 ${step > s ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Mode Selection */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Análise</CardTitle>
              <CardDescription>Escolha como deseja enviar os dados do projeto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => { setMode("planta"); setStep(1); }}
                  className="group relative flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 text-left transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-semibold">Planta Baixa</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Envie plantas baixas, cortes ou projetos técnicos (JPG, PNG, PDF, DWG)
                  </p>
                </button>
                <button
                  onClick={() => { setMode("foto_ambiente"); setStep(1); }}
                  className="group relative flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 text-left transition-all hover:border-accent hover:bg-accent/5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    <Camera className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-semibold">Foto do Ambiente</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Envie fotos reais do ambiente para análise de materiais e medidas estimadas
                  </p>
                  <span className="absolute top-3 right-3 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase">Novo</span>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && mode && (
          <Card>
            <CardHeader>
              <CardTitle>{MODE_CONFIG[mode].title}</CardTitle>
              <CardDescription>{MODE_CONFIG[mode].description}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* File grid */}
              {files.length > 0 && (
                <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {files.map((f, i) => (
                    <div key={i} className="relative rounded-lg border bg-muted/30 p-2 group">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() => removeFile(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {previews[i] ? (
                        <img src={previews[i]!} alt={f.name} className="h-24 w-full rounded object-cover" />
                      ) : (
                        <div className="flex h-24 items-center justify-center">
                          <FileImage className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <p className="mt-1 truncate text-xs text-muted-foreground">{f.name}</p>
                    </div>
                  ))}
                  {files.length < MAX_FILES && (
                    <div
                      className="flex h-full min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                      onClick={() => document.getElementById("file-input")?.click()}
                    >
                      <Plus className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
                    </div>
                  )}
                </div>
              )}

              {files.length === 0 && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  {mode === "foto_ambiente" ? <Camera className="mb-3 h-12 w-12 text-muted-foreground/50" /> : <Upload className="mb-3 h-12 w-12 text-muted-foreground/50" />}
                  <p className="font-medium">{mode ? MODE_CONFIG[mode].dropText : ""}</p>
                  <p className="text-sm text-muted-foreground text-center px-4">{mode ? MODE_CONFIG[mode].dropSubtext : ""}</p>
                  {mode === "foto_ambiente" && (
                    <div className="mt-4 rounded-lg bg-accent/10 px-4 py-2 text-xs text-accent max-w-sm text-center">
                      💡 Para medidas mais precisas, coloque uma trena aberta ou folha A4 no chão como referência de escala
                    </div>
                  )}
                </div>
              )}

              <input
                id="file-input"
                type="file"
                accept={mode === "foto_ambiente" ? "image/*" : "image/*,.pdf,.dwg"}
                multiple
                className="hidden"
                onChange={handleFileInput}
              />

              {dwgFile && mode === "planta" && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                  <FileImage className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{dwgFile.name}</p>
                    <p className="text-xs text-muted-foreground">Arquivo DWG anexado — envie também imagens ou PDFs para a IA analisar</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDwgFile(null)}>✕</Button>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => { setStep(0); setFiles([]); setPreviews([]); setDwgFile(null); }}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setStep(2)} disabled={!files.length}>
                  Próximo <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && !showSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Projeto</CardTitle>
              <CardDescription>Campos com <span className="text-destructive font-medium">*</span> são obrigatórios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section: Dados do Projeto */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Box className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Dados do Projeto</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Projeto <span className="text-destructive">*</span></Label>
                    <Input placeholder="Ex: Casa do João, Projeto Lote 45..." value={formData.nome_projeto} onChange={(e) => updateField("nome_projeto", e.target.value)} className={errors.nome_projeto ? "border-destructive" : ""} maxLength={100} />
                    {errors.nome_projeto && <p className="text-xs text-destructive">{errors.nome_projeto}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Região / Cidade / UF <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Ex: São Paulo - SP, Curitiba - PR..." value={formData.regiao} onChange={(e) => updateField("regiao", e.target.value)} className="pl-9" maxLength={100} />
                    </div>
                    <p className="text-xs text-muted-foreground">Usado para referência SINAPI e recomendações de preços regionais</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Dados da Planta / Ambiente */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Ruler className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    {mode === "foto_ambiente" ? "Dados do Ambiente" : "Dados da Planta"}
                  </h3>
                </div>
                <div className="space-y-4">
                  {mode !== "foto_ambiente" && (
                    <div className="space-y-2">
                      <Label>Escala da Planta</Label>
                      <Select value={formData.escala} onValueChange={(v) => updateField("escala", v)}>
                        <SelectTrigger><SelectValue placeholder="Automática (recomendado)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Automática (recomendado)</SelectItem>
                          <SelectItem value="1:25">1:25</SelectItem>
                          <SelectItem value="1:50">1:50</SelectItem>
                          <SelectItem value="1:75">1:75</SelectItem>
                          <SelectItem value="1:100">1:100</SelectItem>
                          <SelectItem value="1:200">1:200</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Tipo de Construção <span className="text-destructive">*</span></Label>
                    <Select value={formData.tipo_construcao} onValueChange={(v) => updateField("tipo_construcao", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casa_terrea">Casa Térrea</SelectItem>
                        <SelectItem value="sobrado">Sobrado</SelectItem>
                        <SelectItem value="apartamento">Apartamento</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Financeiro */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Financeiro</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>BDI — Benefícios e Despesas Indiretas (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="25"
                      value={formData.bdi_percentual}
                      onChange={(e) => updateField("bdi_percentual", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Padrão: 25%. Define o percentual aplicado sobre o custo direto para compor o preço final.</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Preferências */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Preferências</h3>
                </div>
                <div className="space-y-2">
                  <Label>Instruções Adicionais</Label>
                  <Textarea placeholder="Descreva suas preferências para uma análise mais precisa..." value={formData.instrucoes_adicionais} onChange={(e) => updateField("instrucoes_adicionais", e.target.value)} className="min-h-[80px]" maxLength={1000} />
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-foreground">Dicas do que escrever</span>
                    </div>
                    {mode === "foto_ambiente" ? (
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Informe medidas conhecidas (ex: "a parede tem 2,5m")</li>
                        <li>• Diga o que deseja reformar (piso, revestimento, louças...)</li>
                        <li>• Padrão de acabamento desejado (popular, médio, alto)</li>
                        <li>• Marcas que prefere ou quer evitar</li>
                        <li>• Se quer manter algo existente (ex: "manter o box")</li>
                      </ul>
                    ) : (
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Tipo de material preferido (ex: tijolo baiano, bloco cerâmico)</li>
                        <li>• Padrão de acabamento (popular, médio, alto)</li>
                        <li>• Incluir estimativa de mão de obra?</li>
                        <li>• Marcas que prefere ou quer evitar</li>
                        <li>• Detalhes específicos dos cômodos (ex: porcelanato na sala)</li>
                        <li>• Percentual de BDI customizado</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop buttons */}
              <div className="hidden sm:flex justify-between pt-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Button>
                  <Button variant="ghost" onClick={handleSaveDraft} disabled={savingDraft}>
                    {savingDraft ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Salvar rascunho
                  </Button>
                </div>
                <Button onClick={handleNext} disabled={loading}>Revisar e Analisar <ChevronRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary confirmation */}
        {step === 2 && showSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Confirme os dados da análise</CardTitle>
              <CardDescription>Revise as informações antes de iniciar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Modo</span><span className="text-sm font-medium">{mode === "foto_ambiente" ? "📷 Foto do Ambiente" : "📐 Planta Baixa"}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Projeto</span><span className="text-sm font-medium">{formData.nome_projeto || "Sem título"}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Tipo</span><span className="text-sm font-medium">{TIPO_LABELS[formData.tipo_construcao]}</span></div>
                {mode !== "foto_ambiente" && (<><Separator /><div className="flex justify-between"><span className="text-sm text-muted-foreground">Escala</span><span className="text-sm font-medium">{!formData.escala || formData.escala === "auto" ? "Detecção automática" : ESCALA_LABELS[formData.escala] || formData.escala}</span></div></>)}
                {formData.regiao && (<><Separator /><div className="flex justify-between"><span className="text-sm text-muted-foreground">Região</span><span className="text-sm font-medium">{formData.regiao}</span></div></>)}
                <Separator />
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">BDI</span><span className="text-sm font-medium">{formData.bdi_percentual || "25"}%</span></div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Arquivos</span>
                  <span className="text-sm font-medium">{files.length} arquivo(s)</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {files.map((f, i) => <div key={i}>• {f.name}</div>)}
                </div>
                {dwgFile && (<><Separator /><div className="flex justify-between"><span className="text-sm text-muted-foreground">DWG</span><span className="text-sm font-medium">{dwgFile.name}</span></div></>)}
                {formData.instrucoes_adicionais && (<><Separator /><div><span className="text-sm text-muted-foreground">Instruções</span><p className="text-sm mt-1">{formData.instrucoes_adicionais}</p></div></>)}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setShowSummary(false)}><ArrowLeft className="mr-1 h-4 w-4" /> Editar</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando com IA...</>) : "Iniciar Análise"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center py-12">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
              <h3 className="mb-2 text-lg font-semibold">{mode === "foto_ambiente" ? "Analisando fotos do ambiente..." : "Analisando suas plantas..."}</h3>
              <p className="text-center text-muted-foreground">
                {mode ? MODE_CONFIG[mode].loadingText : ""} Isso pode levar até 60 segundos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile sticky CTA */}
      {step === 2 && !showSummary && !loading && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4 sm:hidden">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={savingDraft} className="flex-shrink-0"><Save className="h-4 w-4" /></Button>
            <Button className="flex-1" onClick={handleNext} disabled={loading}>Revisar e Analisar <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
