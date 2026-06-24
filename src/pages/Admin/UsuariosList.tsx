import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserCog,
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  formatAccountStatus,
  formatAccountType,
  formatPlan,
  type AdminUserRow,
} from "@/lib/admin";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDocument(row: AdminUserRow) {
  return row.account_type === "PJ" ? row.cnpj || "—" : row.cpf || "—";
}

export default function UsuariosList() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [planFilter, setPlanFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [editedStatus, setEditedStatus] = useState("active");
  const [editedPlan, setEditedPlan] = useState("free");
  const [editedPlanUntil, setEditedPlanUntil] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  async function carregar(forced = false) {
    if (forced) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase.rpc("admin_list_users", {
        _query: search.trim() || null,
        _account_type: accountTypeFilter === "todos" ? null : accountTypeFilter,
        _status: statusFilter === "todos" ? null : statusFilter,
        _plan: planFilter === "todos" ? null : planFilter,
        _limit: PAGE_SIZE,
        _offset: (page - 1) * PAGE_SIZE,
      });

      if (error) throw error;

      const result = (data as AdminUserRow[]) ?? [];
      setRows(result);
      setTotalRows(result[0]?.total_rows ?? 0);
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel carregar a base de usuarios.");
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
  }, [page, search, accountTypeFilter, statusFilter, planFilter]);

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  const summary = useMemo(
    () => ({
      admins: rows.filter((row) => row.is_admin).length,
      suspensos: rows.filter((row) => row.account_status === "suspended").length,
      banidos: rows.filter((row) => row.account_status === "banned").length,
    }),
    [rows],
  );

  const selectedPlanUntil = selected?.plano_marketplace_until ? selected.plano_marketplace_until.slice(0, 10) : "";

  const pendingChanges = useMemo(() => {
    if (!selected) return [];

    const changes: string[] = [];

    if (selected.account_status !== editedStatus) {
      changes.push(`Status: ${formatAccountStatus(selected.account_status)} -> ${formatAccountStatus(editedStatus)}`);
    }

    if (selected.plano_marketplace !== editedPlan) {
      changes.push(`Plano: ${formatPlan(selected.plano_marketplace)} -> ${formatPlan(editedPlan)}`);
    }

    if (selectedPlanUntil !== editedPlanUntil) {
      changes.push(`Validade do plano: ${selectedPlanUntil || "sem data"} -> ${editedPlanUntil || "sem data"}`);
    }

    return changes;
  }, [editedPlan, editedPlanUntil, editedStatus, selected, selectedPlanUntil]);

  const hasPendingChanges = pendingChanges.length > 0;

  function abrirEdicao(row: AdminUserRow) {
    setSelected(row);
    setEditedStatus(row.account_status);
    setEditedPlan(row.plano_marketplace);
    setEditedPlanUntil(row.plano_marketplace_until ? row.plano_marketplace_until.slice(0, 10) : "");
    setReason("");
    setConfirmSaveOpen(false);
    setConfirmResetOpen(false);
  }

  function validarAtualizacao() {
    if (!selected) return false;
    if (!hasPendingChanges) {
      toast.error("Nao ha alteracoes pendentes para salvar.");
      return false;
    }
    if (selected.user_id === user?.id && editedStatus !== "active") {
      toast.error("Voce nao pode restringir a propria conta pelo painel.");
      return false;
    }
    if (editedStatus !== "active" && reason.trim().length < 5) {
      toast.error("Descreva rapidamente o motivo da restricao.");
      return false;
    }
    return true;
  }

  async function salvar() {
    if (!selected || !validarAtualizacao()) return;

    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_update_user_account", {
        _user_id: selected.user_id,
        _account_status: editedStatus,
        _plan: editedPlan,
        _plan_until: editedPlan === "pro" && editedPlanUntil ? new Date(`${editedPlanUntil}T23:59:59`).toISOString() : null,
        _reason: reason.trim() || null,
      });
      if (error) throw error;

      toast.success("Conta atualizada com sucesso.");
      setConfirmSaveOpen(false);
      setSelected(null);
      void carregar(true);
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel atualizar a conta.");
    } finally {
      setSaving(false);
    }
  }

  function validarResetSenha() {
    if (!selected) return false;
    if (!selected.email?.trim()) {
      toast.error("Essa conta nao possui e-mail valido para redefinicao.");
      return false;
    }
    return true;
  }

  async function enviarResetSenha() {
    if (!selected || !validarResetSenha()) return;

    setSendingReset(true);
    try {
      const { data: email, error } = await supabase.rpc("admin_prepare_password_reset", {
        _user_id: selected.user_id,
      });
      if (error) throw error;

      const { error: resetError } = await supabase.functions.invoke("request-password-reset", {
        body: {
          email,
          redirectTo: `${window.location.origin}/redefinir-senha`,
        },
      });
      if (resetError) throw resetError;

      toast.success("Fluxo de redefinicao disparado para o usuario.");
      setConfirmResetOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Nao foi possivel solicitar a redefinicao de senha.");
    } finally {
      setSendingReset(false);
    }
  }

  function exportarCsv() {
    if (rows.length === 0) {
      toast.error("Nao ha usuarios carregados para exportar.");
      return;
    }

    const header = [
      "Nome",
      "Email",
      "Tipo",
      "Documento",
      "Plano",
      "Status",
      "Analises",
      "Anuncios Ativos",
      "Cadastro",
    ];

    const lines = rows.map((row) => [
      `"${row.nome}"`,
      `"${row.email}"`,
      formatAccountType(row.account_type),
      `"${formatDocument(row)}"`,
      formatPlan(row.plano_marketplace),
      formatAccountStatus(row.account_status),
      row.analyses_count,
      row.active_ads_count,
      formatDate(row.created_at),
    ]);

    const blob = new Blob([[header.join(","), ...lines.map((line) => line.join(","))].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `usuarios-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso.");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Backoffice</p>
          <h2 className="mt-1 text-3xl font-extrabold text-slate-900">Usuarios e acessos</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Base consolidada de contas PF e PJ com plano, status operacional, volume de uso e acoes administrativas seguras.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
            {totalRows.toLocaleString("pt-BR")} registros
          </Badge>
          <Button variant="outline" className="border-slate-200 bg-white" onClick={exportarCsv}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" className="border-slate-200 bg-white" onClick={() => void carregar(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniSummary label="Admins na pagina" value={summary.admins.toLocaleString("pt-BR")} />
        <MiniSummary label="Suspensos no recorte" value={summary.suspensos.toLocaleString("pt-BR")} />
        <MiniSummary label="Banidos no recorte" value={summary.banidos.toLocaleString("pt-BR")} />
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
              placeholder="Buscar por nome, e-mail, CPF ou CNPJ..."
              className="pl-9"
            />
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
            <select
              className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              value={accountTypeFilter}
              onChange={(event) => {
                setAccountTypeFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="todos">Todos os tipos</option>
              <option value="PF">CPF</option>
              <option value="PJ">CNPJ</option>
            </select>

            <select
              className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="todos">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="suspended">Suspensas</option>
              <option value="banned">Banidas</option>
            </select>

            <select
              className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              value={planFilter}
              onChange={(event) => {
                setPlanFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="todos">Todos os planos</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Usuario</th>
                <th className="px-6 py-4 font-semibold">Tipo / Documento</th>
                <th className="px-6 py-4 font-semibold">Plano</th>
                <th className="px-6 py-4 font-semibold text-center">Uso</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Cadastro</th>
                <th className="px-6 py-4 text-right font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                    <p className="mt-3 text-sm text-slate-500">Carregando usuarios...</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">
                    Nenhum usuario encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.user_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{row.nome}</p>
                        {row.is_admin ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                            Admin
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{row.email || "Sem e-mail"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{formatAccountType(row.account_type)}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDocument(row)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                        {formatPlan(row.plano_marketplace)}
                      </Badge>
                      <p className="mt-1 text-xs text-slate-400">
                        {row.plano_marketplace_until ? `Expira em ${formatDate(row.plano_marketplace_until)}` : "Sem expiracao"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="font-semibold text-slate-900">{row.analyses_count}</p>
                      <p className="mt-1 text-xs text-slate-400">{row.active_ads_count} anuncios ativos</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={row.account_status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(row.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button size="sm" variant="outline" className="border-slate-200 bg-white" onClick={() => abrirEdicao(row)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Gerenciar
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
            <Button variant="outline" className="border-slate-200 bg-white" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
              Anterior
            </Button>
            <Button variant="outline" className="border-slate-200 bg-white" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
              Proxima
            </Button>
          </div>
        </div>
      </Card>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !saving && !sendingReset) {
            setSelected(null);
            setConfirmSaveOpen(false);
            setConfirmResetOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Gestao da conta
            </DialogTitle>
            <DialogDescription>
              Ajuste plano, status e dispare acoes administrativas com trilha de auditoria.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{selected.nome}</h3>
                  {selected.is_admin ? (
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      Admin
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">{selected.email || "Sem e-mail"}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Meta label="Tipo" value={formatAccountType(selected.account_type)} />
                  <Meta label="Documento" value={formatDocument(selected)} />
                  <Meta label="Cadastro" value={formatDate(selected.created_at)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="user-status">Status da conta</Label>
                  <select
                    id="user-status"
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editedStatus}
                    onChange={(event) => setEditedStatus(event.target.value)}
                  >
                    <option value="active">Ativa</option>
                    <option value="suspended">Suspensa</option>
                    <option value="banned">Banida</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-plan">Plano marketplace</Label>
                  <select
                    id="user-plan"
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editedPlan}
                    onChange={(event) => setEditedPlan(event.target.value)}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan-until">Plano valido ate</Label>
                  <Input
                    id="plan-until"
                    type="date"
                    value={editedPlanUntil}
                    onChange={(event) => setEditedPlanUntil(event.target.value)}
                    disabled={editedPlan !== "pro"}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Uso atual</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {selected.analyses_count} analises registradas e {selected.active_ads_count} anuncios ativos.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-reason">Motivo administrativo {editedStatus !== "active" ? "*" : "(opcional)"}</Label>
                <Textarea
                  id="user-reason"
                  rows={4}
                  placeholder="Ex.: suspeita de fraude, chargeback, pedido do suporte..."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumo antes de salvar</p>
                {pendingChanges.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Nenhuma alteracao pendente.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {pendingChanges.map((change) => (
                      <p key={change} className="text-sm text-slate-700">
                        {change}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Resetar acesso do usuario</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Dispara o fluxo seguro de redefinicao de senha sem expor dados sensiveis.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-slate-200 bg-white"
                  onClick={() => {
                    if (validarResetSenha()) setConfirmResetOpen(true);
                  }}
                  disabled={sendingReset}
                >
                  {sendingReset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Enviar reset
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-200" onClick={() => setSelected(null)} disabled={saving || sendingReset}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                if (validarAtualizacao()) setConfirmSaveOpen(true);
              }}
              disabled={saving || !hasPendingChanges}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar mudancas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteracoes da conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected ? (
                <>
                  As alteracoes em <strong>{selected.nome}</strong> serao registradas na trilha de auditoria antes de
                  refletirem no ambiente do usuario.
                </>
              ) : (
                "Revise os dados antes de confirmar."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingChanges.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {pendingChanges.map((change) => (
                <p key={change}>{change}</p>
              ))}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void salvar();
              }}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar mudancas"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reset de acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected ? (
                <>
                  Vamos iniciar o fluxo de redefinicao de senha para <strong>{selected.nome}</strong>. O usuario recebe
                  um e-mail seguro sem expor informacoes adicionais no painel.
                </>
              ) : (
                "Revise os dados antes de confirmar."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingReset}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void enviarResetSenha();
              }}
              disabled={sendingReset}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {sendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MiniSummary({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "suspended"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <Badge variant="outline" className={className}>
      {status === "banned" ? <Ban className="mr-1 h-3 w-3" /> : null}
      {formatAccountStatus(status)}
    </Badge>
  );
}
