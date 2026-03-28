import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { DollarSign, Ruler, HardHat, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { AnalysisResult, ResumoFinal } from "@/lib/types";

function formatCurrency(value: number) {
  if (isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 220 70% 50%))",
  "hsl(var(--chart-3, 150 60% 40%))",
  "hsl(var(--chart-4, 40 80% 55%))",
  "hsl(var(--chart-5, 0 70% 55%))",
  "hsl(280, 60%, 55%)",
  "hsl(200, 70%, 45%)",
  "hsl(100, 50%, 45%)",
];

const MEDIA_MERCADO_M2 = 2500;
const TOLERANCIA = 0.3; // 30%

interface Props {
  result: AnalysisResult;
  resumo: ResumoFinal;
}

export function ExecutiveDashboard({ result, resumo }: Props) {
  const totalGeral = typeof resumo.total_geral === "string" ? parseFloat(resumo.total_geral) : resumo.total_geral;
  const totalMaoDeObra = typeof resumo.total_mao_de_obra === "string" ? parseFloat(resumo.total_mao_de_obra) : resumo.total_mao_de_obra;
  const totalMateriais = typeof resumo.total_materiais === "string" ? parseFloat(resumo.total_materiais) : resumo.total_materiais;
  const area = result.area_total_m2 || 0;

  const custoM2 = area > 0 ? totalGeral / area : 0;
  const pesoMaoDeObra = (totalMateriais + totalMaoDeObra) > 0
    ? (totalMaoDeObra / (totalMateriais + totalMaoDeObra)) * 100
    : 0;

  // Pie chart data from macro_etapas
  const pieData = useMemo(() => {
    return (result.macro_etapas || []).map((etapa) => {
      const val = typeof etapa.subtotal === "string" ? parseFloat(etapa.subtotal) : etapa.subtotal;
      return { name: etapa.nome, value: isNaN(val) ? 0 : val };
    }).filter((d) => d.value > 0);
  }, [result.macro_etapas]);

  // QA alerts
  const alerts = useMemo(() => {
    const list: { type: "warning" | "info"; title: string; msg: string }[] = [];
    if (area > 0 && custoM2 > 0) {
      if (custoM2 > MEDIA_MERCADO_M2 * (1 + TOLERANCIA)) {
        list.push({
          type: "warning",
          title: "Custo/m² acima da média",
          msg: `O custo de ${formatCurrency(custoM2)}/m² está ${((custoM2 / MEDIA_MERCADO_M2 - 1) * 100).toFixed(0)}% acima da média de mercado (${formatCurrency(MEDIA_MERCADO_M2)}/m²). Revise as medidas da planta ou os quantitativos.`,
        });
      } else if (custoM2 < MEDIA_MERCADO_M2 * (1 - TOLERANCIA)) {
        list.push({
          type: "warning",
          title: "Custo/m² abaixo da média",
          msg: `O custo de ${formatCurrency(custoM2)}/m² está ${((1 - custoM2 / MEDIA_MERCADO_M2) * 100).toFixed(0)}% abaixo da média de mercado (${formatCurrency(MEDIA_MERCADO_M2)}/m²). Pode haver itens faltando ou escala incorreta.`,
        });
      }
    }
    if (pesoMaoDeObra > 0 && pesoMaoDeObra > 50) {
      list.push({
        type: "info",
        title: "Mão de obra elevada",
        msg: `A mão de obra representa ${pesoMaoDeObra.toFixed(1)}% do custo direto. Avalie se há serviços terceirizados incluídos.`,
      });
    }
    return list;
  }, [custoM2, area, pesoMaoDeObra]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    const pct = pieData.reduce((s, d) => s + d.value, 0);
    return (
      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">
        <p className="font-medium">{name}</p>
        <p>{formatCurrency(value)} ({pct > 0 ? ((value / pct) * 100).toFixed(1) : 0}%)</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
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
                <p className="text-xl font-bold">
                  {area > 0 ? formatCurrency(custoM2) : "—"}
                </p>
                {area > 0 && (
                  <p className="text-xs text-muted-foreground">{area} m² de área</p>
                )}
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
                <p className="text-xs text-muted-foreground">{formatCurrency(totalMaoDeObra)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent p-2.5">
                {custoM2 > MEDIA_MERCADO_M2 ? (
                  <TrendingUp className="h-5 w-5 text-destructive" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-accent-foreground" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">vs. Média Mercado</p>
                {area > 0 ? (
                  <>
                    <p className="text-xl font-bold">
                      {custoM2 >= MEDIA_MERCADO_M2 ? "+" : ""}
                      {((custoM2 / MEDIA_MERCADO_M2 - 1) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Ref: {formatCurrency(MEDIA_MERCADO_M2)}/m²</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Área não informada</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QA Alerts */}
      {alerts.map((alert, i) => (
        <Alert key={i} variant={alert.type === "warning" ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.msg}</AlertDescription>
        </Alert>
      ))}

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Custos por Macroetapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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
                  <Badge variant="secondary" className="text-xs font-mono ml-1">{formatCurrency(d.value)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
