import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Instagram,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Tag,
  XCircle,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { filterPendingStores, type AdminPendingStoreRow, type PendingStoreSort } from "@/lib/admin";
import { toast } from "sonner";

interface Loja extends AdminPendingStoreRow {
  user_id: string;
  descricao: string | null;
  logo_url: string | null;
  whatsapp: string;
  instagram: string | null;
  horario_atendimento: string | null;
  status: string;
  motivo_rejeicao: string | null;
}

const STORE_PAGE_LIMIT = 50;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function sortLabel(sortBy: PendingStoreSort) {
  if (sortBy === "name") return "Nome da loja";
  if (sortBy === "newest") return "Solicitacoes mais recentes";
  return "Solicitacoes mais antigas";
}

export default function LojasPendentes() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selecionada, setSelecionada] = useState<Loja | null>(null);
  const [processando, setProcessando] = useState(false);
  const [tentativasAnteriores, setTentativasAnteriores] = useState(0);
  const [tentativasPorCnpj, setTentativasPorCnpj] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState("");
  const [sortBy, setSortBy] = useState<PendingStoreSort>("oldest");
  const [onlyRepeated, setOnlyRepeated] = useState(false);
  const [confirmAprovar, setConfirmAprovar] = useState(false);
  const [confirmRecusar, setConfirmRecusar] = useState(false);
  const [motivo, setMotivo] = useState("");

  async function carregarLojas(forced = false) {
    if (forced) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from("perfil_lojista")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .range(0, STORE_PAGE_LIMIT - 1);

      if (error) throw error;

      const pendingRows = ((data as unknown as Loja[]) ?? []).filter((row) => Boolean(row.user_id));
      const cnpjs = Array.from(new Set(pendingRows.map((row) => row.cnpj).filter(Boolean)));
      let nextCounts: Record<string, number> = {};

      if (cnpjs.length > 0) {
        const { data: rejectedData, error: rejectedError } = await supabase
          .from("perfil_lojista")
          .select("cnpj")
          .in("cnpj", cnpjs)
          .eq("status", "rejected");

        if (rejectedError) throw rejectedError;

        nextCounts = ((rejectedData ?? []) as Array<{ cnpj: string | null }>).reduce<Record<string, number>>((acc, row) => {
          const key = row.cnpj?.trim();
          if (!key) return acc;
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});
      }

      setLojas(pendingRows);
      setTentativasPorCnpj(nextCounts);

      if (selecionada) {
        const refreshedSelection = pendingRows.find((row) => row.id === selecionada.id) ?? null;
        setSelecionada(refreshedSelection);
        setTentativasAnteriores(refreshedSelection ? nextCounts[refreshedSelection.cnpj] ?? 0 : 0);
      }
    } catch (error) {
      console.error("Erro ao carregar lojas pendentes:", error);
      toast.error("Nao foi possivel carregar as solicitacoes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void carregarLojas();
  }, []);

  function handleSelecionar(loja: Loja) {
    setSelecionada(loja);
    setTentativasAnteriores(tentativasPorCnpj[loja.cnpj] ?? 0);
  }

  async function aprovar() {
    if (!selecionada) return;
    setProcessando(true);

    try {
      const { error } = await supabase.rpc("admin_review_store", {
        _store_user_id: selecionada.user_id,
        _status: "approved",
        _reason: null,
      });

      if (error) throw error;

      supabase.functions
        .invoke("notify-loja-status", {
          body: { storeUserId: selecionada.user_id, status: "approved" },
        })
        .catch(console.error);

      toast.success(`Loja "${selecionada.nome_loja}" aprovada com sucesso.`);
      setLojas((prev) => prev.filter((row) => row.id !== selecionada.id));
      setConfirmAprovar(false);
      setSelecionada(null);
      setTentativasAnteriores(0);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao aprovar a loja.");
    } finally {
      setProcessando(false);
    }
  }

  async function recusar() {
    if (!selecionada) return;
    if (!motivo.trim()) {
      toast.error("Informe o motivo da recusa.");
      return;
    }

    setProcessando(true);
    try {
      const { error } = await supabase.rpc("admin_review_store", {
        _store_user_id: selecionada.user_id,
        _status: "rejected",
        _reason: motivo.trim(),
      });

      if (error) throw error;

      supabase.functions
        .invoke("notify-loja-status", {
          body: {
            storeUserId: selecionada.user_id,
            status: "rejected",
            motivo: motivo.trim(),
          },
        })
        .catch(console.error);

      toast.success(`Loja "${selecionada.nome_loja}" recusada.`);
      setLojas((prev) => prev.filter((row) => row.id !== selecionada.id));
      setConfirmRecusar(false);
      setSelecionada(null);
      setTentativasAnteriores(0);
      setMotivo("");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao recusar a loja.");
    } finally {
      setProcessando(false);
    }
  }

  const lojasFiltradas = useMemo(
    () =>
      filterPendingStores(lojas, {
        query: busca,
        sortBy,
        previousRejections: tentativasPorCnpj,
        onlyRepeated,
      }),
    [busca, lojas, onlyRepeated, sortBy, tentativasPorCnpj],
  );

  const summary = useMemo(() => {
    const repeated = lojas.filter((loja) => (tentativasPorCnpj[loja.cnpj] ?? 0) > 0).length;
    const oldest = lojas.reduce<string | null>((oldestDate, loja) => {
      if (!oldestDate) return loja.created_at;
      return new Date(loja.created_at).getTime() < new Date(oldestDate).getTime() ? loja.created_at : oldestDate;
    }, null);

    return {
      total: lojas.length,
      repeated,
      oldest,
    };
  }, [lojas, tentativasPorCnpj]);

  const hasActiveFilters = busca.trim().length > 0 || onlyRepeated || sortBy !== "oldest";

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Aprovacao de lojas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Analise a fila de solicitacoes CNPJ, priorize reenvios e mantenha a operacao de onboarding organizada.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge className="w-fit border-amber-200 bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-700 hover:bg-amber-100">
            {summary.total} {summary.total === 1 ? "pedido pendente" : "pedidos pendentes"}
          </Badge>
          <Button variant="outline" className="border-slate-200 bg-white" onClick={() => void carregarLojas(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar fila
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Pendentes agora" value={summary.total.toLocaleString("pt-BR")} helper="Solicitacoes prontas para analise manual." />
        <MetricCard
          label="Reenvios na fila"
          value={summary.repeated.toLocaleString("pt-BR")}
          helper="Lojas com historico de recusa anterior e nova tentativa."
          tone="amber"
        />
        <MetricCard
          label="Pedido mais antigo"
          value={summary.oldest ? formatDate(summary.oldest) : "Sem fila"}
          helper={summary.oldest ? "Use esse marco para evitar atraso de onboarding." : "Nenhuma solicitacao aguardando analise."}
          tone="slate"
        />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por loja, CNPJ, cidade ou categoria..."
              className="pl-9"
            />
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:w-auto">
            <select
              className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as PendingStoreSort)}
            >
              <option value="oldest">Mais antigas primeiro</option>
              <option value="newest">Mais recentes primeiro</option>
              <option value="name">Ordenar por nome</option>
            </select>

            <Button
              type="button"
              variant="outline"
              className={onlyRepeated ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-700"}
              onClick={() => setOnlyRepeated((prev) => !prev)}
            >
              <AlertOctagon className="mr-2 h-4 w-4" />
              Apenas reenvios
            </Button>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                className="text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setBusca("");
                  setSortBy("oldest");
                  setOnlyRepeated(false);
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : summary.total === 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-20 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-300" />
            <p className="text-lg font-bold text-slate-900">Tudo em dia</p>
            <p className="text-sm text-slate-500">Nao ha solicitacoes de lojas aguardando analise.</p>
          </CardContent>
        </Card>
      ) : lojasFiltradas.length === 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-20 text-center">
            <Store className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-bold text-slate-900">Nenhuma loja encontrada</p>
            <p className="text-sm text-slate-500">
              Ajuste a busca ou os filtros. Ordenacao atual: {sortLabel(sortBy)}.
            </p>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                className="mt-6 border-slate-200 bg-white"
                onClick={() => {
                  setBusca("");
                  setSortBy("oldest");
                  setOnlyRepeated(false);
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lojasFiltradas.map((loja) => {
            const rejections = tentativasPorCnpj[loja.cnpj] ?? 0;
            return (
              <Card
                key={loja.id}
                className="cursor-pointer border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
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
                          onError={(event) => {
                            (event.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Store className="h-6 w-6 text-emerald-600/40" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold text-slate-900">{loja.nome_loja}</h3>
                        {rejections > 0 ? (
                          <Badge className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                            {rejections === 1 ? "Reenvio" : `${rejections} recusas anteriores`}
                          </Badge>
                        ) : null}
                      </div>

                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Building2 className="h-3.5 w-3.5" />
                        {loja.cnpj || "CNPJ nao informado"}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Solicitado em {formatDate(loja.created_at)}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="h-3.5 w-3.5" />
                        {[loja.cidade, loja.estado].filter(Boolean).join(" - ") || "Localizacao nao informada"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {loja.categoria ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        <Tag className="mr-1 h-3 w-3" />
                        {loja.categoria}
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      {rejections > 0 ? "Exige revisao atenta" : "Primeira analise"}
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    className="mt-4 w-full border-slate-300 text-slate-700"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelecionar(loja);
                    }}
                  >
                    Analisar pedido
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!selecionada}
        onOpenChange={(open) => {
          if (!open) {
            setSelecionada(null);
            setTentativasAnteriores(0);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          {selecionada ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pr-6">
                  <DialogTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    Analise da loja
                  </DialogTitle>

                  {tentativasAnteriores > 0 ? (
                    <Badge variant="destructive" className="flex items-center gap-1 font-bold">
                      <AlertOctagon className="h-3.5 w-3.5" />
                      {tentativasAnteriores + 1}a tentativa
                    </Badge>
                  ) : null}
                </div>

                <DialogDescription>
                  Revise os dados informados pelo lojista antes de aprovar ou recusar.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                    {selecionada.logo_url ? (
                      <img
                        src={selecionada.logo_url}
                        alt={selecionada.nome_loja}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          (event.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Store className="h-8 w-8 text-emerald-600/40" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selecionada.nome_loja}</h3>
                    {selecionada.categoria ? (
                      <Badge variant="outline" className="mt-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                        <Tag className="mr-1 h-3 w-3" />
                        {selecionada.categoria}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo icon={Building2} rotulo="Razao social / nome" valor={selecionada.nome_loja} />
                  <Campo icon={FileText} rotulo="CNPJ" valor={selecionada.cnpj} />
                  <Campo icon={Phone} rotulo="Contato comercial" valor={selecionada.whatsapp} />
                  <Campo icon={Instagram} rotulo="Instagram" valor={selecionada.instagram} />
                  <Campo
                    icon={MapPin}
                    rotulo="Localizacao"
                    valor={[selecionada.cidade, selecionada.estado].filter(Boolean).join(" - ")}
                  />
                  <Campo icon={Clock} rotulo="Horario de atendimento" valor={selecionada.horario_atendimento} />
                </div>

                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Descricao</p>
                  <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                    {selecionada.descricao || "Nenhuma descricao informada."}
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                  onClick={() => setConfirmRecusar(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Recusar loja
                </Button>
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setConfirmAprovar(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprovar loja
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmAprovar} onOpenChange={setConfirmAprovar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprovacao?</AlertDialogTitle>
            <AlertDialogDescription>
              A loja <strong>{selecionada?.nome_loja}</strong> ficara ativa no marketplace e o lojista podera acessar o
              painel de gerenciamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void aprovar();
              }}
              disabled={processando}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar aprovacao"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmRecusar}
        onOpenChange={(open) => {
          setConfirmRecusar(open);
          if (!open) setMotivo("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar solicitacao?</AlertDialogTitle>
            <AlertDialogDescription>
              Informe uma justificativa objetiva. O lojista vera esse motivo no fluxo de correcao e podera reenviar a
              loja com os dados ajustados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-1">
            <Label className="text-sm font-bold text-slate-700">Motivo da recusa *</Label>
            <Textarea
              rows={3}
              placeholder="Ex.: CNPJ invalido, logotipo fora dos padroes, dados de contato inconsistentes..."
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              className="mt-1 resize-none"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void recusar();
              }}
              disabled={processando}
              className="bg-red-600 hover:bg-red-700"
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar recusa"}
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
      <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {rotulo}
      </p>
      <p className="text-sm font-medium text-slate-800">{valor || "—"}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "emerald",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "emerald" | "amber" | "slate";
}) {
  const classes = {
    emerald: "border-emerald-100 bg-emerald-50/60",
    amber: "border-amber-100 bg-amber-50/70",
    slate: "border-slate-200 bg-slate-50",
  }[tone];

  return (
    <Card className={`border shadow-sm ${classes}`}>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
        <p className="mt-3 text-sm text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}
