import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ArrowLeft, Building2, Loader2, FileImage } from "lucide-react";

export default function NovaAnalise() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [dwgFile, setDwgFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (!file || !user) return;
    setLoading(true);

    try {
      // Upload file to storage
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("blueprints")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("blueprints").getPublicUrl(path);

      // Convert to base64 for AI
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      // Create analysis record
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

      // Call edge function
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

      // Update analysis with results
      await supabase
        .from("analyses")
        .update({
          resultado_json: result,
          status: "completed",
        })
        .eq("id", (analysis as any).id);

      toast.success("Análise concluída!");
      navigate(`/analise/${(analysis as any).id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao processar análise");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
              <CardDescription>Envie uma imagem (JPG, PNG) ou PDF da planta baixa</CardDescription>
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
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
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
                    <p className="text-sm text-muted-foreground">JPG, PNG ou PDF (máx. 10MB)</p>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!file}>
                  Próximo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Projeto</CardTitle>
              <CardDescription>Informações adicionais para uma análise mais precisa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Projeto</Label>
                <Input
                  placeholder="Ex: Casa do João, Projeto Lote 45..."
                  value={formData.nome_projeto}
                  onChange={(e) => setFormData({ ...formData, nome_projeto: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Escala da Planta (opcional)</Label>
                <Select value={formData.escala} onValueChange={(v) => setFormData({ ...formData, escala: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="A IA tentará detectar automaticamente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:25">1:25</SelectItem>
                    <SelectItem value="1:50">1:50</SelectItem>
                    <SelectItem value="1:75">1:75</SelectItem>
                    <SelectItem value="1:100">1:100</SelectItem>
                    <SelectItem value="1:200">1:200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Construção</Label>
                <Select value={formData.tipo_construcao} onValueChange={(v) => setFormData({ ...formData, tipo_construcao: v })}>
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
              <div className="space-y-2">
                <Label>Região/Cidade (opcional)</Label>
                <Input
                  placeholder="Ex: São Paulo, Curitiba..."
                  value={formData.regiao}
                  onChange={(e) => setFormData({ ...formData, regiao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Instruções Adicionais (opcional)</Label>
                <Textarea
                  placeholder="Ex: Considerar piso porcelanato na sala e cozinha, cerâmica nos banheiros. Quero usar tijolo baiano. Incluir estimativa de mão de obra..."
                  value={formData.instrucoes_adicionais}
                  onChange={(e) => setFormData({ ...formData, instrucoes_adicionais: e.target.value })}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Descreva especificações, preferências de materiais ou qualquer detalhe que ajude a IA a gerar uma estimativa mais precisa.
                </p>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
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
    </div>
  );
}
