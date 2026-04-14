import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Building2, MapPin, BarChart3, ShieldCheck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Profile {
  id: string;
  nome_completo: string | null;
  nome: string | null;
  tipo_empresa: string | null;
  nome_empresa: string | null;
  estado: string | null;
  cidade: string | null;
  area_atuacao: string | null;
  qtd_funcionarios: string | null;
  qtd_obras_atual: number | null;
  created_at: string;
  como_conheceu: string | null;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(220, 70%, 55%)",
  "hsl(340, 65%, 50%)",
  "hsl(160, 60%, 45%)",
  "hsl(40, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(200, 70%, 50%)",
];

function countBy(arr: Profile[], key: keyof Profile) {
  const map: Record<string, number> = {};
  arr.forEach((p) => {
    const v = (p[key] as string) || "Não informado";
    map[v] = (map[v] || 0) + 1;
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default function Admin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Check admin role
    supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .then(({ data }) => {
        const admin = !!(data && data.length > 0);
        setIsAdmin(admin);
        if (admin) loadProfiles();
        else setLoading(false);
      });
  }, [user]);

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles((data as any) || []);
    setLoading(false);
  };

  if (isAdmin === false) return <Navigate to="/dashboard" replace />;

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const tipoEmpresaData = countBy(profiles, "tipo_empresa");
  const estadoData = countBy(profiles, "estado");
  const areaData = countBy(profiles, "area_atuacao");
  const comoConheceuData = countBy(profiles, "como_conheceu");
  const totalObras = profiles.reduce((s, p) => s + (p.qtd_obras_atual || 0), 0);

  const chartConfig = {
    value: { label: "Quantidade", color: "hsl(var(--primary))" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" /> Painel Administrativo
            </h1>
            <p className="text-sm text-muted-foreground">Estatísticas dos usuários cadastrados</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{profiles.length}</p>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{tipoEmpresaData.filter(d => d.name !== "Não informado").length}</p>
                  <p className="text-xs text-muted-foreground">Tipos de empresa</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{estadoData.filter(d => d.name !== "Não informado").length}</p>
                  <p className="text-xs text-muted-foreground">Estados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalObras}</p>
                  <p className="text-xs text-muted-foreground">Obras ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipo de Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={tipoEmpresaData.slice(0, 8)} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Área de Atuação</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <PieChart>
                  <Pie data={areaData.slice(0, 8)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}>
                    {areaData.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={estadoData.slice(0, 10)}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Como Conheceu</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={comoConheceuData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários Cadastrados</CardTitle>
            <CardDescription>{profiles.length} usuários no total</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Obras</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome_completo || p.nome || "—"}</TableCell>
                    <TableCell>{p.nome_empresa || "—"}</TableCell>
                    <TableCell>
                      {p.tipo_empresa ? (
                        <Badge variant="secondary" className="text-xs">{p.tipo_empresa}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{p.estado || "—"}</TableCell>
                    <TableCell>{p.area_atuacao || "—"}</TableCell>
                    <TableCell>{p.qtd_obras_atual ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
