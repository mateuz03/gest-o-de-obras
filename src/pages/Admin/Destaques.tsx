import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Loader2,
  MessageSquareWarning,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Wallet,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  filterFeaturedItems,
  filterMarketplaceReports,
  type AdminFeaturedItemRow,
  type AdminMarketplaceReportRow,
} from "@/lib/admin";
import { toast } from "sonner";

interface PaymentRow {
  id: string;
  user_id: string;
  target_id: string | null;
  purpose: string;
  status: string;
  valor: number;
  created_at: string;
  expires_at: string | null;
  paid_at: string | null;
  user_name?: string;
}

interface ProfileLookupRow {
  user_id: string;
  nome: string | null;
  nome_completo: string | null;
  nome_empresa: string | null;
}

const REPORT_PAGE_SIZE = 10;
const REPORT_FETCH_LIMIT = 200;

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function resolvePaymentPurpose(purpose: string) {
  if (purpose === "destaque_produto") return "Destaque de anuncio";
  if (purpose === "destaque_loja") return "Destaque de loja";
  if (purpose === "plano_pro") return "Plano Pro";
  return purpose;
}

function isHighlightActive(row: AdminFeaturedItemRow) {
  return row.is_featured && !!row.featured_until && new Date(row.featured_until) > new Date();
}

function reportFilterMatch(row: AdminMarketplaceReportRow, filter: string) {
  if (filter === "todos") return true;
  if (filter === "pendentes") return row.status === "pending";
  if (filter === "analise") return row.status === "reviewing";
  if (filter === "resolvidas") return row.status === "resolved";
  return row.status === "dismissed";
}

function moderationStatusLabel(status: string) {
  if (status === "resolved") return "Resolvido";
  if (status === "dismissed") return "Descartado";
  return "Em analise";
}

