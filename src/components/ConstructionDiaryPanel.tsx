import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardList, Loader2, Save, Users, CloudSun, AlertTriangle, Camera, X } from "lucide-react";
import { toast } from "sonner";

interface ConstructionDiaryPanelProps {
  analysisId: string;
  onSaved?: () => void;
}

interface DiaryEntry {
  id: string;
  data_registro: string;
  clima: string | null;
  equipe_presente: number | null;
  atividades_realizadas: string | null;
  problemas_ocorridos: string | null;
  observacoes: string | null;
  status_geral: string | null;
  fotos_urls: string[] | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  normal: "No prazo",
  atencao: "Atenção",
  critico: "Crítico",
  concluido: "Concluído",
};

const climateOptions = ["Ensolarado", "Nublado", "Chuva leve", "Chuva forte", "Vento forte"];

function getStatusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (status === "critico") return "destructive";
  if (status === "atencao") return "outline";
  if (status === "concluido") return "default";
  return "secondary";
}

export function ConstructionDiaryPanel({ analysisId, onSaved }: ConstructionDiaryPanelProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    data_registro: new Date().toISOString().split("T")[0],
    clima: "Ensolarado",
    equipe_presente: "",
    atividades_realizadas: "",
    problemas_ocorridos: "",
    observacoes: "",
    status_geral: "normal",
  });

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("diario_obra")
      .select("id, data_registro, clima, equipe_presente, atividades_realizadas, problemas_ocorridos, observacoes, status_geral, fotos_urls, created_at")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .order("data_registro", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      toast.error("Não foi possível carregar o Diário de Obra.");
    } else {
      setEntries((data as DiaryEntry[]) || []);
    }
    setLoading(false);
  }, [analysisId, user]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photoFiles.length + files.length > 5) {
      toast.error("Máximo de 5 fotos por registro.");
      return;
    }
    const newFiles = [...photoFiles, ...files].slice(0, 5);
    setPhotoFiles(newFiles);
    setPhotoPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  }, [photoFiles]);

  const removePhoto = useCallback((index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }, [photoPreviews]);

  const uploadPhotos = useCallback(async (): Promise<string[]> => {
    if (!photoFiles.length || !user) return [];
    setUploading(true);
    const urls: string[] = [];
    for (const file of photoFiles) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${analysisId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("diary-photos").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("diary-photos").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    setUploading(false);
    return urls;
  }, [photoFiles, user, analysisId]);

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    if (!form.atividades_realizadas.trim()) {
      toast.error("Descreva as atividades realizadas no dia.");
      return;
    }
    setSaving(true);

    const fotosUrls = await uploadPhotos();

    const { error } = await supabase.from("diario_obra").insert({
      analysis_id: analysisId,
      user_id: user.id,
      data_registro: form.data_registro,
      clima: form.clima,
      equipe_presente: form.equipe_presente ? Number(form.equipe_presente) : 0,
      atividades_realizadas: form.atividades_realizadas.trim(),
      problemas_ocorridos: form.problemas_ocorridos.trim() || null,
      observacoes: form.observacoes.trim() || null,
      status_geral: form.status_geral,
      fotos_urls: fotosUrls.length ? fotosUrls : null,
    });
    if (error) {
      toast.error("Erro ao salvar o diário.");
      setSaving(false);
      return;
    }
    toast.success("Registro do diário salvo.");
    setForm({
      data_registro: new Date().toISOString().split("T")[0],
      clima: "Ensolarado",
      equipe_presente: "",
      atividades_realizadas: "",
      problemas_ocorridos: "",
      observacoes: "",
      status_geral: "normal",
    });
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPhotoFiles([]);
    setPhotoPreviews([]);
    await loadEntries();
    onSaved?.();
    setSaving(false);
  }, [analysisId, form, loadEntries, onSaved, user, uploadPhotos, photoPreviews]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Novo registro diário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={form.data_registro} onChange={(e) => setForm((prev) => ({ ...prev, data_registro: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Clima</label>
              <Select value={form.clima} onValueChange={(value) => setForm((prev) => ({ ...prev, clima: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o clima" /></SelectTrigger>
                <SelectContent>
                  {climateOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Equipe presente</label>
              <Input type="number" min="0" placeholder="Ex: 6" value={form.equipe_presente} onChange={(e) => setForm((prev) => ({ ...prev, equipe_presente: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Atividades realizadas</label>
            <Textarea placeholder="Ex: assentamento de piso no banheiro social, conferência de pontos hidráulicos..." value={form.atividades_realizadas} onChange={(e) => setForm((prev) => ({ ...prev, atividades_realizadas: e.target.value }))} className="min-h-[100px]" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Problemas / impedimentos</label>
              <Textarea placeholder="Ex: atraso do fornecedor, chuva, falta de material..." value={form.problemas_ocorridos} onChange={(e) => setForm((prev) => ({ ...prev, problemas_ocorridos: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações</label>
              <Textarea placeholder="Ex: cliente aprovou alteração do revestimento da suíte." value={form.observacoes} onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))} />
            </div>
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Camera className="h-4 w-4" /> Fotos do canteiro (máx. 5)
            </label>
            <div className="flex flex-wrap gap-3">
              {photoPreviews.map((url, i) => (
                <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                  <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photoFiles.length < 5 && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                </label>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:w-64 space-y-2">
              <label className="text-sm font-medium">Status do dia</label>
              <Select value={form.status_geral} onValueChange={(value) => setForm((prev) => ({ ...prev, status_geral: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">No prazo</SelectItem>
                  <SelectItem value="atencao">Atenção</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} disabled={saving || uploading} className="sm:min-w-44">
              {saving || uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {uploading ? "Enviando fotos..." : "Salvar diário"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Últimos registros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Ainda não há registros. O diário alimenta o chatbot do cliente e os alertas preditivos de atraso.</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{new Date(`${entry.data_registro}T12:00:00`).toLocaleDateString("pt-BR")}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {entry.clima && <span className="inline-flex items-center gap-1"><CloudSun className="h-3.5 w-3.5" /> {entry.clima}</span>}
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {entry.equipe_presente || 0} pessoas</span>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(entry.status_geral)}>{statusLabels[entry.status_geral || "normal"] || "No prazo"}</Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1 font-medium">Atividades</p>
                    <p className="text-muted-foreground">{entry.atividades_realizadas || "—"}</p>
                  </div>
                  {entry.problemas_ocorridos && (
                    <div>
                      <p className="mb-1 flex items-center gap-1 font-medium"><AlertTriangle className="h-4 w-4 text-destructive" /> Problemas</p>
                      <p className="text-muted-foreground">{entry.problemas_ocorridos}</p>
                    </div>
                  )}
                  {entry.observacoes && (
                    <div>
                      <p className="mb-1 font-medium">Observações</p>
                      <p className="text-muted-foreground">{entry.observacoes}</p>
                    </div>
                  )}
                  {entry.fotos_urls && entry.fotos_urls.length > 0 && (
                    <div>
                      <p className="mb-2 font-medium flex items-center gap-1"><Camera className="h-4 w-4" /> Fotos</p>
                      <div className="flex flex-wrap gap-2">
                        {entry.fotos_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block h-16 w-16 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all">
                            <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
