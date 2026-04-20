import { useNavigate } from "react-router-dom";
import { Analysis } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ArrowRight, Image as ImageIcon } from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  pending: { label: "Planejamento", classes: "bg-amber-100 text-amber-800" },
  processing: { label: "Em Andamento", classes: "bg-blue-100 text-blue-800" },
  completed: { label: "Concluído", classes: "bg-emerald-100 text-emerald-800" },
  error: { label: "Com Erro", classes: "bg-red-100 text-red-800" },
};

function progressFor(a: Analysis): number {
  if (a.status === "completed") return 100;
  if (a.status === "processing") return 65;
  if (a.status === "pending") return 15;
  return 0;
}

const formatCurrency = (v: number) =>
  v > 0
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v)
    : "—";

interface ProjectsTableProps {
  analyses: Analysis[];
  onPickCover?: (a: Analysis) => void;
}

export function ProjectsTable({ analyses, onPickCover }: ProjectsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Projeto</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Orçamento</th>
              <th className="px-4 py-3 text-right font-medium">Gasto</th>
              <th className="px-4 py-3 text-left font-medium w-[180px]">Progresso</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Criado em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analyses.map((a) => {
              const status = STATUS_BADGE[a.status] || STATUS_BADGE.pending;
              const progress = progressFor(a);
              const orcamento = a.total_estimado ?? 0;
              const gasto = Math.round(orcamento * (progress / 100));
              const cover = (a as any).cover_image_url || a.imagem_url;
              const progressColor = a.status === "completed" ? "bg-emerald-500" : "bg-blue-500";

              return (
                <tr
                  key={a.id}
                  className="transition-colors hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/analise/${a.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPickCover?.(a);
                        }}
                        className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100 group/cover"
                        title="Trocar capa"
                      >
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{a.nome_projeto}</p>
                        {a.regiao && <p className="truncate text-xs text-slate-500 capitalize">{a.regiao}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", status.classes)}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {formatCurrency(orcamento)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(gasto)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full", progressColor)}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs font-semibold text-slate-700">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                    {format(new Date(a.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/analise/${a.id}`);
                      }}
                      className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      Abrir <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
