import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileJson,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  TerminalSquare,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { type AdminActivityRow, type AdminAiRunRow, formatAdminAction } from "@/lib/admin";
import { toast } from "sonner";

interface WebhookEventRow {
  id: string;
  gateway: string;
  event_id: string;
  topic: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

interface SecurityEventRow {
  id: string;
  source: string;
  event_type: string;
  severity: string;
  actor_user_id: string | null;
  identifier_hash: string | null;
  ip_hash: string | null;
  message: string;
  metadata: unknown;
  created_at: string;
  total_rows: number;
}

interface AppErrorEventRow {
  id: string;
  source: string;
  function_name: string;
  severity: string;
  error_code: string | null;
  message: string;
  request_path: string | null;
  request_method: string | null;
  actor_user_id: string | null;
  metadata: unknown;
  created_at: string;
  total_rows: number;
}

const PAGE_SIZE = 12;
const FAILURE_STATUSES = new Set(["failed", "error"]);
const PENDING_STATUSES = new Set(["pending", "processing", "started"]);

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

function shorten(value?: string | null, size = 8) {
  if (!value) return "—";
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

function normalizeStatus(status?: string | null) {
  const value = String(status || "").toLowerCase();
  if (value === "completed" || value === "success") return "Concluido";
  if (value === "failed" || value === "error") return "Falhou";
  if (value === "started") return "Iniciado";
  if (value === "processing") return "Processando";
  if (value === "pending") return "Pendente";
  return value || "Indefinido";
}

function extractPayloadSummary(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Sem payload adicional";

  const data = payload as Record<string, unknown>;

  if (typeof data.error === "string" && data.error) return data.error;
  if (typeof data.file_name === "string" && data.file_name) return data.file_name;
  if (typeof data.nome_arquivo === "string" && data.nome_arquivo) return data.nome_arquivo;

  const keys = Object.keys(data).slice(0, 3);
  return keys.length > 0 ? keys.join(" • ") : "Sem detalhes";
}

export default function LogsIA() {
  const [rows, setRows] = useState<AdminAiRunRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEventRow[]>([]);
  const [activity, setActivity] = useState<AdminActivityRow[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEventRow[]>([]);
  const [appErrors, setAppErrors] = useState<AppErrorEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [selected, setSelected] = useState<AdminAiRunRow | null>(null);

  async function carregar(forced = false) {
    if (forced) setRefreshing(true);
    else setLoading(true);

    try {
      const [
        { data: runsData, error: runsError },
        { data: webhookData, error: webhookError },
        { data: activityData, error: activityError },
        { data: securityData, error: securityError },
        { data: appErrorData, error: appErrorError },
      ] =
        await Promise.all([
          supabase.rpc("admin_list_ai_runs", {
            _query: search.trim() || null,
            _status: statusFilter === "todos" ? null : statusFilter,
            _limit: PAGE_SIZE,
            _offset: (page - 1) * PAGE_SIZE,
          }),
          supabase
            .from("webhook_events")
            .select("id, gateway, event_id, topic, status, attempts, last_error, created_at")
            .order("created_at", { ascending: false })
            .limit(8),
          supabase.rpc("admin_activity_feed", { _limit: 6 }),
          supabase.rpc("admin_list_security_events", {
            _query: search.trim() || null,
            _limit: 6,
            _offset: 0,
          }),
          supabase.rpc("admin_list_app_error_events", {
            _query: search.trim() || null,
            _limit: 6,
            _offset: 0,
          }),
        ]);

      if (runsError) throw runsError;
      if (webhookError) throw webhookError;
      if (activityError) throw activityError;
      if (securityError) throw securityError;
      if (appErrorError) throw appErrorError;

      const runRows = (runsData as AdminAiRunRow[]) ?? [];
      setRows(runRows);
      setTotalRows(runRows[0]?.total_rows ?? 0);
      setWebhooks((webhookData as WebhookEventRow[]) ?? []);
      setActivity((activityData as AdminActivityRow[]) ?? []);
      setSecurityEvents((securityData as SecurityEventRow[]) ?? []);
      setAppErrors((appErrorData as AppErrorEventRow[]) ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel carregar os logs operacionais.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void carregar();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [page, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const summary = useMemo(() => {
    const failures = rows.filter((row) => FAILURE_STATUSES.has(row.status)).length;
    const pending = rows.filter((row) => PENDING_STATUSES.has(row.status)).length;
    const success = rows.filter(
      (row) => !FAILURE_STATUSES.has(row.status) && !PENDING_STATUSES.has(row.status),
    ).length;
    const successRate = rows.length > 0 ? ((success / rows.length) * 100).toFixed(1) : "0.0";

    return {
      failures,
      pending,
      success,
      successRate,
      webhookFailures: webhooks.filter((row) => row.status === "failed").length,
      securityAlerts: securityEvents.filter((row) => row.severity === "warning" || row.severity === "critical").length,
      appErrors: appErrors.filter((row) => row.severity === "error" || row.severity === "critical").length,
    };
  }, [appErrors, rows, securityEvents, webhooks]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Observabilidade</p>
          <h2 className="mt-1 flex items-center gap-3 text-3xl font-extrabold text-slate-900">
            <TerminalSquare className="h-8 w-8 text-emerald-600" />
            Logs, IA e auditoria
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Acompanhe execucoes do pipeline, falhas de webhook e a trilha recente de acoes administrativas.
          </p>
        </div>

        <Button
          variant="outline"
          className="border-slate-200 bg-white"
          onClick={() => void carregar(true)}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CheckCircle2}
          title="Taxa de sucesso"
          value={`${summary.successRate}%`}
          detail={`${summary.success} concluidas no recorte atual`}
          tone="emerald"
        />
        <MetricCard
          icon={AlertTriangle}
          title="Falhas recentes"
          value={summary.failures.toLocaleString("pt-BR")}
          detail="Execucoes com erro na pagina atual"
          tone="red"
        />
        <MetricCard
          icon={Cpu}
          title="Em processamento"
          value={summary.pending.toLocaleString("pt-BR")}
          detail="Pipelines ainda sem fechamento"
          tone="amber"
        />
        <MetricCard
          icon={ShieldAlert}
          title="Webhooks com falha"
          value={summary.webhookFailures.toLocaleString("pt-BR")}
          detail="Eventos recentes do gateway"
          tone="slate"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          icon={ShieldAlert}
          title="Alertas de seguranca"
          value={summary.securityAlerts.toLocaleString("pt-BR")}
          detail="Eventos suspeitos ou bloqueios recentes"
          tone="amber"
        />
        <MetricCard
          icon={AlertTriangle}
          title="Erros centralizados"
          value={summary.appErrors.toLocaleString("pt-BR")}
          detail="Falhas recentes registradas no backend"
          tone="red"
        />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por projeto, usuario, etapa ou ID..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todos">Todos os status</option>
              <option value="completed">Concluido</option>
              <option value="failed">Falhou</option>
              <option value="started">Iniciado</option>
              <option value="processing">Processando</option>
              <option value="pending">Pendente</option>
            </select>

            <Badge variant="outline" className="border-slate-200 bg-white px-3 py-2 text-slate-700">
              {totalRows.toLocaleString("pt-BR")} registros
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Data</th>
                <th className="px-6 py-4 font-semibold">Projeto / Usuario</th>
                <th className="px-6 py-4 font-semibold">Etapa</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Detalhe rapido</th>
                <th className="px-6 py-4 text-right font-semibold">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                    <p className="mt-3 text-sm text-slate-500">Carregando execucoes...</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-500">
                    Nenhum log encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <p>{formatDateTime(row.created_at)}</p>
                      <p className="mt-1 text-xs text-slate-400">analise {shorten(row.analysis_id)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{row.project_name || "Projeto sem nome"}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {row.owner_name || "Usuario"} • {row.owner_email || shorten(row.owner_user_id)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium capitalize text-slate-800">{row.stage.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-xs text-slate-400">doc {shorten(row.document_id)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-xs text-sm text-slate-600">
                        {row.error_message || extractPayloadSummary(row.payload_json)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" className="border-slate-200 bg-white" onClick={() => setSelected(row)}>
                        <FileJson className="mr-2 h-4 w-4" />
                        JSON
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Pagina {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-slate-200 bg-white"
              disabled={page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              className="border-slate-200 bg-white"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Proxima
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gateway</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Eventos de webhook</h3>
            </div>

            <div className="space-y-3">
              {webhooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  Nenhum webhook recente encontrado.
                </div>
              ) : (
                webhooks.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {event.gateway} • {event.topic || "sem topico"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{shorten(event.event_id, 10)}</p>
                      </div>
                      <StatusBadge status={event.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{formatDateTime(event.created_at)}</span>
                      <span>{event.attempts} tentativa(s)</span>
                      {event.last_error ? <span className="text-red-600">{event.last_error}</span> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Seguranca</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Eventos sensiveis recentes</h3>
            </div>

            <div className="space-y-3">
              {securityEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  Nenhum evento de seguranca recente.
                </div>
              ) : (
                securityEvents.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.source} • {item.event_type.replace(/_/g, " ")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                      </div>
                      <SeverityBadge severity={item.severity} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{formatDateTime(item.created_at)}</span>
                      {item.actor_user_id ? <span>ator {shorten(item.actor_user_id)}</span> : null}
                      {item.ip_hash ? <span>ip {shorten(item.ip_hash, 6)}</span> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Falhas</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Erros do backend</h3>
            </div>

            <div className="space-y-3">
              {appErrors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  Nenhum erro centralizado no recorte atual.
                </div>
              ) : (
                appErrors.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.function_name}
                          {item.error_code ? ` • ${item.error_code}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                      </div>
                      <SeverityBadge severity={item.severity} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{formatDateTime(item.created_at)}</span>
                      {item.request_method || item.request_path ? (
                        <span>
                          {item.request_method || "REQ"} {item.request_path || "sem rota"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Auditoria</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Acoes administrativas recentes</h3>
            </div>

            <div className="space-y-3">
              {activity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  Nenhuma acao administrativa recente.
                </div>
              ) : (
                activity.map((item) => (
                  <div key={`${item.source}-${item.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatAdminAction(item.action)}{" "}
                      <span className="font-normal text-slate-500">por {item.actor_label}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.target_label || item.target_type}
                      {item.details ? ` • ${item.details}` : ""}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <Activity className="h-3.5 w-3.5" />
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-emerald-600" />
              Payload da execucao
            </DialogTitle>
            <DialogDescription>
              {selected ? `${selected.project_name || "Projeto"} • ${selected.stage}` : "Detalhes da execucao"}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Meta label="Criado em" value={formatDateTime(selected.created_at)} />
                <Meta label="Atualizado em" value={formatDateTime(selected.updated_at)} />
                <Meta label="Status" value={normalizeStatus(selected.status)} />
                <Meta label="Documento" value={selected.document_id || "—"} />
              </div>

              {selected.error_message ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {selected.error_message}
                </div>
              ) : null}

              <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {JSON.stringify(selected.payload_json ?? {}, null, 2)}
              </pre>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
  detail: string;
  tone: "emerald" | "red" | "amber" | "slate";
}) {
  const toneClass = {
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
          </div>
          <div className={`rounded-2xl p-3 ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const value = String(status || "").toLowerCase();
  const className = FAILURE_STATUSES.has(value)
    ? "border-red-200 bg-red-50 text-red-700"
    : PENDING_STATUSES.has(value)
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <Badge variant="outline" className={className}>
      {normalizeStatus(status)}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const value = String(severity || "").toLowerCase();
  const className =
    value === "critical"
      ? "border-red-200 bg-red-50 text-red-700"
      : value === "error"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : value === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <Badge variant="outline" className={className}>
      {value === "critical" ? "Critico" : value === "error" ? "Erro" : value === "warning" ? "Alerta" : "Info"}
    </Badge>
  );
}
