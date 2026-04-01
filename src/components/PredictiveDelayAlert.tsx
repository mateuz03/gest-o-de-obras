import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

interface PredictiveDelayAlertProps {
  analysisId: string;
  refreshKey?: number;
}

interface PredictiveAlertData {
  shouldAlert: boolean;
  probability: number;
  severity: "low" | "medium" | "high";
  summary: string;
  reason: string;
  suggested_new_date: string | null;
  mitigation: string;
  current_task: string | null;
  fornecedor: string | null;
  stagnation_days: number;
}

function severityLabel(severity: PredictiveAlertData["severity"]) {
  if (severity === "high") return "Risco alto";
  if (severity === "medium") return "Risco moderado";
  return "Risco baixo";
}

export function PredictiveDelayAlert({ analysisId, refreshKey = 0 }: PredictiveDelayAlertProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PredictiveAlertData | null>(null);
  const [error, setError] = useState(false);

  const loadPrediction = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error } = await supabase.functions.invoke("predict-delay", { body: { analysis_id: analysisId } });
    if (error || data?.error) {
      setError(true);
      setLoading(false);
      return;
    }
    setData(data as PredictiveAlertData);
    setLoading(false);
  }, [analysisId]);

  useEffect(() => {
    loadPrediction();
  }, [loadPrediction, refreshKey]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg"><ShieldAlert className="h-5 w-5 text-primary" />Alerta preditivo de atraso</CardTitle>
          <Button variant="outline" size="sm" onClick={loadPrediction} disabled={loading}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : error || !data ? (
          <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Não foi possível calcular o risco agora</AlertTitle><AlertDescription>Tente novamente após atualizar o cronograma ou registrar o diário de obra.</AlertDescription></Alert>
        ) : (
          <Alert variant={data.severity === "high" ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex flex-wrap items-center gap-2"><span>{data.summary}</span><Badge variant={data.severity === "high" ? "destructive" : data.severity === "medium" ? "outline" : "secondary"}>{severityLabel(data.severity)} · {data.probability}%</Badge></AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{data.reason}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-background/60 p-3"><p className="text-xs text-muted-foreground">Etapa monitorada</p><p className="font-medium">{data.current_task || "Não identificada"}</p></div>
                <div className="rounded-lg border bg-background/60 p-3"><p className="text-xs text-muted-foreground">Fornecedor</p><p className="font-medium">{data.fornecedor || "Não informado"}</p></div>
                <div className="rounded-lg border bg-background/60 p-3"><p className="text-xs text-muted-foreground">Sem avanço há</p><p className="font-medium">{data.stagnation_days} dia(s)</p></div>
              </div>
              {data.suggested_new_date && <p><strong>Nova data sugerida:</strong> {new Date(`${data.suggested_new_date}T12:00:00`).toLocaleDateString("pt-BR")}</p>}
              <p><strong>Mitigação sugerida:</strong> {data.mitigation}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}