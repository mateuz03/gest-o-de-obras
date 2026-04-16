import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Analysis } from "@/lib/types";
import { exportToPDF, exportToExcel } from "@/lib/export";
import { Plus, LogOut, Box, FileText, Clock, Search, MoreVertical, Download, FileSpreadsheet, Copy, Trash2, Pencil, AlertCircle, RefreshCw, Database, Share2, User, ShieldCheck, FolderOpen } from "lucide-react";
import { DashboardAlertsSummary } from "@/components/DashboardAlertsSummary";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const TIPO_LABELS: Record<string, string> = {
  casa_terrea: "Casa Térrea",
  sobrado: "Sobrado",
  apartamento: "Apartamento",
  comercial: "Comercial",
};

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending: { label: "Pendente", bg: "bg-slate-100", text: "text-slate-700", icon: "⏳" },
  processing: { label: "Processando", bg: "bg-amber-50", text: "text-amber-800", icon: "⚙️" },
  completed: { label: "Concluído", bg: "bg-emerald-50", text: "text-emerald-800", icon: "✓" },
  error: { label: "Falha", bg: "bg-red-50", text: "text-red-800", icon: "✕" },
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const loadAnalyses = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: fetchErr } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: sortOrder === "asc" });
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
  }, [user, sortOrder]);

  const filteredAnalyses = analyses.filter((a) => {
    const matchesSearch = !searchQuery || a.nome_projeto.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta análise?")) return;
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      setAnalyses(analyses.filter((a) => a.id !== id));
      toast.success("Análise excluída");
    }
  };

  const handleDuplicate = async (a: Analysis, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { error } = await supabase.from("analyses").insert({
      user_id: user!.id,
      nome_projeto: `${a.nome_projeto} (cópia)`,
      imagem_url: a.imagem_url,
      escala: a.escala,
      tipo_construcao: a.tipo_construcao,
      regiao: a.regiao,
      status: "pending",
    });
    if (error) {
      toast.error("Erro ao duplicar");
    } else {
      toast.success("Análise duplicada");
      loadAnalyses();
    }
  };

  const handleRename = async (a: Analysis, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newName = prompt("Novo nome do projeto:", a.nome_projeto);
    if (!newName || newName === a.nome_projeto) return;
    const { error } = await supabase.from("analyses").update({ nome_projeto: newName }).eq("id", a.id);
    if (error) {
      toast.error("Erro ao renomear");
    } else {
      setAnalyses(analyses.map((item) => item.id === a.id ? { ...item, nome_projeto: newName } : item));
      toast.success("Projeto renomeado");
    }
  };

  const handleExportPDF = async (a: Analysis, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (a.resultado_json) exportToPDF(a.nome_projeto, a.resultado_json);
  };

  const handleExportExcel = async (a: Analysis, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (a.resultado_json) exportToExcel(a.nome_projeto, a.resultado_json);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b bg-primary text-primary-foreground">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-foreground">
            <Box className="h-6 w-6" />
            AI Construct
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-primary-foreground/70 hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" asChild className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/perfil"><User className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/admin"><ShieldCheck className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        {/* Top section */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minhas Análises</h1>
            <p className="text-muted-foreground">
              {analyses.length > 0
                ? `${analyses.length} análise${analyses.length > 1 ? "s" : ""}`
                : "Gerencie suas estimativas de materiais"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="border-border text-muted-foreground hover:bg-muted">
              <Link to="/sinapi"><Database className="mr-2 h-4 w-4" /> Gerenciar Base SINAPI</Link>
            </Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <Link to="/nova-analise"><Plus className="mr-2 h-4 w-4" /> Nova Análise</Link>
            </Button>
          </div>
        </div>

        <DashboardAlertsSummary />

        {/* Filters */}
        {!loading && analyses.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="error">Com erro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "desc" | "asc")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mais recentes</SelectItem>
                <SelectItem value="asc">Mais antigas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="py-16 text-center">
            <CardContent className="flex flex-col items-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive/50" />
              <h3 className="mb-2 text-lg font-semibold">Não foi possível carregar suas análises</h3>
              <p className="mb-6 text-muted-foreground">Verifique sua conexão e tente novamente</p>
              <Button onClick={loadAnalyses} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : analyses.length === 0 ? (
          /* Empty state */
          <Card className="py-24 text-center border-dashed">
            <CardContent className="flex flex-col items-center">
              <div className="mb-5 rounded-full bg-muted p-5">
                <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Você ainda não possui nenhuma análise</h3>
              <p className="mb-8 text-muted-foreground max-w-md">
                Comece enviando a planta baixa da sua obra para gerar um orçamento completo com IA
              </p>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                <Link to="/nova-analise"><Plus className="mr-2 h-4 w-4" /> Criar minha primeira análise</Link>
              </Button>
            </CardContent>
          </Card>
        ) : filteredAnalyses.length === 0 ? (
          <Card className="py-16 text-center">
            <CardContent className="flex flex-col items-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">Nenhum resultado encontrado</h3>
              <p className="mb-4 text-muted-foreground">Tente ajustar os filtros ou a busca</p>
              <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                Limpar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAnalyses.map((a) => {
              const s = statusConfig[a.status] || statusConfig.pending;
              const isClickable = a.status === "completed";
              return (
                <Card
                  key={a.id}
                  className={`group relative h-full transition-all duration-200 ${
                    isClickable
                      ? "cursor-pointer hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-1"
                      : "hover:shadow-sm"
                  }`}
                  onClick={() => isClickable && navigate(`/analise/${a.id}`)}
                >
                  <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-base leading-tight line-clamp-2 text-foreground">
                        {a.nome_projeto}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleRename(a, e as any)}>
                            <Pencil className="mr-2 h-4 w-4" /> Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleDuplicate(a, e as any)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicar
                          </DropdownMenuItem>
                          {a.status === "completed" && a.resultado_json && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const shareUrl = `${window.location.origin}/share/${a.id}`;
                                navigator.clipboard.writeText(shareUrl);
                                toast.success("Link copiado! Envie para o cliente.");
                              }}>
                                <Share2 className="mr-2 h-4 w-4" /> Compartilhar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => handleExportPDF(a, e as any)}>
                                <Download className="mr-2 h-4 w-4" /> Baixar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => handleExportExcel(a, e as any)}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Baixar Excel
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => handleDelete(a.id, e as any)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Status badge */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
                        {s.icon} {s.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5">
                      {a.tipo_construcao && (
                        <p className="text-sm text-muted-foreground">
                          {TIPO_LABELS[a.tipo_construcao] || a.tipo_construcao}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(a.created_at), "dd MMM yyyy '•' HH:mm", { locale: ptBR })}
                      </div>

                      {a.regiao && (
                        <p className="text-xs text-muted-foreground capitalize">📍 {a.regiao}</p>
                      )}
                    </div>

                    {/* Total cost for completed */}
                    {a.status === "completed" && a.total_estimado != null && (
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Custo Total</span>
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(a.total_estimado)}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
