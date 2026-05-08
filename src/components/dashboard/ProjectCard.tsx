import { Link } from "react-router-dom";
import { Calendar, MapPin, Users, FileText, ImagePlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Analysis } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { isAnalysisIncomplete } from "@/lib/projectStatus";

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1431576901776-e539bd916ba2?auto=format&fit=crop&w=800&q=80",
];

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  pending: { label: "Planejamento", classes: "bg-amber-100 text-amber-800" },
  processing: { label: "Em Andamento", classes: "bg-blue-100 text-blue-800" },
  completed: { label: "Concluído", classes: "bg-emerald-100 text-emerald-800" },
  error: { label: "Com Erro", classes: "bg-red-100 text-red-800" },
};

const TIPO_LABELS: Record<string, string> = {
  casa_terrea: "Casa Térrea",
  sobrado: "Sobrado",
  apartamento: "Apartamento",
  comercial: "Comercial",
};

function hashIndex(id: string, mod: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

function progressFor(a: Analysis): number {
  if (a.status === "completed") return 100;
  if (a.status === "processing") return 65;
  if (a.status === "pending") return 15;
  return 0;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

interface ProjectCardProps {
  analysis: Analysis;
  imageUrl?: string;
  onPickCover?: (a: Analysis) => void;
}

export function ProjectCard({ analysis: a, imageUrl, onPickCover }: ProjectCardProps) {
  const customCover = (a as any).cover_image_url as string | undefined;
  const cover = imageUrl || customCover || a.imagem_url || COVER_IMAGES[hashIndex(a.id, COVER_IMAGES.length)];
  const status = STATUS_BADGE[a.status] || STATUS_BADGE.pending;
  const progress = progressFor(a);
  const orcamento = a.total_estimado ?? 0;
  // Simulated "gasto" — until real spend data is wired (uses progress as proxy)
  const gasto = Math.round(orcamento * (progress / 100));
  const gastoPct = orcamento > 0 ? Math.round((gasto / orcamento) * 100) : 0;
  const tipo = a.tipo_construcao ? TIPO_LABELS[a.tipo_construcao] || a.tipo_construcao : "Projeto de obra";
  const descricao = `${tipo}${a.regiao ? ` em ${a.regiao}` : ""} — análise gerada por IA com orçamento detalhado e cronograma.`;

  const progressColor = a.status === "completed" ? "bg-emerald-500" : "bg-blue-500";

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Cover */}
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={cover}
          alt={a.nome_projeto}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />

        {/* Status badge */}
        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
            status.classes,
          )}
        >
          {status.label}
        </span>

        {/* Change cover button */}
        {onPickCover && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPickCover(a);
            }}
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
            title="Trocar capa"
          >
            <ImagePlus className="h-3.5 w-3.5" /> Capa
          </button>
        )}

        {/* Title + location */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-lg font-bold text-white line-clamp-1">{a.nome_projeto}</h3>
          {a.regiao && (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-200">
              <MapPin className="h-3.5 w-3.5" />
              <span className="capitalize">{a.regiao}</span>
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-sm text-slate-500 line-clamp-2">{descricao}</p>

        {/* Progress */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-600">Progresso</span>
            <span className="font-bold text-slate-800">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full transition-all", progressColor)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Financial blocks */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Orçamento</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">
              {orcamento > 0 ? formatCurrency(orcamento) : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Gasto ({gastoPct}%)</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">
              {gasto > 0 ? formatCurrency(gasto) : "—"}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(a.created_at), "dd MMM yyyy", { locale: ptBR })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {1 + hashIndex(a.id, 12)} pessoas
          </span>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-2">
          <Button
            variant="outline"
            asChild
            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          >
            <Link to={`/analise/${a.id}`}>
              <FileText className="mr-1.5 h-4 w-4" /> Orçamento
            </Link>
          </Button>
          <Button
            asChild
            className="flex-[1.2] bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
          >
            <Link to={`/analise/${a.id}`}>Ver Detalhes</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
