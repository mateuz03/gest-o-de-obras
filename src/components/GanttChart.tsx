import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ScheduleTask {
  id?: string;
  analysis_id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  sort_order: number;
}

interface GanttChartProps {
  analysisId: string;
  macroEtapas: { nome: string; duracao_dias_estimada?: number }[];
  areaM2: number;
  onSaved?: () => void;
}

const COLORS = [
  "hsl(25, 95%, 53%)",   // primary
  "hsl(200, 80%, 45%)",  // accent
  "hsl(150, 60%, 40%)",  // chart-3
  "hsl(280, 60%, 55%)",  // chart-4
  "hsl(340, 75%, 55%)",  // chart-5
  "hsl(45, 90%, 50%)",
  "hsl(180, 60%, 40%)",
  "hsl(10, 80%, 55%)",
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function generateDefaultTasks(analysisId: string, etapas: { nome: string; duracao_dias_estimada?: number }[], areaM2: number): ScheduleTask[] {
  const fallbackDays = areaM2 < 100 ? 10 : areaM2 < 200 ? 15 : 20;
  const today = new Date().toISOString().split("T")[0];
  const tasks: ScheduleTask[] = [];
  let currentStart = today;

  etapas.forEach((etapa, i) => {
    const duration = Number(etapa.duracao_dias_estimada) > 0
      ? Math.round(Number(etapa.duracao_dias_estimada))
      : fallbackDays;
    const end = addDays(currentStart, duration);
    tasks.push({
      analysis_id: analysisId,
      task_name: etapa.nome,
      start_date: currentStart,
      end_date: end,
      duration_days: duration,
      sort_order: i,
    });
    // Cascade: next stage starts the day after this one ends
    currentStart = addDays(end, 1);
  });

  return tasks;
}

export function GanttChart({ analysisId, macroEtapas, areaM2, onSaved }: GanttChartProps) {
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<{ index: number; edge: "start" | "end" | "move"; startX: number; origTask: ScheduleTask } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load or generate tasks
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("project_schedule" as any)
        .select("*")
        .eq("analysis_id", analysisId)
        .order("sort_order");

      if (error) {
        console.error(error);
        setTasks(generateDefaultTasks(analysisId, macroEtapas, areaM2));
      } else if (!data || (data as any[]).length === 0) {
        setTasks(generateDefaultTasks(analysisId, macroEtapas, areaM2));
      } else {
        setTasks((data as any[]).map((d: any) => ({
          id: d.id,
          analysis_id: d.analysis_id,
          task_name: d.task_name,
          start_date: d.start_date,
          end_date: d.end_date,
          duration_days: d.duration_days,
          sort_order: d.sort_order,
        })));
      }
      setLoading(false);
    }
    load();
  }, [analysisId, macroEtapas, areaM2]);

  // Calculate timeline range
  const timelineStart = tasks.length ? tasks.reduce((min, t) => t.start_date < min ? t.start_date : min, tasks[0].start_date) : new Date().toISOString().split("T")[0];
  const timelineEnd = tasks.length ? tasks.reduce((max, t) => t.end_date > max ? t.end_date : max, tasks[0].end_date) : addDays(new Date().toISOString().split("T")[0], 30);
  const totalDays = Math.max(daysBetween(timelineStart, timelineEnd), 1);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, index: number, edge: "start" | "end" | "move") => {
    e.preventDefault();
    setDragging({ index, edge, startX: e.clientX, origTask: { ...tasks[index] } });
  }, [tasks]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width - 200; // label width
    const daysPerPixel = totalDays / containerWidth;
    const dx = e.clientX - dragging.startX;
    const daysDelta = Math.round(dx * daysPerPixel);

    setTasks(prev => prev.map((t, i) => {
      if (i !== dragging.index) return t;
      const orig = dragging.origTask;

      if (dragging.edge === "move") {
        const newStart = addDays(orig.start_date, daysDelta);
        const newEnd = addDays(orig.end_date, daysDelta);
        return { ...t, start_date: newStart, end_date: newEnd };
      } else if (dragging.edge === "start") {
        const newStart = addDays(orig.start_date, daysDelta);
        if (newStart >= t.end_date) return t;
        return { ...t, start_date: newStart, duration_days: daysBetween(newStart, t.end_date) };
      } else {
        const newEnd = addDays(orig.end_date, daysDelta);
        if (newEnd <= t.start_date) return t;
        return { ...t, end_date: newEnd, duration_days: daysBetween(t.start_date, newEnd) };
      }
    }));
  }, [dragging, totalDays]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Save to DB
  const saveTasks = useCallback(async () => {
    setSaving(true);
    try {
      // Delete existing
      await supabase.from("project_schedule" as any).delete().eq("analysis_id", analysisId);

      // Insert all
      const rows = tasks.map((t, i) => ({
        analysis_id: analysisId,
        task_name: t.task_name,
        start_date: t.start_date,
        end_date: t.end_date,
        duration_days: t.duration_days,
        sort_order: i,
      }));

      const { error } = await supabase.from("project_schedule" as any).insert(rows);
      if (error) throw error;
      toast.success("Cronograma salvo com sucesso!");
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar cronograma.");
    }
    setSaving(false);
  }, [tasks, analysisId, onSaved]);

  const resetTasks = useCallback(() => {
    setTasks(generateDefaultTasks(analysisId, macroEtapas, areaM2));
    toast.info("Cronograma resetado para valores padrão.");
  }, [analysisId, macroEtapas, areaM2]);

  // Generate week markers
  const weekMarkers: { label: string; position: number }[] = [];
  for (let d = 0; d <= totalDays; d += 7) {
    weekMarkers.push({
      label: formatDate(addDays(timelineStart, d)),
      position: (d / totalDays) * 100,
    });
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const totalProjectDays = tasks.length ? daysBetween(tasks[0].start_date, tasks[tasks.length - 1].end_date) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            Cronograma da Obra
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{totalProjectDays} dias estimados</Badge>
            <Button variant="outline" size="sm" onClick={resetTasks}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Resetar
            </Button>
            <Button size="sm" onClick={saveTasks} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Timeline header */}
          <div className="flex border-b pb-2 mb-2">
            <div className="w-[200px] shrink-0 text-xs font-medium text-muted-foreground">Etapa</div>
            <div className="flex-1 relative h-6">
              {weekMarkers.map((m, i) => (
                <span key={i} className="absolute text-[10px] text-muted-foreground" style={{ left: `${m.position}%` }}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Task rows */}
          {tasks.map((task, idx) => {
            const startOffset = ((daysBetween(timelineStart, task.start_date)) / totalDays) * 100;
            const width = ((daysBetween(task.start_date, task.end_date)) / totalDays) * 100;
            const color = COLORS[idx % COLORS.length];

            return (
              <div key={idx} className="flex items-center h-10 group">
                <div className="w-[200px] shrink-0 text-sm truncate pr-2 font-medium">{task.task_name}</div>
                <div className="flex-1 relative h-8">
                  {/* Background grid */}
                  <div className="absolute inset-0 border-b border-dashed border-border/50" />

                  {/* Bar */}
                  <div
                    className="absolute top-1 h-6 rounded-md flex items-center justify-center text-[10px] text-white font-medium shadow-sm transition-opacity"
                    style={{
                      left: `${Math.max(0, startOffset)}%`,
                      width: `${Math.max(1, width)}%`,
                      backgroundColor: color,
                      cursor: dragging ? "grabbing" : "grab",
                    }}
                    onMouseDown={(e) => handleMouseDown(e, idx, "move")}
                  >
                    {/* Drag handles */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 rounded-l-md"
                      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, "start"); }}
                    />
                    <span className="px-2 truncate">{task.duration_days}d</span>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 rounded-r-md"
                      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, idx, "end"); }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground mt-4">
            Arraste as barras para ajustar datas. Use as alças laterais para alterar início/fim. Clique "Salvar" para persistir.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
