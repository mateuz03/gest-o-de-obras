import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Analysis } from "@/lib/types";
import { Plus, LogOut, Building2, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  processing: { label: "Processando", variant: "secondary" },
  completed: { label: "Concluído", variant: "default" },
  error: { label: "Erro", variant: "destructive" },
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      setAnalyses((data as any[]) || []);
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Building2 className="h-6 w-6 text-primary" />
            AI Construct
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Minhas Análises</h1>
            <p className="text-muted-foreground">Gerencie suas estimativas de materiais</p>
          </div>
          <Button asChild>
            <Link to="/nova-analise"><Plus className="mr-2 h-4 w-4" /> Nova Análise</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : analyses.length === 0 ? (
          <Card className="py-20 text-center">
            <CardContent>
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">Nenhuma análise ainda</h3>
              <p className="mb-6 text-muted-foreground">Comece enviando a planta baixa da sua obra</p>
              <Button asChild>
                <Link to="/nova-analise"><Plus className="mr-2 h-4 w-4" /> Criar Primeira Análise</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analyses.map((a) => {
              const s = statusMap[a.status] || statusMap.pending;
              return (
                <Link key={a.id} to={a.status === "completed" ? `/analise/${a.id}` : "#"}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{a.nome_projeto}</CardTitle>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(a.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                      </CardDescription>
                    </CardHeader>
                    {a.tipo_construcao && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{a.tipo_construcao}</p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
