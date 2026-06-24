import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { loadPdfExportDeps } from "@/lib/lazyDeps";
import {
  BarChart3,
  FileDown,
  History,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface AlertHistoryTimelineProps {
  analysisId: string;
  projectName?: string;
  refreshKey?: number;
}

interface AlertRecord {
  id: string;
  probability: number;
  severity: string;
  summary: string | null;
  reason: string | null;
  current_task: string | null;
  stagnation_days: number | null;
  created_at: string;
}

function severityColor(severity: string) {
  if (severity === "high") return "destructive";
  if (severity === "medium") return "outline";
  return "secondary";
}

export function AlertHistoryTimeline({
  analysisId,
  projectName = "Projeto",
  refreshKey = 0,
}: AlertHistoryTimelineProps) {
  const [records, setRecords] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [period, setPeriod] = useState<"7" | "30" | "all">("all");
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("alertas_preditivos")
      .select(
        "id, probability, severity, summary, reason, current_task, stagnation_days, created_at"
      )
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false });

    if (period !== "all") {
      const since = new Date();
      since.setDate(since.getDate() - Number(period));
      query = query.gte("created_at", since.toISOString());
    } else {
      query = query.limit(30);
    }

    const { data } = await query;
    setRecords((data as AlertRecord[]) || []);
    setLoading(false);
  }, [analysisId, period]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const chartData = useMemo(
    () =>
      [...records].reverse().map((record) => ({
        date: new Date(record.created_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        fullDate: new Date(record.created_at).toLocaleDateString("pt-BR"),
        probability: record.probability,
        severity: record.severity,
      })),
    [records]
  );

  const visibleRecords = showAll ? records : records.slice(0, 5);

  const chartConfig = {
    probability: {
      label: "Probabilidade (%)",
      color: "hsl(var(--primary))",
    },
  };

  const exportAlertsPDF = useCallback(async () => {
    setExportingPdf(true);

    try {
      const { jsPDF, autoTable } = await loadPdfExportDeps();
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text("Historico de alertas preditivos", 14, 18);
      doc.setFontSize(11);
      doc.text(projectName, 14, 26);
      doc.setFontSize(9);
      doc.text(
        `Gerado em ${new Date().toLocaleDateString("pt-BR")} - ${records.length} registro(s)`,
        14,
        32
      );

      autoTable(doc, {
        startY: 38,
        head: [["Data/Hora", "Prob.", "Risco", "Resumo", "Etapa", "Estagnacao"]],
        body: records.map((record) => [
          `${new Date(record.created_at).toLocaleDateString("pt-BR")} ${new Date(
            record.created_at
          ).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
          `${record.probability}%`,
          record.severity === "high"
            ? "Alto"
            : record.severity === "medium"
              ? "Moderado"
              : "Baixo",
          record.summary || "Sem resumo",
          record.current_task || "-",
          record.stagnation_days != null ? `${record.stagnation_days} dia(s)` : "-",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [245, 130, 32] },
        columnStyles: { 3: { cellWidth: 60 } },
      });

      doc.save(`alertas_preditivos_${projectName.replace(/\s+/g, "_")}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }, [projectName, records]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!records.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Historico de Alertas Preditivos
          </CardTitle>

          <div className="flex items-center gap-1.5">
            {(["7", "30", "all"] as const).map((option) => (
              <Button
                key={option}
                variant={period === option ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPeriod(option)}
              >
                {option === "7" ? "7 dias" : option === "30" ? "30 dias" : "Todos"}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => setShowChart((current) => !current)}
            >
              <BarChart3 className="mr-1 h-3.5 w-3.5" />
              {showChart ? "Ocultar" : "Grafico"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => void exportAlertsPDF()}
              disabled={exportingPdf}
            >
              {exportingPdf ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="mr-1 h-3.5 w-3.5" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showChart && chartData.length >= 2 && (
          <div className="rounded-lg border p-3">
            <ChartContainer config={chartConfig} className="aspect-[3/1] w-full">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ReferenceLine
                  y={70}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="4 4"
                  label={{
                    value: "Alto risco",
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "hsl(var(--destructive))",
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ""}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="probability"
                  stroke="hsl(var(--primary))"
                  fill="url(#riskGradient)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        {visibleRecords.map((record, index) => {
          const previous = visibleRecords[index + 1];
          const trend = previous ? record.probability - previous.probability : 0;

          return (
            <div key={record.id} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {record.probability}%
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant={severityColor(record.severity) as "default"} className="text-xs">
                    {record.severity === "high"
                      ? "Alto"
                      : record.severity === "medium"
                        ? "Moderado"
                        : "Baixo"}
                  </Badge>

                  {trend > 0 && <TrendingUp className="h-3.5 w-3.5 text-destructive" />}
                  {trend < 0 && <TrendingDown className="h-3.5 w-3.5 text-green-600" />}
                  {trend === 0 && previous && (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}

                  <span className="text-xs text-muted-foreground">
                    {new Date(record.created_at).toLocaleDateString("pt-BR")} -{" "}
                    {new Date(record.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="truncate text-sm">{record.summary || "Sem resumo"}</p>
                {record.current_task && (
                  <p className="text-xs text-muted-foreground">Etapa: {record.current_task}</p>
                )}
              </div>
            </div>
          );
        })}

        {records.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? "Mostrar menos" : `Ver todos (${records.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
