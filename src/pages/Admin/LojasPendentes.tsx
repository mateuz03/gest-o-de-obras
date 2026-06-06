import { useEffect, useState } from "react";
import {
  Store,
  Loader2,
  Building2,
  CalendarDays,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Instagram,
  Clock,
  FileText,
  Tag,
  ShieldCheck,
  AlertOctagon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Loja {
  id: string;
  user_id: string;
  nome_loja: string;
  cnpj: string;
  descricao: string | null;
  logo_url: string | null;
  whatsapp: string;
  instagram: string | null;
  cidade: string;
  estado: string | null;
  categoria: string | null;
  horario_atendimento: string | null;
  status: string;
  motivo_rejeicao: string | null;
  created_at: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function LojasPendentes() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState<Loja | null>(null);
  const [processando, setProcessando] = useState(false);
  
  // 4. Estado para o histórico de rejeições
  const [tentativasAnteriores, setTentativasAnteriores] = useState(0);

  // Popups de confirmação
  const [confirmAprovar, setConfirmAprovar] = useState(false);
  const [confirmRecusar, setConfirmRecusar] = useState(false);
  const [motivo, setMotivo] = useState("");

  // 2. useEffect com Cleanup para evitar memory leaks
  useEffect(() => {
    let cancelled = false;

    async function carregarLojas() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("perfil_lojista")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .range(0, 49); // 5. Paginação/Limite Server-side

        if (error) throw error;
        if (!cancelled) setLojas((data as unknown as Loja[]) || []);
      } catch (err) {
        console.error("Erro ao carregar lojas pendentes:", err);
        if (!cancelled) toast.error("Não foi possível carregar as solicitações.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    carregarLojas();

    return () => {
      cancelled = true;
    };
  }, []);

  // 4. Busca o histórico apenas ao abrir o modal, salvando banda
  const handleSelecionar = async (loja: Loja) => {
    setSelecionada(loja);
    setTentativasAnteriores(0); // Reseta ao abrir
    
    if (loja.cnpj) {
      const { count, error } = await supabase
        .from("perfil_lojista")
        .select("*", { count: 'exact', head: true })
        .eq("cnpj", loja.cnpj)
        .eq("status", "rejected");
      
      if (!error && count) {
        setTentativasAnteriores(count);
      }
    }
  };

  const aprovar = async () => {
    if (!selecionada) return;
    setProcessando(true);
    try {
      const { error } = await supabase
        .from("perfil_lojista")
        .update({ status: "approved", motivo_rejeicao: null })
        .eq("id", selecionada.id);

      if (error) throw error;

      // 3. Notificação por E-mail (Fire and forget, não trava a tela)
      supabase.functions.invoke("notify-loja-status", {
        body: { lojaId: selecionada.id, status: "approved" }
      }).catch(console.error);

      toast.success(`Loja "${selecionada.nome_loja}" aprovada com sucesso!`);
      setLojas((prev) => prev.filter((l) => l.id !== selecionada.id));
      setConfirmAprovar(false);
      setSelecionada(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aprovar a loja.");
    } finally {
      setProcessando(false);
    }
  };

  const recusar = async () => {
    if (!selecionada) return;
    if (!motivo.trim()) {
      toast.error("Informe o motivo da recusa.");
      return;
    }
    setProcessando(true);
    try {
      const { error } = await supabase
        .from("perfil_lojista")
        .update({ status: "rejected", motivo_rejeicao: motivo.trim() })
        .eq("id", selecionada.id);

      if (error) throw error;

      // 3. Notificação por E-mail (Fire and forget)
      supabase.functions.invoke("notify-loja-status", {
        body: { lojaId: selecionada.id, status: "rejected", motivo: motivo.trim() }
      }).catch(console.error);

      toast.success(`Loja "${selecionada.nome_loja}" recusada.`);
      setLojas((prev) => prev.filter((l) => l.id !== selecionada.id));
      setConfirmRecusar(false);
      setSelecionada(null);
      setMotivo("");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao recusar a loja.");
    } finally {
      setProcessando(false);
    }
  };

  // 1. useMemo removido: custo zero acessar a propriedade
  const total = lojas.length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Aprovação de Lojas</h2>
          <p className="text-sm text-slate-500 mt-1">
            Analise e modere as solicitações de novas lojas (perfis CNPJ).
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 px-3 py-1.5 text-sm font-bold w-fit">
          {total} {total === 1 ? "pedido pendente" : "pedidos pendentes"}
        </Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : lojas.length === 0 ? (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="py-20 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-300" />
            <p className="text-lg font-bold text-slate-900">Tudo em dia!</p>
            <p className="text-sm text-slate-500">Não há solicitações de lojas aguardando análise.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lojas.map((loja) => (
            <Card
              key={loja.id}
              className="border-slate-200 shadow-sm bg-white transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer"
              onClick={() => handleSelecionar(loja)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                    {loja.logo_url ? (
                      <img
                        src={loja.logo_url}
                        alt={loja.nome_loja}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <Store className="h-6 w-6 text-emerald-600/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-slate-900">{loja.nome_loja}</h3>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <Building2 className="h-3.5 w-3.5" /> {loja.cnpj || "CNPJ não informado"}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <CalendarDays className="h-3.5 w-3.5" /> Solicitado em {formatDate(loja.created_at)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 w-full border-slate-300 text-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelecionar(loja);
                  }}
                >
                  Analisar pedido
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL DE DETALHES */}
      <Dialog open={!!selecionada} onOpenChange={(o) => !o && setSelecionada(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          {selecionada && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start pr-6">
                  <DialogTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    Análise da Loja
                  </DialogTitle>
                  
                  {/* 4. Badge exibido apenas se houver histórico de recusa */}
                  {tentativasAnteriores > 0 && (
                    <Badge variant="destructive" className="flex items-center gap-1 font-bold animate-in zoom-in duration-300">
                      <AlertOctagon className="h-3.5 w-3.5" /> 
                      {tentativasAnteriores + 1}ª Tentativa
                    </Badge>
                  )}
                </div>
                <DialogDescription>
                  Revise os dados informados pelo lojista antes de aprovar ou recusar.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Cabeçalho da loja */}
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                    {selecionada.logo_url ? (
                      <img
                        src={selecionada.logo_url}
                        alt={selecionada.nome_loja}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <Store className="h-8 w-8 text-emerald-600/40" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selecionada.nome_loja}</h3>
                    {selecionada.categoria && (
                      <Badge variant="outline" className="mt-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                        <Tag className="mr-1 h-3 w-3" /> {selecionada.categoria}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Dados */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo icon={Building2} rotulo="Razão Social / Nome" valor={selecionada.nome_loja} />
                  <Campo icon={FileText} rotulo="CNPJ" valor={selecionada.cnpj} />
                  <Campo icon={Phone} rotulo="Contato Comercial (WhatsApp)" valor={selecionada.whatsapp} />
                  <Campo icon={Instagram} rotulo="Instagram" valor={selecionada.instagram} />
                  <Campo
                    icon={MapPin}
                    rotulo="Localização"
                    valor={[selecionada.cidade, selecionada.estado].filter(Boolean).join(" - ")}
                  />
                  <Campo icon={Clock} rotulo="Horário de Atendimento" valor={selecionada.horario_atendimento} />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                    {selecionada.descricao || "Nenhuma descrição informada."}
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                  onClick={() => setConfirmRecusar(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Recusar Loja
                </Button>
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => setConfirmAprovar(true)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar Loja
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* POPUP CONFIRMAR APROVAÇÃO */}
      <AlertDialog open={confirmAprovar} onOpenChange={setConfirmAprovar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprovação?</AlertDialogTitle>
            <AlertDialogDescription>
              A loja <strong>{selecionada?.nome_loja}</strong> ficará ativa, sua vitrine será exibida no
              marketplace e o lojista terá acesso ao painel de gerenciamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                aprovar();
              }}
              disabled={processando}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Aprovação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* POPUP CONFIRMAR RECUSA */}
      <AlertDialog open={confirmRecusar} onOpenChange={(o) => { setConfirmRecusar(o); if (!o) setMotivo(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              Informe uma justificativa rápida. O lojista verá esse motivo no e-mail e poderá corrigir os dados para reenviar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <Label className="text-slate-700 font-bold text-sm">Motivo da recusa *</Label>
            <Textarea
              rows={3}
              placeholder="Ex: CNPJ inválido, logotipo fora dos padrões..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                recusar();
              }}
              disabled={processando}
              className="bg-red-600 hover:bg-red-700"
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Recusa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Campo({
  icon: Icon,
  rotulo,
  valor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {rotulo}
      </p>
      <p className="text-sm font-medium text-slate-800">{valor || "—"}</p>
    </div>
  );
}