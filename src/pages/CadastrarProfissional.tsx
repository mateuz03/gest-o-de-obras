import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { 
  ArrowLeft, Loader2, HardHat, Camera, Upload, 
  Check, X, Eye, Star, MessageCircle, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocalidadeAutocomplete } from "@/components/ui/localidade-autocomplete"; // Componente existente
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ESPECIALIDADES = [
  "Pedreiro",
  "Eletricista",
  "Encanador",
  "Pintor",
  "Mestre de Obras",
  "Engenheiro",
  "Arquiteto",
  "Gesseiro",
  "Marceneiro",
  "Outros",
] as const;

// Esquema atualizado para array de especialidades
const schema = z.object({
  especialidades: z.array(z.string()).min(1, "Selecione pelo menos uma especialidade"),
  regiao: z.string().trim().min(2, "Informe sua cidade/estado").max(120),
  valor_diaria: z.coerce.number().min(0, "Valor inválido").max(99999),
  telefone: z.string().trim().min(14, "Telefone inválido").max(20),
  resumo: z.string().trim().min(20, "Mínimo de 20 caracteres").max(500, "Máximo de 500 caracteres"),
});

function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join(""),
    );
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

export default function CadastrarProfissional() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Estados do formulário
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [regiao, setRegiao] = useState("");
  const [valorDiaria, setValorDiaria] = useState("");
  const [telefone, setTelefone] = useState("");
  const [resumo, setResumo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Estados de controle UI
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Modais
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Função para atualizar campos e limpar erros em tempo real (Debounce visual)
  const updateField = (field: string, value: any) => {
    setHasChanges(true);
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
    switch(field) {
      case 'regiao': setRegiao(value); break;
      case 'valorDiaria': setValorDiaria(value); break;
      case 'telefone': setTelefone(maskPhone(value)); break;
      case 'resumo': setResumo(value); break;
    }
  };

  const toggleEspecialidade = (esp: string) => {
    setHasChanges(true);
    if (errors.especialidades) setErrors(prev => { const n = { ...prev }; delete n.especialidades; return n; });
    setEspecialidades(prev => 
      prev.includes(esp) ? prev.filter(e => e !== esp) : [...prev, esp]
    );
  };

  // Carrega dados existentes
  useEffect(() => {
    if (!user) {
      setLoadingExisting(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profissionais")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error("Erro ao carregar perfil:", error);
          toast.error("Erro ao carregar dados do perfil");
        }
        
        if (data) {
          const d = data as any;
          // Split das especialidades salvas como string (compatibilidade com DB)
          setEspecialidades(d.especialidade ? d.especialidade.split(", ") : []);
          setRegiao(d.regiao ?? "");
          setValorDiaria(String(d.valor_diaria ?? ""));
          setTelefone(d.telefone ?? "");
          setResumo(d.resumo ?? "");
          setAvatarUrl(d.avatar_url ?? null);
        }
      } catch (err) {
        console.error("Erro inesperado:", err);
      } finally {
        setLoadingExisting(false);
        // Reseta hasChanges pois acabamos de carregar do banco
        setTimeout(() => setHasChanges(false), 100); 
      }
    })();
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth?redirect=/cadastrar-profissional" replace />;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingAvatar(true);
    setHasChanges(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      // Usa bucket 'avatars' (certifique-se de que ele existe no Supabase)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrlData.publicUrl);
      toast.success("Foto de perfil carregada!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload da imagem.");
      console.error(error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    setErrors({});
    
    const parsed = schema.safeParse({
      especialidades,
      regiao,
      valor_diaria: valorDiaria,
      telefone,
      resumo,
    });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[String(i.path[0])] = i.message;
      });
      setErrors(errs);
      toast.error("Verifique os campos obrigatórios");
      return;
    }

    setSaving(true);
    
    const { error } = await supabase
      .from("profissionais")
      .upsert(
        { 
          user_id: user.id, 
          especialidade: parsed.data.especialidades.join(", "), // Salva como string compatível
          regiao: parsed.data.regiao, 
          valor_diaria: parsed.data.valor_diaria,
          telefone: parsed.data.telefone,
          resumo: parsed.data.resumo,
          avatar_url: avatarUrl
        },
        { onConflict: "user_id" },
      );
      
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar perfil", { description: error.message });
      return;
    }
    
    setHasChanges(false);
    toast.success("Perfil profissional salvo com sucesso!");
    navigate("/profissionais");
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowCancelAlert(true);
    } else {
      navigate("/profissionais");
    }
  };

  // WhatsApp num limpo para o link
  const wppLink = `https://wa.me/55${telefone.replace(/\D/g, "")}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      <div className="container max-w-3xl py-10 lg:py-12">
        <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-4 w-4 mr-2" /> Preview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={handleCancel}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>

          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 ring-1 ring-emerald-200 mb-4 shadow-sm">
            <HardHat className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Configure seu <span className="text-emerald-600">perfil profissional</span>
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Destaque suas habilidades e receba orçamentos diretamente pelo WhatsApp.
          </p>
        </div>

        <Card className="border-slate-200 bg-white shadow-md rounded-2xl animate-in fade-in duration-700">
          <CardHeader className="border-b border-slate-100 pb-6">
            <CardTitle className="text-slate-900 text-xl flex items-center gap-2">
              Detalhes Públicos do Perfil
            </CardTitle>
            <CardDescription className="text-slate-500">
              Preencha com atenção. Esta será a sua vitrine de vendas.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {loadingExisting ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* UPLOAD DE FOTO */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-200 flex items-center justify-center flex-shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <Upload className="w-6 h-6 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                    </label>
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="font-bold text-slate-900 text-sm">Foto de Perfil Profissional</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-3">Rostos reais transmitem 60% mais confiança para os clientes. Tam. máx: 5MB.</p>
                    <Button type="button" variant="outline" size="sm" className="relative h-8" disabled={uploadingAvatar}>
                      {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Upload className="w-3 h-3 mr-2" />}
                      Escolher foto
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} />
                    </Button>
                  </div>
                </div>

                {/* ESPECIALIDADES MÚLTIPLAS */}
                <div className="space-y-3">
                  <Label className="text-slate-700 font-bold text-base">
                    Especialidades <span className="text-emerald-600">*</span>
                  </Label>
                  <p className="text-xs text-slate-500">Selecione todas as suas áreas de atuação para aparecer em mais buscas.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {ESPECIALIDADES.map((esp) => {
                      const isSelected = especialidades.includes(esp);
                      return (
                        <button
                          key={esp}
                          type="button"
                          onClick={() => toggleEspecialidade(esp)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                            isSelected 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {esp}
                        </button>
                      );
                    })}
                  </div>
                  {errors.especialidades && <p className="text-sm text-red-500 mt-1 animate-in slide-in-from-top-1">{errors.especialidades}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* REGIÃO COM AUTOCOMPLETE */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">
                      Região de Atuação <span className="text-emerald-600">*</span>
                    </Label>
                    <LocalidadeAutocomplete 
                      value={regiao}
                      onChange={(textoFormadado) => updateField('regiao', textoFormadado)}
                      placeholder="Ex: São Paulo / SP"
                    />
                    {errors.regiao && <p className="text-sm text-red-500 animate-in slide-in-from-top-1">{errors.regiao}</p>}
                  </div>

                  {/* VALOR DA DIÁRIA */}
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">
                      Valor Médio Diária (R$) <span className="text-emerald-600">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={valorDiaria}
                      onChange={(e) => updateField('valorDiaria', e.target.value)}
                      placeholder="Ex: 250"
                      className={`bg-white text-slate-900 font-medium h-11 focus:ring-emerald-500 ${errors.valor_diaria ? 'border-red-300' : 'border-slate-300'}`}
                    />
                    {errors.valor_diaria && <p className="text-sm text-red-500 animate-in slide-in-from-top-1">{errors.valor_diaria}</p>}
                  </div>
                </div>

                {/* TELEFONE COM PREVIEW WPP */}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold flex justify-between">
                    <span>Telefone / WhatsApp <span className="text-emerald-600">*</span></span>
                    {telefone.length >= 14 && (
                      <a href={wppLink} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-medium hover:underline flex items-center">
                        Testar Link <ArrowLeft className="w-3 h-3 ml-1 rotate-[135deg]" />
                      </a>
                    )}
                  </Label>
                  <Input
                    value={telefone}
                    onChange={(e) => updateField('telefone', e.target.value)}
                    placeholder="(15) 99999-9999"
                    className={`bg-white text-slate-900 font-medium h-11 focus:ring-emerald-500 ${errors.telefone ? 'border-red-300' : 'border-slate-300'}`}
                  />
                  {errors.telefone && <p className="text-sm text-red-500 animate-in slide-in-from-top-1">{errors.telefone}</p>}
                </div>

                {/* RESUMO */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <Label className="text-slate-700 font-bold">
                      Resumo Profissional <span className="text-emerald-600">*</span>
                    </Label>
                    <span className={`text-xs font-bold ${resumo.length > 480 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {resumo.length}/500
                    </span>
                  </div>
                  <Textarea
                    value={resumo}
                    onChange={(e) => updateField('resumo', e.target.value.slice(0, 500))}
                    placeholder="Conte sua experiência, certificações e os diferenciais do seu trabalho. Clientes gostam de profissionais detalhistas!"
                    rows={5}
                    className={`bg-white text-slate-900 placeholder:text-slate-400 resize-none focus:ring-emerald-500 leading-relaxed ${errors.resumo ? 'border-red-300' : 'border-slate-300'}`}
                  />
                  {errors.resumo && <p className="text-sm text-red-500 font-medium animate-in slide-in-from-top-1">{errors.resumo}</p>}
                </div>

                {/* BOTÕES */}
                <div className="flex flex-col-reverse sm:flex-row gap-4 pt-6 mt-6 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 text-base transition-all hover:-translate-y-0.5"
                  >
                    {saving ? (
                      <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Salvando Perfil...</>
                    ) : (
                      "Publicar Perfil Profissional"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você fez alterações no seu perfil que ainda não foram salvas. Se você sair agora, todas as mudanças serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Editando</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate("/profissionais")}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE PREVIEW DO PERFIL */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-slate-50">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Preview do seu Perfil</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <Card className="border-0 shadow-xl overflow-hidden bg-white">
              <div className="h-20 bg-emerald-600 relative"></div>
              <CardContent className="pt-0 px-6 pb-6 relative">
                <div className="absolute -top-10 left-6 w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-slate-200">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <HardHat className="w-full h-full p-4 text-slate-400" />
                  )}
                </div>
                
                <div className="flex justify-end pt-3">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 font-bold flex items-center">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500 mr-1" /> 5.0 (Novo)
                  </Badge>
                </div>

                <div className="mt-4">
                  <h3 className="font-extrabold text-xl text-slate-900">{user?.user_metadata?.full_name || "Seu Nome"}</h3>
                  <div className="flex items-center text-sm text-slate-500 mt-1 mb-4 gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {regiao || "Sua Região"}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {especialidades.length > 0 ? (
                      especialidades.map(e => <Badge key={e} variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">{e}</Badge>)
                    ) : (
                      <Badge variant="outline" className="text-slate-400">Sem especialidade</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-600 line-clamp-3 mb-6">
                    {resumo || "Seu resumo profissional aparecerá aqui."}
                  </p>
                  
                  <Button className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white">
                    <MessageCircle className="w-4 h-4 mr-2" /> Falar no WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
