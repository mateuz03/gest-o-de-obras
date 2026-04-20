import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Analysis } from "@/lib/types";
import {
  Plus, LogOut, Box, Search, AlertCircle, RefreshCw, Database, User, ShieldCheck,
  FolderOpen, FolderKanban, DollarSign, TrendingUp, Users,
} from "lucide-react";
import { DashboardAlertsSummary } from "@/components/DashboardAlertsSummary";
import { KPICard } from "@/components/dashboard/KPICard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

const formatCurrencyShort = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadAnalyses = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: fetchErr } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (fetchErr) throw fetchErr;
      setAnalyses((data as any[]) || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadAnalyses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredAnalyses = useMemo(
    () =>
      analyses.filter((a) => {
        const matchesSearch = !searchQuery || a.nome_projeto.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || a.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [analyses, searchQuery, statusFilter],
  );

  // KPIs
  const kpis = useMemo(() => {
    const ativos = analyses.filter((a) => a.status === "processing" || a.status === "pending").length;
    const orcamentoTotal = analyses.reduce((sum, a) => sum + (a.total_estimado || 0), 0);
    // Proxy: gasto = soma dos completed + 65% dos processing (até termos dados reais de gasto)
    const gastoAtual = analyses.reduce((sum, a) => {
      const v = a.total_estimado || 0;
      if (a.status === "completed") return sum + v;
      if (a.status === "processing") return sum + v * 0.65;
      return sum;
    }, 0);
    // Equipe: estimativa simples (3 pessoas por projeto ativo)
    const equipe = ativos * 3 + analyses.filter((a) => a.status === "completed").length;
    return { ativos, orcamentoTotal, gastoAtual, equipe };
  }, [analyses]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="border-b border-slate-800/20 bg-slate-900 text-white">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
            <Box className="h-6 w-6" />
            AI Construct
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-white/70 sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
              <Link to="/perfil"><User className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
              <Link to="/admin"><ShieldCheck className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-white hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        {/* Title */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Projetos</h1>
            <p className="text-slate-500">Visão geral das suas obras e orçamentos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="border-slate-200 text-slate-600 hover:bg-white">
              <Link to="/sinapi"><Database className="mr-2 h-4 w-4" /> Base SINAPI</Link>
            </Button>
            <Button asChild className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700">
              <Link to="/nova-analise"><Plus className="mr-2 h-4 w-4" /> Novo Projeto</Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="Projetos Ativos"
            value={kpis.ativos}
            icon={FolderKanban}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            hint={`${analyses.length} no total`}
          />
          <KPICard
            label="Orçamento Total"
            value={formatCurrencyShort(kpis.orcamentoTotal)}
            icon={DollarSign}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            valueColor="text-emerald-600"
          />
          <KPICard
            label="Gasto Atual"
            value={formatCurrencyShort(kpis.gastoAtual)}
            icon={TrendingUp}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            valueColor="text-blue-700"
            hint={
              kpis.orcamentoTotal > 0
                ? `${Math.round((kpis.gastoAtual / kpis.orcamentoTotal) * 100)}% do orçamento`
                : undefined
            }
          />
          <KPICard
            label="Equipe / Parceiros"
            value={kpis.equipe}
            icon={Users}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        <DashboardAlertsSummary />

        {/* Search + filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar projetos por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-slate-200 bg-white pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full border-slate-200 bg-white sm:w-[220px]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="processing">Em Andamento</SelectItem>
              <SelectItem value="pending">Planejamento</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="error">Com erro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden p-0">
                <Skeleton className="h-48 w-full" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-2 w-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                  <Skeleton className="h-9 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="py-16 text-center">
            <CardContent className="flex flex-col items-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive/50" />
              <h3 className="mb-2 text-lg font-semibold">Não foi possível carregar seus projetos</h3>
              <p className="mb-6 text-muted-foreground">Verifique sua conexão e tente novamente</p>
              <Button onClick={loadAnalyses} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : analyses.length === 0 ? (
          <Card className="border-dashed py-24 text-center">
            <CardContent className="flex flex-col items-center">
              <div className="mb-5 rounded-full bg-slate-100 p-5">
                <FolderOpen className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">Você ainda não possui nenhum projeto</h3>
              <p className="mb-8 max-w-md text-slate-500">
                Comece enviando a planta baixa da sua obra para gerar um orçamento completo com IA
              </p>
              <Button asChild className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700">
                <Link to="/nova-analise"><Plus className="mr-2 h-4 w-4" /> Criar meu primeiro projeto</Link>
              </Button>
            </CardContent>
          </Card>
        ) : filteredAnalyses.length === 0 ? (
          <Card className="py-16 text-center">
            <CardContent className="flex flex-col items-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold">Nenhum resultado encontrado</h3>
              <p className="mb-4 text-slate-500">Tente ajustar os filtros ou a busca</p>
              <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                Limpar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAnalyses.map((a) => (
              <ProjectCard key={a.id} analysis={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
