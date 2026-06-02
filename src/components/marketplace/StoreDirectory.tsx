import { useEffect, useMemo, useState } from "react";
import { Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StoreCard, type LojaDiretorio } from "./StoreCard";
import { isHighlightActive } from "@/lib/featured";

const CATEGORIA_TODAS = "Todas";

export function StoreDirectory() {
  const [lojas, setLojas] = useState<LojaDiretorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>(CATEGORIA_TODAS);

  useEffect(() => {
    async function fetchLojas() {
      try {
        const { data: perfis, error } = await supabase
          .from("perfil_lojista")
          .select(
            "id, user_id, nome_loja, logo_url, descricao, categoria, cidade, estado, is_premium"
          )
          .eq("status", "ativo");

        if (error) throw error;

        // Conta produtos ativos por loja
        const { data: produtos, error: prodError } = await supabase
          .from("produtos_loja")
          .select("user_id")
          .eq("status", "ativo");

        if (prodError) throw prodError;

        const contagem = new Map<string, number>();
        (produtos || []).forEach((p: { user_id: string }) => {
          contagem.set(p.user_id, (contagem.get(p.user_id) || 0) + 1);
        });

        const mapeadas: LojaDiretorio[] = (perfis || []).map((l) => ({
          ...l,
          total_produtos: contagem.get(l.user_id) || 0,
        }));

        setLojas(mapeadas);
      } catch (err) {
        console.error("Erro ao carregar diretório de lojas:", err);
        toast.error("Não foi possível carregar as lojas.");
      } finally {
        setLoading(false);
      }
    }
    fetchLojas();
  }, []);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    lojas.forEach((l) => l.categoria && set.add(l.categoria));
    return [CATEGORIA_TODAS, ...Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))];
  }, [lojas]);

  const lojasFiltradas = useMemo(() => {
    const base =
      categoriaAtiva === CATEGORIA_TODAS
        ? lojas
        : lojas.filter((l) => l.categoria === categoriaAtiva);

    // Premium sempre no topo
    return [...base].sort((a, b) => {
      if (!!a.is_premium !== !!b.is_premium) return a.is_premium ? -1 : 1;
      return a.nome_loja.localeCompare(b.nome_loja, "pt-BR");
    });
  }, [lojas, categoriaAtiva]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Filtro por categorias */}
      <div className="mb-5 flex flex-wrap gap-2">
        {categorias.map((c) => (
          <button
            key={c}
            onClick={() => setCategoriaAtiva(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              categoriaAtiva === c
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {lojasFiltradas.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-20 text-center text-slate-500 shadow-sm">
          <Store className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-lg font-medium text-slate-900">Nenhuma loja encontrada</p>
          <p className="text-sm">
            {categoriaAtiva === CATEGORIA_TODAS
              ? "Ainda não há lojas cadastradas neste diretório."
              : "Nenhuma loja nesta categoria por enquanto."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lojasFiltradas.map((loja) => (
            <StoreCard key={loja.id} loja={loja} />
          ))}
        </div>
      )}
    </div>
  );
}
