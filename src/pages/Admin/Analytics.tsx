import { useEffect, useState } from "react";
import { BarChart3, Loader2, Sparkles, LayoutGrid, MousePointerClick, Eye, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CtrRow {
  listing: "featured" | "organic" | string;
  impressions: number;
  clicks: number;
  ctr: number;
}

const PERIODOS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

const fmt = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number) => `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState("30");
  const [rows, setRows] = useState<CtrRow[]>([]);

  const carregar = async (period: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_marketplace_ctr", { _days: Number(period) });
      if (error) throw error;
      setRows((data || []) as CtrRow[]);
    } catch {
      toast.error("Não foi possível carregar o relatório (verifique permissões de admin).");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(dias); }, [dias]);

  const featured = rows.find((r) => r.listing === "featured") ?? { listing: "featured", impressions: 0, clicks: 0, ctr: 0 };
  const organic = rows.find((r) => r.listing === "organic") ?? { listing: "organic", impressions: 0, clicks: 0, ctr: 0 };

  const totalImpr = featured.impressions + organic.impressions;
  const totalClicks = featured.clicks + organic.clicks;
  const ctrMedio = totalImpr === 0 ? 0 : Math.round((totalClicks / totalImpr) * 10000) / 100;
  const uplift = organic.ctr > 0 ? Math.round(((featured.ctr - organic.ctr) / organic.ctr) * 1000) / 10 : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Backoffice</p>
          <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" /> Analytics de Anúncios
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Impressões, cliques e CTR comparando itens destacados vs orgânicos.
          </p>
        </div>
        <Select value={dias} onValueChange={setDias}>
          <SelectTrigger className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : (
        <>
          {/* KPIs consolidados */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi icon={<Eye className="h-5 w-5 text-emerald-600" />} label="Impressões totais" value={fmt(totalImpr)} />
            <Kpi icon={<MousePointerClick className="h-5 w-5 text-emerald-600" />} label="Cliques totais" value={fmt(totalClicks)} />
            <Kpi icon={<Percent className="h-5 w-5 text-emerald-600" />} label="CTR médio" value={pct(ctrMedio)} />
          </div>

          {/* Tabela comparativa */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Tipo de listagem</th>
                    <th className="px-6 py-4 text-right">Impressões</th>
                    <th className="px-6 py-4 text-right">Cliques</th>
                    <th className="px-6 py-4 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <Row
                    label="Destacados"
                    badge={<Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1"><Sparkles className="h-3 w-3" /> Featured</Badge>}
                    row={featured}
                  />
                  <Row
                    label="Orgânicos"
                    badge={<Badge variant="outline" className="text-slate-600 gap-1"><LayoutGrid className="h-3 w-3" /> Organic</Badge>}
                    row={organic}
                  />
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50/60 font-semibold text-slate-800">
                  <tr>
                    <td className="px-6 py-4">Total</td>
                    <td className="px-6 py-4 text-right tabular-nums">{fmt(totalImpr)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{fmt(totalClicks)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{pct(ctrMedio)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {uplift !== null && (
            <Card className="border-emerald-200 bg-emerald-50/60">
              <CardContent className="p-5 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-slate-700">
                  Anúncios destacados convertem{" "}
                  <span className="font-bold text-emerald-700">
                    {uplift > 0 ? `${pct(uplift)} mais` : `${pct(Math.abs(uplift))} menos`}
                  </span>{" "}
                  que os orgânicos no período selecionado (CTR {pct(featured.ctr)} vs {pct(organic.ctr)}).
                </p>
              </CardContent>
            </Card>
          )}

          {totalImpr === 0 && (
            <p className="text-center text-sm text-slate-400 py-6">
              Ainda não há dados de impressões/cliques para este período.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">{icon}<span className="text-sm text-slate-500">{label}</span></div>
        <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, badge, row }: { label: string; badge: React.ReactNode; row: CtrRow }) {
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-6 py-4 font-medium text-slate-900">
        <div className="flex items-center gap-2">{badge}<span>{label}</span></div>
      </td>
      <td className="px-6 py-4 text-right tabular-nums">{fmt(row.impressions)}</td>
      <td className="px-6 py-4 text-right tabular-nums">{fmt(row.clicks)}</td>
      <td className="px-6 py-4 text-right tabular-nums font-semibold text-slate-900">{pct(row.ctr)}</td>
    </tr>
  );
}
