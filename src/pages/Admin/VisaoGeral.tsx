import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  type AdminActivityRow,
  type AdminDashboardSnapshot,
  formatAdminAction,
} from "@/lib/admin";
import { toast } from "sonner";

const EMPTY_SNAPSHOT: AdminDashboardSnapshot = {
  users: {
    total: 0,
    cpf: 0,
    cnpj: 0,
    active: 0,
    suspended: 0,
    banned: 0,
    admins: 0,
  },
  marketplace: {
    pendingStores: 0,
    approvedStores: 0,
    hiddenStores: 0,
    activeProducts: 0,
    hiddenProducts: 0,
    featuredProducts: 0,
    featuredStores: 0,
    pendingReports: 0,
    openPixCharges: 0,
    paidPixCharges: 0,
  },
  operations: {
    analyses: 0,
    analysesLast30Days: 0,
    aiFailuresLast7Days: 0,
    aiPendingRuns: 0,
    webhookFailures: 0,
    blogPosts: 0,
    sinapiUploads: 0,
    latestSinapiUpload: null,
  },
  flags: {
    maintenanceMode: false,
    sellerOnboardingOpen: true,
  },
};

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

export default function VisaoGeral() {
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot>(EMPTY_SNAPSHOT);
  const [activity, setActivity] = useState<AdminActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function carregar(forced = false) {
    if (forced) setRefreshing(true);
    else setLoading(true);

    try {
      const [{ data: snapshotData, error: snapshotError }, { data: activityData, error: activityError }] = await Promise.all([
        supabase.rpc("admin_dashboard_snapshot"),
        supabase.rpc("admin_activity_feed", { _limit: 8 }),
      ]);

      if (snapshotError) throw snapshotError;
      if (activityError) throw activityError;

      setSnapshot((snapshotData as AdminDashboardSnapshot) ?? EMPTY_SNAPSHOT);
      setActivity((activityData as AdminActivityRow[]) ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar os indicadores do backoffice.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const healthTone = useMemo(() => {
    if (snapshot.flags.maintenanceMode) return "text-amber-700 bg-amber-50 border-amber-200";
    if (snapshot.operations.webhookFailures > 0 || snapshot.operations.aiFailuresLast7Days > 0) {
      return "text-red-700 bg-red-50 border-red-200";
    }
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
  }, [snapshot]);

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
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Centro de comando</p>
          <h2 className="mt-1 text-3xl font-extrabold text-slate-900">Visão geral do ecossistema</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Contadores operacionais, saúde da plataforma e sinais rápidos para decidir o que o time admin precisa atacar primeiro.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge className={`border px-3 py-1 text-sm font-semibold ${healthTone}`}>
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            {snapshot.flags.maintenanceMode ? "Manutenção ativa" : "Operação monitorada"}
          </Badge>
          <Button
            variant="outline"
            className="border-slate-200 bg-white"
            onClick={() => {
              void carregar(true);
            }}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar painel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          title="Usuários cadastrados"
          value={snapshot.users.total.toLocaleString("pt-BR")}
          detail={`${snapshot.users.cpf} CPF • ${snapshot.users.cnpj} CNPJ • ${snapshot.users.admins} admins`}
        />
        <MetricCard
          icon={Store}
          title="Lojas pendentes"
          value={snapshot.marketplace.pendingStores.toLocaleString("pt-BR")}
          detail={`${snapshot.marketplace.approvedStores} aprovadas • ${snapshot.marketplace.hiddenStores} ocultas`}
        />
        <MetricCard
          icon={ShoppingBag}
          title="Anúncios ativos"
          value={snapshot.marketplace.activeProducts.toLocaleString("pt-BR")}
          detail={`${snapshot.marketplace.featuredProducts} em destaque • ${snapshot.marketplace.pendingReports} denúncias abertas`}
        />
        <MetricCard
          icon={BarChart3}
          title="Análises em 30 dias"
          value={snapshot.operations.analysesLast30Days.toLocaleString("pt-BR")}
          detail={`${snapshot.operations.analyses.toLocaleString("pt-BR")} análises no histórico`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Marketplace & Operação</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Fila crítica e receita operacional</h3>
              </div>
              <Button asChild variant="ghost" className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                <Link to="/admin/destaques">
                  Abrir moderação
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <StatusTile
                label="Destaques ativos"
                value={(snapshot.marketplace.featuredProducts + snapshot.marketplace.featuredStores).toLocaleString("pt-BR")}
                helper={`${snapshot.marketplace.featuredProducts} anúncios • ${snapshot.marketplace.featuredStores} lojas`}
              />
              <StatusTile
                label="Cobranças Pix em aberto"
                value={snapshot.marketplace.openPixCharges.toLocaleString("pt-BR")}
                helper={`${snapshot.marketplace.paidPixCharges} pagamentos confirmados`}
              />
              <StatusTile
                label="Falhas IA últimos 7 dias"
                value={snapshot.operations.aiFailuresLast7Days.toLocaleString("pt-BR")}
                helper={`${snapshot.operations.aiPendingRuns} execuções ainda em processamento`}
              />
              <StatusTile
                label="Posts publicados"
                value={snapshot.operations.blogPosts.toLocaleString("pt-BR")}
                helper="Conteúdo vivo para aquisição e retenção"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Última carga SINAPI</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {snapshot.operations.latestSinapiUpload?.nome_arquivo ?? "Nenhuma importação registrada"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`border ${
                    snapshot.operations.latestSinapiUpload?.status === "concluido"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {snapshot.operations.latestSinapiUpload?.status ?? "Sem status"}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoPill
                  label="Itens"
                  value={(snapshot.operations.latestSinapiUpload?.qtd_itens ?? 0).toLocaleString("pt-BR")}
                />
                <InfoPill
                  label="Região"
                  value={snapshot.operations.latestSinapiUpload?.regiao || "—"}
                />
                <InfoPill
                  label="Processado em"
                  value={formatDateTime(snapshot.operations.latestSinapiUpload?.created_at)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-6 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Saúde da plataforma</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Sinais rápidos de risco</h3>
            </div>

            <div className="space-y-3">
              <HealthRow
                icon={Activity}
                label="Webhooks falhando"
                value={snapshot.operations.webhookFailures}
                tone={snapshot.operations.webhookFailures > 0 ? "danger" : "ok"}
              />
              <HealthRow
                icon={AlertTriangle}
                label="Denúncias pendentes"
                value={snapshot.marketplace.pendingReports}
                tone={snapshot.marketplace.pendingReports > 0 ? "warning" : "ok"}
              />
              <HealthRow
                icon={Boxes}
                label="Itens SINAPI processados"
                value={snapshot.operations.sinapiUploads}
                tone="neutral"
              />
              <HealthRow
                icon={ShieldCheck}
                label="Cadastro de lojas"
                value={snapshot.flags.sellerOnboardingOpen ? "Aberto" : "Pausado"}
                tone={snapshot.flags.sellerOnboardingOpen ? "ok" : "warning"}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Contas com restrição</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                  {snapshot.users.suspended} suspensas
                </Badge>
                <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                  {snapshot.users.banned} banidas
                </Badge>
                <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                  {snapshot.users.active} ativas
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Auditoria</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Últimas ações administrativas</h3>
            </div>
            <Button asChild variant="ghost" className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
              <Link to="/admin/logs-ia">
                Ver trilha completa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {activity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
              Nenhuma ação administrativa registrada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatAdminAction(item.action)}{" "}
                      <span className="font-normal text-slate-500">por {item.actor_label}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.target_label || item.target_type}
                      {item.details ? ` • ${item.details}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs font-medium text-slate-400">
                    {formatDateTime(item.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function StatusTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
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

function HealthRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: "ok" | "warning" | "danger" | "neutral";
}) {
  const toneClass = {
    ok: "text-emerald-700 bg-emerald-50",
    warning: "text-amber-700 bg-amber-50",
    danger: "text-red-700 bg-red-50",
    neutral: "text-slate-700 bg-slate-100",
  }[tone];

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}
