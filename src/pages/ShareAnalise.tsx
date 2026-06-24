import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Box, DollarSign, Ruler, Home, HardHat } from "lucide-react";
import { ClientChatWidget } from "@/components/ClientChatWidget";
import { supabase } from "@/integrations/supabase/client";
import { AnalysisResult, ResumoFinal } from "@/lib/types";

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function recalculateTotals(result: AnalysisResult, bdiPercent: number): ResumoFinal {
  let totalMateriais = 0;
  let totalMaoDeObra = 0;

  for (const etapa of result.macro_etapas || []) {
    for (const item of etapa.itens || []) {
      const total = typeof item.preco_total === "string" ? parseFloat(item.preco_total) : item.preco_total;
      if (!isNaN(total)) totalMateriais += total;
    }
  }

  totalMaoDeObra = typeof result.resumo_final?.total_mao_de_obra === "string"
    ? parseFloat(result.resumo_final.total_mao_de_obra)
    : (result.resumo_final?.total_mao_de_obra || 0);

  const subtotal = totalMateriais + totalMaoDeObra;
  const bdiValor = subtotal * (bdiPercent / 100);
  const totalGeral = subtotal + bdiValor;

  return {
    total_materiais: totalMateriais,
    total_mao_de_obra: totalMaoDeObra,
    total_geral: totalGeral,
    bdi_percentual: bdiPercent,
    bdi_valor: bdiValor,
  };
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 50%)",
  "hsl(150, 60%, 40%)",
  "hsl(40, 80%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(200, 70%, 45%)",
  "hsl(100, 50%, 45%)",
];

export default function ShareAnalise() {
  const { analysisId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resumo, setResumo] = useState<ResumoFinal | null>(null);
  const [area, setArea] = useState(0);

  useEffect(() => {
    async function load() {
      const token = searchParams.get("token");
      if (!analysisId || !token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_shared_analysis", {
        _analysis_id: analysisId,
        _token: token,
      });

      const shared = Array.isArray(data) ? data[0] : null;
      if (error || !shared || shared.status !== "completed" || !shared.resultado_json) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const res = shared.resultado_json as unknown as AnalysisResult;
      setProjectName(shared.nome_projeto);
      setResult(res);
      setArea(res.area_total_m2 || 0);
      setResumo(recalculateTotals(res, (shared.bdi_percentual as number) || 25));
      setLoading(false);
    }
    load();
  }, [analysisId, searchParams]);

  const pieData = useMemo(() => {
    if (!result?.macro_etapas) return [];
    return result.macro_etapas
      .map((e) => ({
        name: e.nome,
        value: typeof e.subtotal === "string" ? parseFloat(e.subtotal) : e.subtotal,
      }))
      .filter((d) => !isNaN(d.value) && d.value > 0);
  }, [result]);

  const roomGroups = useMemo(() => {
    if (!result?.macro_etapas?.length) return [];
    const groups: Record<string, { items: string[]; total: number }> = {};
    for (const etapa of result.macro_etapas) {
      for (const item of etapa.itens || []) {
        const room = item.local_aplicacao || "Geral";
        if (!groups[room]) groups[room] = { items: [], total: 0 };
        if (!groups[room].items.includes(item.descricao)) {
          groups[room].items.push(item.descricao);
        }
        const t = typeof item.preco_total === "string" ? parseFloat(item.preco_total) : item.preco_total;
        if (!isNaN(t)) groups[room].total += t;
      }
    }
    return Object.entries(groups).map(([comodo, data]) => ({
      comodo,
      materiais: data.items.slice(0, 8), // limit display
      totalItems: data.items.length,
      total: data.total,
    }));
  }, [result]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !result || !resumo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Box className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold">Análise não encontrada</h2>
        <p className="text-muted-foreground text-sm">Este link pode estar incorreto ou a análise ainda não foi concluída.</p>
      </div>
    );
  }

  const totalGeral = typeof resumo.total_geral === "string" ? parseFloat(resumo.total_geral) : resumo.total_geral;
  const custoM2 = area > 0 ? totalGeral / area : 0;
  const totalMaoDeObra = typeof resumo.total_mao_de_obra === "string" ? parseFloat(resumo.total_mao_de_obra) : resumo.total_mao_de_obra;
  const totalMateriais = typeof resumo.total_materiais === "string" ? parseFloat(resumo.total_materiais) : resumo.total_materiais;
  const pesoMaoDeObra = (totalMateriais + totalMaoDeObra) > 0 ? (totalMaoDeObra / (totalMateriais + totalMaoDeObra)) * 100 : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    const total = pieData.reduce((s, d) => s + d.value, 0);
    return (
      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">
        <p className="font-medium">{name}</p>
        <p>{formatCurrency(value)} ({total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b bg-primary text-primary-foreground">
        <div className="container flex h-16 items-center gap-3">
          <Box className="h-6 w-6" />
          <div>
            <h1 className="font-bold text-lg">
              {projectName}
            </h1>
            <p className="text-xs text-muted-foreground">Estimativa de Materiais — Obra Link</p>
          </div>
        </div>
      </nav>

      <div className="container py-8 space-y-6 max-w-4xl">
        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo Total c/ BDI</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(totalGeral)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent p-2.5">
                  <Ruler className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo por m²</p>
                  <p className="text-xl font-bold">{area > 0 ? formatCurrency(custoM2) : "—"}</p>
                  {area > 0 && <p className="text-xs text-muted-foreground">{area} m²</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent p-2.5">
                  <HardHat className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Peso Mão de Obra</p>
                  <p className="text-xl font-bold">{pesoMaoDeObra.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent p-2.5">
                  <Ruler className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Área Total</p>
                  <p className="text-xl font-bold">{area > 0 ? `${area} m²` : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição de Custos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {pieData.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Room Summary — clean, no prices per unit */}
        {roomGroups.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" /> Materiais por Ambiente
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {roomGroups.map((group, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{group.comodo}</CardTitle>
                      <Badge variant="outline" className="font-mono text-xs">
                        {formatCurrency(group.total)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {group.materiais.map((mat, j) => (
                        <Badge key={j} variant="secondary" className="text-xs font-normal">
                          {mat}
                        </Badge>
                      ))}
                      {group.totalItems > 8 && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          +{group.totalItems - 8} itens
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-8 pb-4 border-t">
          <p>Estimativa gerada por <strong>Obra Link Estimator</strong></p>
          <p className="mt-1">Os valores são estimativas e podem variar conforme o mercado local.</p>
        </div>
      </div>

      {/* Client Chat Widget */}
      {analysisId && <ClientChatWidget analysisId={analysisId} shareToken={searchParams.get("token")} />}
    </div>
  );
}
