import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, EyeOff, Loader2, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Conflict = {
  id: string;
  severity: "low" | "medium" | "high" | string;
  title: string;
  description: string | null;
  recommendation: string | null;
  related_stage: string | null;
  related_item: string | null;
  status: string;
  detected_at: string;
};

interface Props {
  analysisId: string;
}

const severityStyles: Record<string, { badge: string; border: string; icon: string }> = {
  high: { badge: "bg-destructive text-destructive-foreground", border: "border-l-destructive", icon: "text-destructive" },
  medium: { badge: "bg-amber-500 text-white", border: "border-l-amber-500", icon: "text-amber-500" },
  low: { badge: "bg-muted text-foreground", border: "border-l-muted-foreground", icon: "text-muted-foreground" },
};

const severityLabel: Record<string, string> = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

export function ClashDetectionPanel({ analysisId }: Props) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<"open" | "resolved" | "ignored">("open");

  const loadConflicts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clash_conflicts")
      .select("*")
      .eq("analysis_id", analysisId)
      .order("severity", { ascending: false })
      .order("detected_at", { ascending: false });
    if (!error && data) setConflicts(data as Conflict[]);
    setLoading(false);
  };

  useEffect(() => {
    loadConflicts();
  }, [analysisId]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-clashes", {
        body: { analysis_id: analysisId },
      });
      if (error) throw error;
      if (data?.message) {
        toast.info(data.message);
      } else {
        toast.success(`Análise concluída: ${data?.total ?? 0} conflito(s) detectado(s).`);
      }
      await loadConflicts();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao analisar conflitos.");
    } finally {
      setAnalyzing(false);
    }
  };

  const updateStatus = async (id: string, status: "resolved" | "ignored") => {
    const { error } = await supabase
      .from("clash_conflicts")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Falha ao atualizar status.");
      return;
    }
    toast.success(status === "resolved" ? "Conflito marcado como resolvido." : "Conflito ignorado.");
    setConflicts((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  const filtered = conflicts.filter((c) => c.status === tab);
  const counts = {
    open: conflicts.filter((c) => c.status === "open").length,
    resolved: conflicts.filter((c) => c.status === "resolved").length,
    ignored: conflicts.filter((c) => c.status === "ignored").length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Detecção de Conflitos (Clash Detection)</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                A IA cruza o Diário de Obra com o Orçamento e identifica incompatibilidades que podem gerar retrabalho.
              </p>
            </div>
          </div>
          <Button onClick={runAnalysis} disabled={analyzing} className="shrink-0">
            {analyzing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Analisar conflitos</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="open">
              Abertos {counts.open > 0 && <Badge variant="secondary" className="ml-2">{counts.open}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolvidos {counts.resolved > 0 && <Badge variant="secondary" className="ml-2">{counts.resolved}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="ignored">
              Ignorados {counts.ignored > 0 && <Badge variant="secondary" className="ml-2">{counts.ignored}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">
                  {tab === "open" && "Nenhum conflito aberto."}
                  {tab === "resolved" && "Nenhum conflito resolvido ainda."}
                  {tab === "ignored" && "Nenhum conflito ignorado."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tab === "open" && "Clique em 'Analisar conflitos' para rodar a IA."}
                </p>
              </div>
            ) : (
              filtered.map((c) => {
                const style = severityStyles[c.severity] || severityStyles.medium;
                return (
                  <div key={c.id} className={`border-l-4 ${style.border} bg-card border rounded-lg p-4 space-y-3`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${style.icon}`} />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-semibold">{c.title}</h4>
                            <Badge className={style.badge}>{severityLabel[c.severity] || c.severity}</Badge>
                            {c.related_stage && <Badge variant="outline" className="text-xs">{c.related_stage}</Badge>}
                          </div>
                          {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                          {c.recommendation && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                              <span className="font-medium">Recomendação: </span>{c.recommendation}
                            </div>
                          )}
                          {c.related_item && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Item envolvido: <span className="font-mono">{c.related_item}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {c.status === "open" && (
                      <div className="flex gap-2 justify-end pt-1 border-t">
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "ignored")}>
                          <EyeOff className="h-3.5 w-3.5 mr-1" /> Ignorar
                        </Button>
                        <Button size="sm" variant="default" onClick={() => updateStatus(c.id, "resolved")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Marcar como resolvido
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
