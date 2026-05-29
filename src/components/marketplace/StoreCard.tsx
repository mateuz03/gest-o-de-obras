import { Link } from "react-router-dom";
import { Store, MapPin, Package, BadgeCheck, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface LojaDiretorio {
  id: string;
  user_id: string;
  nome_loja: string;
  logo_url?: string | null;
  descricao?: string | null;
  categoria?: string | null;
  cidade?: string | null;
  estado?: string | null;
  is_premium?: boolean | null;
  total_produtos: number;
}

export function StoreCard({ loja }: { loja: LojaDiretorio }) {
  const premium = !!loja.is_premium;

  return (
    <Link to={`/loja/${loja.user_id}`} className="group block h-full">
      <Card
        className={`h-full overflow-hidden bg-white transition-all hover:-translate-y-1 hover:shadow-lg ${
          premium
            ? "border-emerald-300 ring-1 ring-emerald-200 shadow-md"
            : "border-slate-200"
        }`}
      >
        {premium && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-1.5 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Loja em Destaque
          </div>
        )}

        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
              {loja.logo_url ? (
                <img
                  src={loja.logo_url}
                  alt={`Logo ${loja.nome_loja}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-7 w-7 text-emerald-600/40" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5">
                <h3 className="truncate text-base font-bold leading-tight text-slate-900">
                  {loja.nome_loja}
                </h3>
                {premium && (
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                )}
              </div>

              {loja.categoria && (
                <Badge
                  variant="outline"
                  className="mt-1.5 border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700"
                >
                  {loja.categoria}
                </Badge>
              )}

              {(loja.cidade || loja.estado) && (
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <span className="truncate">
                    {[loja.cidade, loja.estado].filter(Boolean).join(" - ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
            {loja.descricao || "Esta loja ainda não adicionou uma descrição."}
          </p>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Package className="h-3.5 w-3.5 text-emerald-600" />
              {loja.total_produtos}{" "}
              {loja.total_produtos === 1 ? "material publicado" : "materiais publicados"}
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 transition-colors group-hover:text-emerald-800">
              Ver vitrine
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
