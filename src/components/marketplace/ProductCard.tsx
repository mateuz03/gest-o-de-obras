import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, ShoppingCart, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface MarketplaceProduto {
  id: string;
  user_id: string;
  nome_produto: string;
  categoria: string;
  preco: number;
  unidade_medida: string;
  foto_url?: string;
  is_featured?: boolean | null;
  featured_until?: string | null;
  perfil_lojista?: {
    nome_loja: string;
    whatsapp: string;
  };
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fallbackImage =
  "https://images.unsplash.com/photo-1541888081622-132d718b52f6?q=80&w=400&auto=format&fit=crop";

function ProductImage({ src, alt }: { src?: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src || fallbackImage);
  useEffect(() => setImgSrc(src || fallbackImage), [src]);
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
      <img
        src={imgSrc}
        alt={alt}
        loading="lazy"
        onError={() => setImgSrc(fallbackImage)}
        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
}

interface ProductCardProps {
  produto: MarketplaceProduto;
  /** Destaque ativo (já considerando a validade do prazo) */
  featured?: boolean;
  onAdd: (p: MarketplaceProduto) => void;
}

export function ProductCard({ produto: p, featured = false, onAdd }: ProductCardProps) {
  return (
    <Card
      className={`flex flex-col overflow-hidden bg-white transition-all hover:shadow-lg ${
        featured
          ? "border-amber-300 ring-1 ring-amber-200 shadow-md bg-gradient-to-b from-amber-50/60 to-white"
          : "border-slate-200"
      }`}
    >
      <div className="relative">
        <ProductImage src={p.foto_url} alt={p.nome_produto} />
        {featured && (
          <Badge className="absolute left-2 top-2 gap-1 border-0 bg-amber-500 text-white shadow-sm hover:bg-amber-500">
            <Sparkles className="h-3 w-3" />
            Destaque
          </Badge>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <Badge
          variant="outline"
          className="w-fit border-slate-200 bg-slate-50 text-xs text-slate-600"
        >
          {p.categoria}
        </Badge>

        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-slate-900">
          {p.nome_produto}
        </h3>

        <Link
          to={`/vendedor/${p.user_id}`}
          className="group flex w-fit items-center gap-1 text-xs text-slate-500 transition-colors hover:text-emerald-600"
        >
          <Store className="h-3 w-3 text-emerald-600 transition-transform group-hover:scale-110" />
          <span className="truncate font-medium group-hover:underline">
            {p.perfil_lojista?.nome_loja || "Loja Parceira"}
          </span>
        </Link>

        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-lg font-bold tabular-nums text-slate-900">
            {formatCurrency(p.preco)}
          </span>
          <span className="text-xs text-slate-500">/ {p.unidade_medida}</span>
        </div>

        <div className="mt-auto pt-2">
          <Button
            size="sm"
            className="w-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            onClick={() => onAdd(p)}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Adicionar ao Projeto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
