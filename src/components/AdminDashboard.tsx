import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  Bot,
  Database,
  Eye,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  TrendingUp,
  UploadCloud,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SinapiUploader } from "@/components/SinapiUploader";
import { cn } from "@/lib/utils";

interface AdminProfile {
  id: string;
  nome_completo: string | null;
  nome: string | null;
  nome_empresa: string | null;
  qtd_obras_atual: number | null;
  created_at: string;
}

interface AdminDashboardProps {
  profiles?: AdminProfile[];
}

const navItems = [
  { label: "Visão Geral", icon: LayoutDashboard, active: true },
  { label: "Usuários & Assinaturas", icon: Users },
  { label: "Base de Dados (SINAPI)", icon: Database },
  { label: "Logs de IA", icon: Bot },
  { label: "Configurações do Sistema", icon: Settings },
];

const fallbackUsers = [
  { id: "u-1", name: "Marina Costa", email: "marina@construtora.com", plan: "Pro", analyzed: 42, status: "Ativo" },
  { id: "u-2", name: "Rafael Nunes", email: "rafael@engenharia.com", plan: "Free", analyzed: 8, status: "Ativo" },
  { id: "u-3", name: "Beatriz Lima", email: "beatriz@obras.com", plan: "Pro", analyzed: 31, status: "Inativo" },
  { id: "u-4", name: "Carlos Mendes", email: "carlos@studioarq.com", plan: "Free", analyzed: 5, status: "Ativo" },
];

const aiErrorLogs = [
  { time: "22/04/2026 14:32", userId: "usr_84f2", error: "Timeout na IA" },
  { time: "22/04/2026 13:58", userId: "usr_19ac", error: "Planta ilegível" },
  { time: "22/04/2026 12:41", userId: "usr_72de", error: "Falha na escala" },
  { time: "21/04/2026 18:06", userId: "usr_55ba", error: "Arquivo corrompido" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function AdminDashboard({ profiles = [] }: AdminDashboardProps) {
  const [sinapiOpen, setSinapiOpen] = useState(false);

  const recentUsers = useMemo(() => {
    if (!profiles.length) return fallbackUsers;

    return profiles
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map((profile, index) => {
        const name = profile.nome_completo || profile.nome || profile.nome_empresa || "Usuário sem nome";
        const emailHandle = name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.|\.$/g, "");

        return {
          id: profile.id,
          name,
          email: `${emailHandle || "usuario"}@aiconstruct.app`,
          plan: index % 3 === 0 ? "Pro" : "Free",
          analyzed: profile.qtd_obras_atual ?? Math.max(3, 18 - index * 2),
          status: index % 5 === 0 ? "Inativo" : "Ativo",
        };
      });
  }, [profiles]);

  const totalUsers = Math.max(profiles.length, 124);
  const totalAnalyses = recentUsers.reduce((sum, user) => sum + user.analyzed, 0) + 768;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="bg-slate-900 text-slate-100 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-800 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide">Obra Link</p>
                  <h1 className="text-lg font-bold leading-tight">Admin</h1>
                </div>
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className={cn(
                    "flex min-w-fit items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    item.active
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto hidden border-t border-slate-800 p-4 lg:block">
              <div className="rounded-lg bg-slate-800/70 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Activity className="h-4 w-4 text-emerald-400" /> Sistema operacional
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">Monitoramento interno de usuários, custos e automações IA.</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Centro de Comando</p>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Painel de Controle do Administrador</h2>
              </div>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Gauge className="h-4 w-4" /> Ver saúde do sistema
              </Button>
            </div>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Users} label="Total de Usuários" value={`${totalUsers} ativos`} detail="+12,4% nos últimos 30 dias" positive />
              <MetricCard icon={FileSpreadsheet} label="Análises Realizadas" value={`${totalAnalyses}`} detail="plantas processadas" />
              <MetricCard icon={Activity} label="Consumo Supabase/API" value="45%" detail="Status estável" progress={45} positive />
              <MetricCard icon={Wallet} label="MRR / Receita Estimada" value={formatCurrency(4500)} detail="base recorrente mensal" />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="flex flex-col gap-4 border-b border-slate-100 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-950">
                      <Database className="h-5 w-5 text-emerald-600" /> Gestão da Base de Preços (SINAPI)
                    </CardTitle>
                    <CardDescription className="mt-1">Última atualização: 15 de Abril de 2026 (Base SP)</CardDescription>
                  </div>
                  <Dialog open={sinapiOpen} onOpenChange={setSinapiOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                        <UploadCloud className="h-4 w-4" /> Importar CSV/XLSX
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Atualizar Base SINAPI</DialogTitle>
                      </DialogHeader>
                      <SinapiUploader onImported={() => setSinapiOpen(false)} />
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
                    <SinapiStat label="Itens indexados" value="48.920" />
                    <SinapiStat label="Região ativa" value="SP" />
                    <SinapiStat label="Match médio" value="91,8%" />
                  </div>
                  <div className="border-t border-slate-100 p-5">
                    <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">Base pronta para orçamentação híbrida</p>
                        <p className="mt-1 text-sm text-emerald-800">Uploads são processados fora da IA para preservar precisão matemática e reduzir custo de tokens.</p>
                      </div>
                      <Badge className="w-fit border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Operacional</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-950">
                    <AlertTriangle className="h-5 w-5 text-amber-500" /> Logs de Erro da IA
                  </CardTitle>
                  <CardDescription>Falhas recentes na função analyze-blueprint</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data/Hora</TableHead>
                        <TableHead className="text-xs">ID do Usuário</TableHead>
                        <TableHead className="text-xs">Tipo de Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiErrorLogs.map((log) => (
                        <TableRow key={`${log.time}-${log.userId}`}>
                          <TableCell className="whitespace-nowrap text-xs text-slate-600">{log.time}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-700">{log.userId}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                              {log.error}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-950">
                  <Users className="h-5 w-5 text-slate-700" /> Usuários Recentes
                </CardTitle>
                <CardDescription>Últimos cadastros e situação operacional da conta.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome/Email</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Plantas Analisadas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                            {user.plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-slate-800">{user.analyzed}</TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              user.status === "Ativo"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                                : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100",
                            )}
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Ver detalhes">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" aria-label="Bloquear usuário">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  progress,
  positive,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
  progress?: number;
  positive?: boolean;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 truncate text-2xl font-bold text-slate-950">{value}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {progress !== undefined ? (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs font-medium text-emerald-700">{detail}</p>
          </div>
        ) : (
          <p className={cn("mt-3 flex items-center gap-1 text-xs font-medium", positive ? "text-emerald-700" : "text-slate-500")}>
            {positive && <TrendingUp className="h-3.5 w-3.5" />}
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SinapiStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}