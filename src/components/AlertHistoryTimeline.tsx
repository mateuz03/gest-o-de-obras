import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { History, Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface AlertHistoryTimelineProps {
  analysisId: string;
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

function severityColor(s: string) {
  if (s === "high") return "destructive";
  if (s === "medium") return "outline";
  return "secondary";
}

export function AlertHistoryTimeline({ analysisId, refreshKey = 0 }: AlertHistoryTimelineProps) {
  const [records, setRecords] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("alertas_preditivos")
      .select("id, probability, severity, summary, reason, current_task, stagnation_days, created_at")
      .eq("analysis_id", analysisId)
      .order("created_at", { ascending: false })
      .limit(30);
    setRecords((data as AlertRecord[]) || []);
    setLoading(false);
  }, [analysisId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const visible = showAll ? records : records.slice(0, 5);

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
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" /> Histórico de Alertas Preditivos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map((rec, i) => {
          const prev = visible[i + 1];
          const trend = prev ? rec.probability - prev.probability : 0;
          return (
            <div key={rec.id} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {rec.probability}%
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant={severityColor(rec.severity) as any} className="text-xs">
                    {rec.severity === "high" ? "Alto" : rec.severity === "medium" ? "Moderado" : "Baixo"}
                  </Badge>
                  {trend > 0 && <TrendingUp className="h-3.5 w-3.5 text-destructive" />}
                  {trend < 0 && <TrendingDown className="h-3.5 w-3.5 text-green-600" />}
                  {trend === 0 && prev && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground">
                    {new Date(rec.created_at).toLocaleDateString("pt-BR")} · {new Date(rec.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm truncate">{rec.summary || "Sem resumo"}</p>
                {rec.current_task && <p className="text-xs text-muted-foreground">Etapa: {rec.current_task}</p>}
              </div>
            </div>
          );
        })}
        {records.length > 5 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Mostrar menos" : `Ver todos (${records.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
