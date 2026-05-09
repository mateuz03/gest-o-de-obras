import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { DollarSign, Ruler, HardHat, AlertTriangle, TrendingUp, TrendingDown, ShieldAlert, ShieldCheck } from "lucide-react";
import { AnalysisResult, ResumoFinal } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

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
  analysisId?: string;
}

export function ExecutiveDashboard({ result, resumo, analysisId }: Props) {
  const [conflictCounts, setConflictCounts] = useState({ open: 0, high: 0 });

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("clash_conflicts")
        .select("severity")
        .eq("analysis_id", analysisId)
        .eq("status", "open");
      if (cancelled) return;
      const open = data?.length || 0;
      const high = data?.filter((c: any) => c.severity === "high").length || 0;
      setConflictCounts({ open, high });
    };
    load();
    return () => { cancelled = true; };
  }, [analysisId]);

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5 shrink-0">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-right min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Custo Total c/ BDI</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums truncate">{formatCurrency(totalGeral)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-lg bg-slate-100 p-2.5 shrink-0">
                <Ruler className="h-5 w-5 text-slate-700" />
              </div>
              <div className="text-right min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Custo por m²</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums truncate">
                  {area > 0 ? formatCurrency(custoM2) : "—"}
                </p>
                {area > 0 && (
                  <p className="text-xs text-slate-500">{area} m² de área</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-lg bg-slate-100 p-2.5 shrink-0">
                <HardHat className="h-5 w-5 text-slate-700" />
              </div>
              <div className="text-right min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Peso Mão de Obra</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{pesoMaoDeObra.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 truncate">{formatCurrency(totalMaoDeObra)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-lg bg-slate-100 p-2.5 shrink-0">
                {custoM2 > MEDIA_MERCADO_M2 ? (
                  <TrendingUp className="h-5 w-5 text-destructive" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <div className="text-right min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">vs. Média Mercado</p>
                {area > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">
                      {custoM2 >= MEDIA_MERCADO_M2 ? "+" : ""}
                      {((custoM2 / MEDIA_MERCADO_M2 - 1) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">Ref: {formatCurrency(MEDIA_MERCADO_M2)}/m²</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Área não informada</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-slate-200 ${conflictCounts.high > 0 ? "border-destructive/40 bg-destructive/5" : conflictCounts.open > 0 ? "border-amber-500/40" : ""}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className={`rounded-lg p-2.5 shrink-0 ${conflictCounts.high > 0 ? "bg-destructive/15" : conflictCounts.open > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
                {conflictCounts.open === 0 ? (
                  <ShieldCheck className="h-5 w-5 text-slate-700" />
                ) : (
                  <ShieldAlert className={`h-5 w-5 ${conflictCounts.high > 0 ? "text-destructive" : "text-amber-600"}`} />
                )}
              </div>
              <div className="text-right min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Conflitos Abertos</p>
                <div className="flex items-baseline gap-2 justify-end">
                  <p className={`text-2xl font-bold tabular-nums ${conflictCounts.high > 0 ? "text-destructive" : "text-slate-900"}`}>
                    {conflictCounts.open}
                  </p>
                  {conflictCounts.high > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {conflictCounts.high} alto{conflictCounts.high > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {conflictCounts.open === 0 ? "Sem incompatibilidades" : "Diário × Orçamento"}
                </p>
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
      {pieData.length > 0 && (() => {
        const total = pieData.reduce((s, d) => s + d.value, 0);
        return (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-900">Distribuição de Custos por Macroetapa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-[1fr,1fr] items-center max-h-80">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2 max-h-72 overflow-auto pr-2">
                  {pieData
                    .map((d, idx) => ({ ...d, idx, pct: total > 0 ? (d.value / total) * 100 : 0 }))
                    .sort((a, b) => b.value - a.value)
                    .map((d) => (
                      <li key={d.idx} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[d.idx % COLORS.length] }} />
                          <span className="text-sm text-slate-700 truncate">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-500 tabular-nums">{formatCurrency(d.value)}</span>
                          <span className="text-sm font-semibold text-slate-900 tabular-nums w-12 text-right">{d.pct.toFixed(1)}%</span>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
