import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AlertSummary {
  analysis_id: string;
  nome_projeto: string;
  probability: number;
  severity: string;
  summary: string | null;
  current_task: string | null;
  created_at: string;
}

export function DashboardAlertsSummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("alertas_preditivos")
        .select("analysis_id, probability, severity, summary, current_task, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data?.length) { setLoading(false); return; }

      const latestMap = new Map<string, any>();
      for (const row of data) {
        if (!latestMap.has(row.analysis_id)) latestMap.set(row.analysis_id, row);
      }

      const needsAttention = Array.from(latestMap.values()).filter(
        (a) => a.severity === "high" || a.severity === "medium" || a.probability >= 40
      );

      if (!needsAttention.length) { setAlerts([]); setLoading(false); return; }

      const ids = needsAttention.map((a: any) => a.analysis_id);
      const { data: analyses } = await supabase
        .from("analyses")
        .select("id, nome_projeto")
        .in("id", ids);

      const nameMap = new Map((analyses || []).map((a: any) => [a.id, a.nome_projeto]));
      const enriched = needsAttention.map((a: any) => ({
        ...a,
        nome_projeto: nameMap.get(a.analysis_id) || "Projeto",
      }));

      enriched.sort((a: any, b: any) => b.probability - a.probability);
      setAlerts(enriched.slice(0, 5));
      setLoading(false);
    })();
  }, [user]);

  if (loading) return null;
  if (!alerts.length) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-destructive" /> Obras que precisam de atenção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.analysis_id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(`/analise/${a.analysis_id}`)}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{a.nome_projeto}</p>
              <p className="text-xs text-muted-foreground truncate">{a.summary || a.current_task || "—"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={a.severity === "high" ? "destructive" : "outline"} className="text-xs">
                {a.probability}%
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