export default function Destaques() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredRows, setFeaturedRows] = useState<AdminFeaturedItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [reports, setReports] = useState<AdminMarketplaceReportRow[]>([]);
  const [reportFilter, setReportFilter] = useState("todos");
  const [reportQuery, setReportQuery] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [reportTotalRows, setReportTotalRows] = useState(0);
  const [featuredQuery, setFeaturedQuery] = useState("");

  const [editingFeatured, setEditingFeatured] = useState<AdminFeaturedItemRow | null>(null);
  const [novaData, setNovaData] = useState("");
  const [novoStatus, setNovoStatus] = useState(true);
  const [justificativa, setJustificativa] = useState("");
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [confirmFeaturedOpen, setConfirmFeaturedOpen] = useState(false);

  const [moderatingReport, setModeratingReport] = useState<AdminMarketplaceReportRow | null>(null);
  const [moderationStatus, setModerationStatus] = useState("reviewing");
  const [moderationReason, setModerationReason] = useState("");
  const [hideTarget, setHideTarget] = useState(false);
  const [savingModeration, setSavingModeration] = useState(false);
  const [confirmModerationOpen, setConfirmModerationOpen] = useState(false);

  async function carregar(forced = false) {
    if (forced) setRefreshing(true);
    else setLoading(true);

    try {
      const [
        { data: productData, error: productError },
        { data: storeData, error: storeError },
        { data: paymentData, error: paymentError },
        { data: reportData, error: reportError },
      ] = await Promise.all([
        supabase
          .from("produtos_loja")
          .select("id, nome_produto, is_featured, featured_until")
          .or("is_featured.eq.true,featured_until.not.is.null")
          .order("featured_until", { ascending: false }),
        supabase
          .from("perfil_lojista")
          .select("user_id, nome_loja, is_premium, featured_until")
          .or("is_premium.eq.true,featured_until.not.is.null")
          .order("featured_until", { ascending: false }),
        supabase
          .from("pix_payments")
          .select("id, user_id, target_id, purpose, status, valor, created_at, expires_at, paid_at")
          .in("purpose", ["destaque_produto", "destaque_loja", "plano_pro"])
          .order("created_at", { ascending: false })
          .limit(12),
        supabase.rpc("admin_list_marketplace_reports", {
          _limit: REPORT_FETCH_LIMIT,
          _offset: 0,
          _status: null,
        }),
      ]);

      if (productError) throw productError;
      if (storeError) throw storeError;
      if (paymentError) throw paymentError;
      if (reportError) throw reportError;

      const paymentRows = (paymentData ?? []) as PaymentRow[];
      const userIds = Array.from(new Set(paymentRows.map((row) => row.user_id).filter(Boolean)));

      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, nome, nome_completo, nome_empresa")
          .in("user_id", userIds);

        if (profileError) throw profileError;

        profileMap = new Map(
          ((profiles ?? []) as ProfileLookupRow[]).map((profile) => [
            profile.user_id,
            profile.nome_completo || profile.nome_empresa || profile.nome || "Usuario",
          ]),
        );
      }

      setFeaturedRows([
        ...((productData ?? []).map((row) => ({
          type: "produto" as const,
          id: row.id,
          nome: row.nome_produto,
          is_featured: Boolean(row.is_featured),
          featured_until: row.featured_until,
        })) ?? []),
        ...((storeData ?? []).map((row) => ({
          type: "loja" as const,
          id: row.user_id,
          nome: row.nome_loja,
          is_featured: Boolean(row.is_premium),
          featured_until: row.featured_until,
        })) ?? []),
      ]);

      setPayments(
        paymentRows.map((row) => ({
          ...row,
          valor: Number(row.valor),
          user_name: profileMap.get(row.user_id) || shorten(row.user_id),
        })),
      );

      const reportRows = (reportData as AdminMarketplaceReportRow[]) ?? [];
      setReports(reportRows);
      setReportTotalRows(reportRows[0]?.total_rows ?? 0);
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel carregar a moderacao do marketplace.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    setReportPage(1);
  }, [reportFilter, reportQuery]);

  const filteredFeaturedRows = useMemo(
    () => filterFeaturedItems(featuredRows, featuredQuery),
    [featuredQuery, featuredRows],
  );

  const filteredReports = useMemo(() => {
    const statusFiltered = reports.filter((row) => reportFilterMatch(row, reportFilter));
    return filterMarketplaceReports(statusFiltered, reportQuery);
  }, [reportFilter, reportQuery, reports]);

  const paginatedReports = useMemo(
    () => filteredReports.slice((reportPage - 1) * REPORT_PAGE_SIZE, reportPage * REPORT_PAGE_SIZE),
    [filteredReports, reportPage],
  );

  const summary = useMemo(() => {
    const featuredActive = featuredRows.filter(isHighlightActive).length;
    const featuredExpired = featuredRows.length - featuredActive;
    const openReports = reports.filter((row) => row.status === "pending" || row.status === "reviewing").length;
    const openPayments = payments.filter((row) => row.status === "pending" || row.status === "processing").length;

    return {
      featuredActive,
      featuredExpired,
      openReports,
      openPayments,
      paidPayments: payments.filter((row) => row.status === "paid").length,
    };
  }, [featuredRows, payments, reports]);

  const totalReportPages = Math.max(1, Math.ceil(filteredReports.length / REPORT_PAGE_SIZE));

  function abrirEdicaoFeatured(row: AdminFeaturedItemRow) {
    setEditingFeatured(row);
    setNovoStatus(row.is_featured);
    setNovaData(row.featured_until ? new Date(row.featured_until).toISOString().slice(0, 16) : "");
    setJustificativa("");
    setConfirmFeaturedOpen(false);
  }

  function validarFeatured() {
    if (!editingFeatured) return false;
    if (justificativa.trim().length < 3) {
      toast.error("Informe uma justificativa interna para auditoria.");
      return false;
    }
    return true;
  }

  async function salvarFeatured() {
    if (!editingFeatured || !validarFeatured()) return;

    setSavingFeatured(true);
    try {
      const { error } = await supabase.rpc("admin_override_featured", {
        _target_type: editingFeatured.type,
        _target_id: editingFeatured.id,
        _is_featured: novoStatus,
        _featured_until: novaData ? new Date(novaData).toISOString() : null,
        _justificativa: justificativa.trim(),
      });

      if (error) throw error;

      toast.success("Destaque atualizado com sucesso.");
      setConfirmFeaturedOpen(false);
      setEditingFeatured(null);
      await carregar(true);
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel atualizar o destaque.");
    } finally {
      setSavingFeatured(false);
    }
  }

  function abrirModeracao(report: AdminMarketplaceReportRow) {
    setModeratingReport(report);
    setModerationStatus(report.status === "pending" ? "reviewing" : report.status);
    setModerationReason(report.decision_reason || "");
    setHideTarget(report.target_hidden);
    setConfirmModerationOpen(false);
  }

  function validarModeracao() {
    if (!moderatingReport) return false;
    if (moderationReason.trim().length < 5) {
      toast.error("Explique a decisao da moderacao.");
      return false;
    }
    return true;
  }

  async function salvarModeracao() {
    if (!moderatingReport || !validarModeracao()) return;

    setSavingModeration(true);
    try {
      const { error } = await supabase.rpc("admin_moderate_marketplace_report", {
        _report_id: moderatingReport.id,
        _status: moderationStatus,
        _decision_reason: moderationReason.trim(),
        _set_hidden: hideTarget,
      });

      if (error) throw error;

      toast.success("Moderacao registrada.");
      setConfirmModerationOpen(false);
      setModeratingReport(null);
      await carregar(true);
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel concluir a moderacao.");
    } finally {
      setSavingModeration(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Backoffice</p>
          <h2 className="mt-1 flex items-center gap-3 text-3xl font-extrabold text-slate-900">
            <Sparkles className="h-8 w-8 text-amber-500" />
            Destaques, upgrades e moderacao
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Painel para controlar destaques manuais, acompanhar cobrancas Pix e resolver denuncias do marketplace.
          </p>
        </div>

        <Button
          variant="outline"
          className="border-slate-200 bg-white"
          onClick={() => void carregar(true)}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Atualizar painel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Sparkles}
          label="Destaques ativos"
          value={summary.featuredActive.toLocaleString("pt-BR")}
          helper={`${summary.featuredExpired} expirados ou inativos`}
          tone="amber"
        />
        <MetricCard
          icon={MessageSquareWarning}
          label="Denuncias abertas"
          value={summary.openReports.toLocaleString("pt-BR")}
          helper={`${reportTotalRows.toLocaleString("pt-BR")} casos carregados no painel`}
          tone="red"
        />
        <MetricCard
          icon={Wallet}
          label="Pix em aberto"
          value={summary.openPayments.toLocaleString("pt-BR")}
          helper={`${summary.paidPayments} pagamentos confirmados`}
          tone="emerald"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Itens monitorados"
          value={featuredRows.length.toLocaleString("pt-BR")}
          helper="Lojas e anuncios com destaque configurado"
          tone="slate"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Destaques</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Ajustes manuais</h3>
              </div>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                {filteredFeaturedRows.length} de {featuredRows.length} registros
              </Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={featuredQuery}
                onChange={(event) => setFeaturedQuery(event.target.value)}
                placeholder="Buscar por loja ou anuncio destacado..."
                className="pl-9"
              />
            </div>

            <div className="space-y-3">
              {filteredFeaturedRows.length === 0 ? (
                <EmptyState
                  message={
                    featuredRows.length === 0
                      ? "Nenhum destaque registrado ainda."
                      : "Nenhum destaque encontrado para a busca atual."
                  }
                />
              ) : (
                filteredFeaturedRows.map((row) => (
                  <div
                    key={`${row.type}-${row.id}`}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{row.nome}</p>
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                          {row.type === "loja" ? <Store className="mr-1 h-3 w-3" /> : <Package className="mr-1 h-3 w-3" />}
                          {row.type}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {row.featured_until ? formatDateTime(row.featured_until) : "Sem vencimento"}
                        </span>
                        <StatusPill active={isHighlightActive(row)} />
                      </div>
                    </div>

                    <Button variant="outline" className="border-slate-200 bg-white" onClick={() => abrirEdicaoFeatured(row)}>
                      Ajustar destaque
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Upgrades</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Cobrancas e expiracoes</h3>
              </div>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                {payments.length} cobrancas
              </Badge>
            </div>

            <div className="space-y-3">
              {payments.length === 0 ? (
                <EmptyState message="Nenhuma cobranca Pix encontrada." />
              ) : (
                payments.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{resolvePaymentPurpose(row.purpose)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {row.user_name} • alvo {shorten(row.target_id || row.user_id)}
                        </p>
                      </div>
                      <PaymentStatusBadge status={row.status} />
                    </div>

                    <div className="mt-3 grid gap-3 text-sm text-slate-500 sm:grid-cols-3">
                      <InfoPill label="Valor" value={formatCurrency(row.valor)} />
                      <InfoPill label="Criado em" value={formatDateTime(row.created_at)} />
                      <InfoPill
                        label={row.status === "paid" ? "Pago em" : "Expira em"}
                        value={formatDateTime(row.status === "paid" ? row.paid_at : row.expires_at)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Moderacao</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Denuncias do marketplace</h3>
              <p className="mt-2 text-sm text-slate-500">
                Busca aplicada sobre os casos carregados no painel. Se houver mais de {REPORT_FETCH_LIMIT} registros,
                os mais recentes aparecem primeiro.
              </p>
            </div>

            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={reportQuery}
                  onChange={(event) => setReportQuery(event.target.value)}
                  placeholder="Buscar por alvo, reporter, motivo ou dono..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={reportFilter === "todos"}
              onClick={() => {
                setReportFilter("todos");
              }}
            >
              Todos
            </FilterButton>
            <FilterButton
              active={reportFilter === "pendentes"}
              onClick={() => {
                setReportFilter("pendentes");
              }}
            >
              Pendentes
            </FilterButton>
            <FilterButton
              active={reportFilter === "analise"}
              onClick={() => {
                setReportFilter("analise");
              }}
            >
              Em analise
            </FilterButton>
            <FilterButton
              active={reportFilter === "resolvidas"}
              onClick={() => {
                setReportFilter("resolvidas");
              }}
            >
              Resolvidas
            </FilterButton>
            <FilterButton
              active={reportFilter === "descartadas"}
              onClick={() => {
                setReportFilter("descartadas");
              }}
            >
              Descartadas
            </FilterButton>
          </div>

          <div className="space-y-4">
            {paginatedReports.length === 0 ? (
              <EmptyState message="Nenhuma denuncia encontrada para os filtros atuais." />
            ) : (
              paginatedReports.map((report) => (
                <div key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{report.target_name || "Item sem nome"}</p>
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                          {report.target_type}
                        </Badge>
                        <ReportStatusBadge status={report.status} />
                        {report.target_hidden ? <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Oculto</Badge> : null}
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        <strong className="text-slate-700">Motivo:</strong> {report.reason}
                      </p>
                      {report.details ? <p className="mt-2 text-sm leading-6 text-slate-500">{report.details}</p> : null}

                      <div className="mt-3 grid gap-3 text-xs text-slate-400 sm:grid-cols-3">
                        <span>Reporter: {report.reporter_name || report.reporter_email || shorten(report.reporter_id)}</span>
                        <span>Dono: {report.target_owner_name || shorten(report.target_owner_id)}</span>
                        <span>Criado em: {formatDateTime(report.created_at)}</span>
                      </div>

                      {report.decision_reason ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                          <span className="font-semibold text-slate-800">Ultima decisao:</span> {report.decision_reason}
                        </div>
                      ) : null}
                    </div>

                    <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => abrirModeracao(report)}>
                      Moderar caso
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Pagina {reportPage} de {totalReportPages} • {filteredReports.length.toLocaleString("pt-BR")} casos no recorte
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-slate-200 bg-white"
                disabled={reportPage <= 1}
                onClick={() => setReportPage((prev) => prev - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                className="border-slate-200 bg-white"
                disabled={reportPage >= totalReportPages}
                onClick={() => setReportPage((prev) => prev + 1)}
              >
                Proxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editingFeatured}
        onOpenChange={(open) => {
          if (!open && !savingFeatured) {
            setEditingFeatured(null);
            setConfirmFeaturedOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Ajuste manual de destaque
            </DialogTitle>
            <DialogDescription>Toda alteracao manual fica registrada na trilha de auditoria.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">Destaque ativo</p>
                <p className="text-sm text-slate-500">Ative ou revogue o destaque manualmente.</p>
              </div>
              <Switch checked={novoStatus} onCheckedChange={setNovoStatus} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured-until">Destacado ate</Label>
              <Input id="featured-until" type="datetime-local" value={novaData} onChange={(event) => setNovaData(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured-reason">Justificativa interna</Label>
              <Textarea
                id="featured-reason"
                rows={4}
                value={justificativa}
                onChange={(event) => setJustificativa(event.target.value)}
                placeholder="Ex.: compensacao por instabilidade no pagamento ou campanha comercial."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingFeatured(null)} disabled={savingFeatured}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                if (validarFeatured()) setConfirmFeaturedOpen(true);
              }}
              disabled={savingFeatured}
            >
              Salvar alteracao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmFeaturedOpen} onOpenChange={setConfirmFeaturedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ajuste manual?</AlertDialogTitle>
            <AlertDialogDescription>
              {editingFeatured ? (
                <>
                  {novoStatus ? "Ativar" : "Revogar"} o destaque de <strong>{editingFeatured.nome}</strong> como{" "}
                  <strong>{editingFeatured.type}</strong>
                  {novaData ? ` ate ${formatDateTime(new Date(novaData).toISOString())}` : " sem vencimento definido"}.
                </>
              ) : (
                "Revise os dados antes de confirmar."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingFeatured}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void salvarFeatured();
              }}
              disabled={savingFeatured}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingFeatured ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar ajuste"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!moderatingReport}
        onOpenChange={(open) => {
          if (!open && !savingModeration) {
            setModeratingReport(null);
            setConfirmModerationOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Moderar denuncia</DialogTitle>
            <DialogDescription>
              Defina o status final do caso e, se necessario, altere a visibilidade do anuncio ou loja.
            </DialogDescription>
          </DialogHeader>

          {moderatingReport ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alvo</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {moderatingReport.target_name || moderatingReport.target_type}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {moderatingReport.details || "Sem detalhe adicional do reporter."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="moderation-status">Status do caso</Label>
                  <select
                    id="moderation-status"
                    value={moderationStatus}
                    onChange={(event) => setModerationStatus(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="reviewing">Em analise</option>
                    <option value="resolved">Resolvido</option>
                    <option value="dismissed">Descartado</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">Ocultar alvo</p>
                      <p className="text-sm text-slate-500">Remove o item da vitrine publica.</p>
                    </div>
                    <Switch checked={hideTarget} onCheckedChange={setHideTarget} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moderation-reason">Decisao interna</Label>
                <Textarea
                  id="moderation-reason"
                  rows={5}
                  value={moderationReason}
                  onChange={(event) => setModerationReason(event.target.value)}
                  placeholder="Explique o motivo da decisao, o que foi verificado e se o alvo ficou oculto."
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModeratingReport(null)} disabled={savingModeration}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                if (validarModeracao()) setConfirmModerationOpen(true);
              }}
              disabled={savingModeration}
            >
              Salvar moderacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmModerationOpen} onOpenChange={setConfirmModerationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar moderacao?</AlertDialogTitle>
            <AlertDialogDescription>
              {moderatingReport ? (
                <>
                  O caso de <strong>{moderatingReport.target_name || moderatingReport.target_type}</strong> sera salvo
                  como <strong>{moderationStatusLabel(moderationStatus)}</strong>
                  {hideTarget ? " com o alvo oculto da vitrine publica." : " sem alterar a visibilidade publica."}
                </>
              ) : (
                "Revise os dados antes de confirmar."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingModeration}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void salvarModeracao();
              }}
              disabled={savingModeration}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingModeration ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar moderacao"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function shorten(value?: string | null, size = 8) {
  if (!value) return "—";
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  tone: "amber" | "red" | "emerald" | "slate";
}) {
  const toneClass = {
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
          </div>
          <div className={`rounded-2xl p-3 ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return active ? (
    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Destaque ativo</Badge>
  ) : (
    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
      Expirado ou inativo
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const value = status.toLowerCase();
  const className =
    value === "paid"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "failed"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <Badge variant="outline" className={className}>
      {value === "paid" ? "Pago" : value === "failed" ? "Falhou" : "Aberto"}
    </Badge>
  );
}

function ReportStatusBadge({ status }: { status: string }) {
  const value = status.toLowerCase();
  const className =
    value === "resolved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "dismissed"
        ? "border-slate-200 bg-slate-100 text-slate-700"
        : value === "reviewing"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-700";

  const label =
    value === "resolved"
      ? "Resolvida"
      : value === "dismissed"
        ? "Descartada"
        : value === "reviewing"
          ? "Em analise"
          : "Pendente";

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
