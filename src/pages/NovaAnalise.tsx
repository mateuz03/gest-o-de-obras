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
import { Upload, ArrowLeft, Building2, Loader2, FileImage, Save, ChevronRight, MapPin, Ruler, Settings2, Lightbulb, CheckCircle2 } from "lucide-react";

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

export default function NovaAnalise() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [dwgFile, setDwgFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    nome_projeto: "",
    escala: "",
    tipo_construcao: "casa_terrea",
    regiao: "",
    instrucoes_adicionais: "",
  });

  const isDwg = (f: File) => f.name.toLowerCase().endsWith(".dwg");

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelection(f);
  }, []);

  const handleFileSelection = (f: File) => {
    if (isDwg(f)) {
      if (f.size > 50 * 1024 * 1024) {
        toast.error("Arquivo DWG máximo de 50MB");
        return;
      }
      setDwgFile(f);
      toast.success("Arquivo DWG anexado! Envie também uma imagem ou PDF da planta para a IA analisar.");
      return;
    }
    if (!f.type.startsWith("image/") && f.type !== "application/pdf") {
      toast.error("Envie uma imagem (JPG, PNG), PDF ou arquivo DWG");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Arquivo máximo de 10MB");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome_projeto.trim() || formData.nome_projeto.trim().length < 3) {
      newErrors.nome_projeto = "Nome do projeto deve ter pelo menos 3 caracteres";
    }
    if (formData.nome_projeto.trim().length > 100) {
      newErrors.nome_projeto = "Nome do projeto deve ter no máximo 100 caracteres";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setShowSummary(true);
  };

  const handleSaveDraft = async () => {
    if (!file || !user) return;
    setSavingDraft(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("blueprints").upload(path, file);
      if (uploadErr) throw uploadErr;
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

  const handleSubmit = async () => {
    if (!file || !user) return;
    if (!validate()) return;
    setLoading(true);
    setShowSummary(false);

    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("blueprints").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("blueprints").getPublicUrl(path);

      if (dwgFile) {
        const dwgPath = `${user.id}/${Date.now()}.dwg`;
        await supabase.storage.from("blueprints").upload(dwgPath, dwgFile);
      }

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data: analysis, error: insertErr } = await supabase
        .from("analyses")
        .insert({
          user_id: user.id,
          nome_projeto: formData.nome_projeto || "Análise sem título",
          imagem_url: urlData.publicUrl,
          escala: formData.escala || null,
          tipo_construcao: formData.tipo_construcao,
          regiao: formData.regiao || null,
          status: "processing",
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke("analyze-blueprint", {
        body: {
          image_base64: base64,
          mime_type: file.type,
          escala: formData.escala,
          tipo_construcao: formData.tipo_construcao,
          regiao: formData.regiao,
          instrucoes_adicionais: formData.instrucoes_adicionais,
        },
      });

      if (fnErr) throw fnErr;

      await supabase
        .from("analyses")
        .update({ resultado_json: result, status: "completed" })
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
      <nav className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
          <div className="flex items-center gap-2 font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Building2 className="h-5 w-5 text-primary" />
            Nova Análise
          </div>
        </div>
      </nav>

      <div className="container max-w-2xl py-8">
        {/* Step indicators */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s}
              </div>
              <span className={`text-sm ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                {s === 1 ? "Upload" : "Detalhes"}
              </span>
              {s < 2 && <div className={`h-px w-12 ${step > s ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload da Planta Baixa</CardTitle>
              <CardDescription>Envie uma imagem (JPG, PNG), PDF ou arquivo DWG da planta baixa</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={`relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/*,.pdf,.dwg"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                />
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-[260px] rounded-lg object-contain" />
                ) : file ? (
                  <>
                    <FileImage className="mb-3 h-12 w-12 text-primary" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-3 h-12 w-12 text-muted-foreground/50" />
                    <p className="font-medium">Arraste a planta aqui ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG, PDF ou DWG (máx. 10MB / DWG 50MB)</p>
                  </>
                )}
              </div>

              {dwgFile && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                  <FileImage className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{dwgFile.name}</p>
                    <p className="text-xs text-muted-foreground">Arquivo DWG anexado — envie também uma imagem ou PDF para a IA analisar</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDwgFile(null); }}>✕</Button>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!file}>
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
              <CardDescription>
                Campos com <span className="text-destructive font-medium">*</span> são obrigatórios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section: Dados do Projeto */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Dados do Projeto</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Projeto <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="Ex: Casa do João, Projeto Lote 45..."
                      value={formData.nome_projeto}
                      onChange={(e) => updateField("nome_projeto", e.target.value)}
                      className={errors.nome_projeto ? "border-destructive" : ""}
                      maxLength={100}
                    />
                    {errors.nome_projeto && (
                      <p className="text-xs text-destructive">{errors.nome_projeto}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Região / Cidade</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Ex: São Paulo, Curitiba..."
                        value={formData.regiao}
                        onChange={(e) => updateField("regiao", e.target.value)}
                        className="pl-9"
                        maxLength={100}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Ajuda a refinar recomendações de marcas e preços</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section: Dados da Planta */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Ruler className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Dados da Planta</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Escala da Planta</Label>
                    <Select value={formData.escala} onValueChange={(v) => updateField("escala", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Automática (recomendado)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automática (recomendado)</SelectItem>
                        <SelectItem value="1:25">1:25</SelectItem>
                        <SelectItem value="1:50">1:50</SelectItem>
                        <SelectItem value="1:75">1:75</SelectItem>
                        <SelectItem value="1:100">1:100</SelectItem>
                        <SelectItem value="1:200">1:200</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">A IA tentará detectar automaticamente se não informada</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Construção <span className="text-destructive">*</span></Label>
                    <Select value={formData.tipo_construcao} onValueChange={(v) => updateField("tipo_construcao", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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

              {/* Section: Preferências */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Preferências</h3>
                </div>
                <div className="space-y-2">
                  <Label>Instruções Adicionais</Label>
                  <Textarea
                    placeholder="Descreva suas preferências para uma análise mais precisa..."
                    value={formData.instrucoes_adicionais}
                    onChange={(e) => updateField("instrucoes_adicionais", e.target.value)}
                    className="min-h-[80px]"
                    maxLength={1000}
                  />
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-foreground">Dicas do que escrever</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Tipo de material preferido (ex: tijolo baiano, bloco cerâmico)</li>
                      <li>• Padrão de acabamento (popular, médio, alto)</li>
                      <li>• Incluir estimativa de mão de obra?</li>
                      <li>• Marcas que prefere ou quer evitar</li>
                      <li>• Detalhes específicos dos cômodos (ex: porcelanato na sala)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Desktop buttons */}
              <div className="hidden sm:flex justify-between pt-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                  </Button>
                  <Button variant="ghost" onClick={handleSaveDraft} disabled={savingDraft}>
                    {savingDraft ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Salvar rascunho
                  </Button>
                </div>
                <Button onClick={handleNext} disabled={loading}>
                  Revisar e Analisar <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary confirmation */}
        {step === 2 && showSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Confirme os dados da análise
              </CardTitle>
              <CardDescription>Revise as informações antes de iniciar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Projeto</span>
                  <span className="text-sm font-medium">{formData.nome_projeto || "Sem título"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <span className="text-sm font-medium">{TIPO_LABELS[formData.tipo_construcao]}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Escala</span>
                  <span className="text-sm font-medium">
                    {!formData.escala || formData.escala === "auto" ? "Detecção automática" : ESCALA_LABELS[formData.escala] || formData.escala}
                  </span>
                </div>
                {formData.regiao && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Região</span>
                      <span className="text-sm font-medium">{formData.regiao}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Arquivo</span>
                  <span className="text-sm font-medium">{file?.name}</span>
                </div>
                {dwgFile && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">DWG</span>
                      <span className="text-sm font-medium">{dwgFile.name}</span>
                    </div>
                  </>
                )}
                {formData.instrucoes_adicionais && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">Instruções</span>
                      <p className="text-sm mt-1">{formData.instrucoes_adicionais}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setShowSummary(false)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Editar
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando com IA...
                    </>
                  ) : (
                    "Iniciar Análise"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-center py-12">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
              <h3 className="mb-2 text-lg font-semibold">Analisando sua planta...</h3>
              <p className="text-center text-muted-foreground">
                A IA está identificando paredes, portas, janelas e calculando os materiais necessários.
                Isso pode levar até 30 segundos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile sticky CTA */}
      {step === 2 && !showSummary && !loading && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4 sm:hidden">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={savingDraft} className="flex-shrink-0">
              <Save className="h-4 w-4" />
            </Button>
            <Button className="flex-1" onClick={handleNext} disabled={loading}>
              Revisar e Analisar <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
