import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  Loader2,
  Search,
  Star,
  User,
  X,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FALLBACK_BLOG_IMAGE,
  getMockBlogPosts,
  mapBlogRowToPublicPost,
  type PublicBlogPost,
} from "@/lib/blog";
import { toast } from "sonner";

const CATEGORIAS = [
  "Todas as Categorias",
  "Gestão de Obras",
  "Produtividade",
  "Suprimentos",
  "Tecnologia BIM",
] as const;

const TIPOS = [
  "Todos os Formatos",
  "Artigo Técnico",
  "Guia Prático",
  "Tendência",
  "Estudo de Caso",
] as const;

const TEMAS_CHIPS = [
  "SINAPI",
  "Orçamento",
  "Produtividade",
  "Marketplace B2B",
  "Gestão de Obras",
  "Suprimentos",
] as const;

const ARTIGOS_POR_PAGINA = 3;

export default function Blog() {
  const { user } = useAuth();
  const [artigos, setArtigos] = useState<PublicBlogPost[]>([]);
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritosLoading, setFavoritosLoading] = useState(false);

  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>(CATEGORIAS[0]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>(TIPOS[0]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrandoFavoritos, setMostrandoFavoritos] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function carregarArtigos() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("id, slug, titulo, resumo, conteudo, categoria, tipo, autor, created_at, tempo_leitura, imagem, destaque")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        if (!data || data.length === 0) {
          setArtigos(getMockBlogPosts());
          return;
        }

        setArtigos(data.map(mapBlogRowToPublicPost));
      } catch (error) {
        console.error("Erro ao carregar artigos:", error);
        if (!cancelled) {
          setArtigos(getMockBlogPosts());
          toast.error("Usando dados em cache. Alguns artigos podem estar desatualizados.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void carregarArtigos();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFavoritos([]);
      return;
    }

    let cancelled = false;

    async function carregarFavoritos() {
      setFavoritosLoading(true);
      try {
        const { data, error } = await supabase
          .from("blog_favorites")
          .select("post_id")
          .eq("user_id", user.id);

        if (error) throw error;
        if (!cancelled) {
          setFavoritos((data ?? []).map((item) => Number(item.post_id)));
        }
      } catch (error) {
        console.error("Erro ao carregar favoritos:", error);
        if (!cancelled) {
          toast.error("Erro ao carregar seus favoritos.");
        }
      } finally {
        if (!cancelled) setFavoritosLoading(false);
      }
    }

    void carregarFavoritos();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFavorito = useCallback(
    async (event: React.MouseEvent, postId: number) => {
      event.preventDefault();
      event.stopPropagation();

      if (!user) {
        toast.error("Você precisa estar logado para favoritar artigos.");
        return;
      }

      const jaFavoritado = favoritos.includes(postId);

      try {
        if (jaFavoritado) {
          const { error } = await supabase
            .from("blog_favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("post_id", postId);

          if (error) throw error;
          setFavoritos((prev) => prev.filter((id) => id !== postId));
          toast.success("Removido dos favoritos.");
        } else {
          const { error } = await supabase
            .from("blog_favorites")
            .insert([{ user_id: user.id, post_id: postId }]);

          if (error) throw error;
          setFavoritos((prev) => [...prev, postId]);
          toast.success("Artigo favoritado.");
        }
      } catch (error) {
        console.error("Erro ao gerenciar favorito:", error);
        toast.error("Falha ao processar solicitação.");
      }
    },
    [favoritos, user],
  );

  const artigosFiltrados = useMemo(() => {
    return artigos.filter((artigo) => {
      const term = busca.trim().toLowerCase();
      const matchBusca =
        !term ||
        artigo.titulo.toLowerCase().includes(term) ||
        artigo.resumo.toLowerCase().includes(term) ||
        artigo.categoria.toLowerCase().includes(term);

      const matchCategoria =
        categoriaSelecionada === CATEGORIAS[0] || artigo.categoria === categoriaSelecionada;

      const matchTipo = tipoSelecionado === TIPOS[0] || artigo.tipo === tipoSelecionado;
      const matchFavorito = !mostrandoFavoritos || favoritos.includes(artigo.id);

      return matchBusca && matchCategoria && matchTipo && matchFavorito;
    });
  }, [artigos, busca, categoriaSelecionada, tipoSelecionado, mostrandoFavoritos, favoritos]);

  const { totalPaginas, paginaSegura, artigosPagina } = useMemo(() => {
    const total = Math.max(1, Math.ceil(artigosFiltrados.length / ARTIGOS_POR_PAGINA));
    const pagina = Math.min(paginaAtual, total);
    const inicio = (pagina - 1) * ARTIGOS_POR_PAGINA;

    return {
      totalPaginas: total,
      paginaSegura: pagina,
      artigosPagina: artigosFiltrados.slice(inicio, inicio + ARTIGOS_POR_PAGINA),
    };
  }, [artigosFiltrados, paginaAtual]);

  const artigoDestaque = useMemo(() => artigos.find((artigo) => artigo.destaque), [artigos]);

  const filtrosAtivos = useMemo(() => {
    return [
      busca && { label: `"${busca}"`, clear: () => setBusca("") },
      categoriaSelecionada !== CATEGORIAS[0] && {
        label: categoriaSelecionada,
        clear: () => setCategoriaSelecionada(CATEGORIAS[0]),
      },
      tipoSelecionado !== TIPOS[0] && {
        label: tipoSelecionado,
        clear: () => setTipoSelecionado(TIPOS[0]),
      },
      mostrandoFavoritos && {
        label: "Apenas favoritos",
        clear: () => setMostrandoFavoritos(false),
      },
    ].filter(Boolean) as Array<{ label: string; clear: () => void }>;
  }, [busca, categoriaSelecionada, tipoSelecionado, mostrandoFavoritos]);

  const limparFiltros = useCallback(() => {
    setBusca("");
    setCategoriaSelecionada(CATEGORIAS[0]);
    setTipoSelecionado(TIPOS[0]);
    setMostrandoFavoritos(false);
    setPaginaAtual(1);
  }, []);

  const handleTemaClick = useCallback((tema: string) => {
    setBusca(tema);
    setPaginaAtual(1);
  }, []);

  const handleCategoriaChange = useCallback((categoria: string) => {
    setCategoriaSelecionada(categoria);
    setPaginaAtual(1);
  }, []);

  const handleTipoChange = useCallback((tipo: string) => {
    setTipoSelecionado(tipo);
    setPaginaAtual(1);
  }, []);

  const handleToggleFavoritos = useCallback(() => {
    setMostrandoFavoritos((prev) => !prev);
    setPaginaAtual(1);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-16 font-sans text-slate-900">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-500">Buscando publicações do Obra Link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans text-slate-900">
      <Navbar />

      <main className="container mx-auto max-w-5xl px-4 py-12">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-slate-900">
              Blog <span className="text-emerald-600">Obra Link</span>
            </h1>
            <p className="mb-6 max-w-2xl text-lg text-slate-500">
              Conteúdo para engenheiros, gestores de obras, construtoras e fornecedores.
            </p>
            <div className="flex flex-wrap gap-2">
              {TEMAS_CHIPS.map((tema) => (
                <button
                  key={tema}
                  onClick={() => handleTemaClick(tema)}
                  className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 transition-colors hover:border-emerald-500 hover:text-emerald-600"
                >
                  {tema}
                </button>
              ))}
            </div>
          </div>

          {user ? (
            <Button
              variant={mostrandoFavoritos ? "default" : "outline"}
              onClick={handleToggleFavoritos}
              disabled={favoritosLoading}
              className={`rounded-full shadow-sm ${
                mostrandoFavoritos
                  ? "border-none bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-white text-slate-700"
              }`}
            >
              <Star className={`mr-2 h-4 w-4 ${mostrandoFavoritos ? "fill-white" : ""}`} />
              {mostrandoFavoritos ? "Ver todos" : `Favoritos (${favoritos.length})`}
            </Button>
          ) : null}
        </div>

        {artigoDestaque && filtrosAtivos.length === 0 ? (
          <Link
            to={`/blog/${artigoDestaque.slug}`}
            className="group relative mb-12 block rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="absolute left-4 top-4 z-10 flex gap-2">
                <Badge className="flex items-center gap-1 bg-emerald-600 font-semibold text-white">
                  <Star className="h-3 w-3" />
                  Destaque
                </Badge>
              </div>

              <button
                onClick={(event) => void toggleFavorito(event, artigoDestaque.id)}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 shadow backdrop-blur-sm transition-colors hover:bg-white"
                aria-label={
                  favoritos.includes(artigoDestaque.id)
                    ? "Remover dos favoritos"
                    : "Adicionar aos favoritos"
                }
              >
                <Star
                  className={`h-5 w-5 ${
                    favoritos.includes(artigoDestaque.id)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-400"
                  }`}
                />
              </button>

              <div className="flex flex-col md:flex-row">
                <div className="h-64 overflow-hidden md:w-1/2 md:h-auto">
                  <img
                    src={artigoDestaque.imagem}
                    alt={artigoDestaque.titulo}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="eager"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = FALLBACK_BLOG_IMAGE;
                    }}
                  />
                </div>

                <div className="flex flex-col justify-center p-8 md:w-1/2">
                  <Badge className="mb-4 w-fit border-none bg-emerald-100 font-semibold text-emerald-800">
                    {artigoDestaque.categoria}
                  </Badge>
                  <h2 className="mb-3 text-2xl font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-600">
                    {artigoDestaque.titulo}
                  </h2>
                  <p className="mb-6 line-clamp-3 text-slate-500">{artigoDestaque.resumo}</p>
                  <div className="mb-6 flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {artigoDestaque.autor}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {artigoDestaque.data}
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <Clock className="h-4 w-4" />
                      {artigoDestaque.tempoLeitura}
                    </span>
                  </div>
                  <Button className="w-fit rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Ler artigo completo
                  </Button>
                </div>
              </div>
            </div>
          </Link>
        ) : null}

        <div className="mb-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por SINAPI, orçamento, produtividade..."
              value={busca}
              onChange={(event) => {
                setBusca(event.target.value);
                setPaginaAtual(1);
              }}
              className="h-12 border-transparent bg-slate-50 pl-10 text-base focus:border-emerald-500 focus:bg-white"
            />
            {busca ? (
              <button
                onClick={() => setBusca("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 md:flex-nowrap">
            <div className="relative flex-1 md:w-48">
              <select
                value={tipoSelecionado}
                onChange={(event) => handleTipoChange(event.target.value)}
                className="h-12 w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>

            <div className="relative flex-1 md:w-56">
              <select
                value={categoriaSelecionada}
                onChange={(event) => handleCategoriaChange(event.target.value)}
                className="h-12 w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="mb-6 flex min-h-[28px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {filtrosAtivos.map((filtro) => (
              <span
                key={filtro.label}
                className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-sm font-medium text-emerald-700"
              >
                {filtro.label}
                <button
                  onClick={() => {
                    filtro.clear();
                    setPaginaAtual(1);
                  }}
                  className="transition-colors hover:text-emerald-900"
                >
                  <X className="ml-0.5 h-3 w-3" />
                </button>
              </span>
            ))}
            {filtrosAtivos.length > 0 ? (
              <button
                onClick={limparFiltros}
                className="text-sm text-slate-400 underline underline-offset-2 transition-colors hover:text-slate-700"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>

          <span className="text-sm font-medium text-slate-400">
            {artigosFiltrados.length === 0
              ? "Nenhum artigo encontrado"
              : `${artigosFiltrados.length} artigo${artigosFiltrados.length !== 1 ? "s" : ""} encontrado${artigosFiltrados.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {artigosPagina.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="mb-2 text-lg font-bold text-slate-700">Nenhum artigo encontrado</h3>
            <p className="mb-6 text-slate-400">Tente buscar por outro termo ou limpar os filtros.</p>
            <Button variant="outline" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {artigosPagina.map((artigo) => (
              <Link
                key={artigo.id}
                to={`/blog/${artigo.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-emerald-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 md:flex-row"
              >
                <div className="relative h-52 overflow-hidden bg-slate-100 md:h-auto md:w-2/5 lg:w-1/3">
                  <img
                    src={artigo.imagem}
                    alt={artigo.titulo}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = FALLBACK_BLOG_IMAGE;
                    }}
                  />

                  <button
                    onClick={(event) => void toggleFavorito(event, artigo.id)}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow backdrop-blur-sm transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        favoritos.includes(artigo.id)
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-400"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge className="border-none bg-emerald-100 font-semibold text-emerald-800 hover:bg-emerald-100">
                      {artigo.categoria}
                    </Badge>
                    <span className="text-xs font-medium text-slate-400">{artigo.tipo}</span>
                  </div>

                  <h2 className="mb-2 line-clamp-2 text-xl font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-600">
                    {artigo.titulo}
                  </h2>
                  <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-slate-500">
                    {artigo.resumo}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {artigo.autor}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {artigo.data}
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <Clock className="h-3.5 w-3.5" />
                        {artigo.tempoLeitura}
                      </span>
                    </div>

                    <span className="rounded-full border border-emerald-600 px-5 py-1.5 text-sm font-medium text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                      Ler artigo
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPaginas > 1 ? (
          <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Paginação">
            <Button
              variant="outline"
              onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
              disabled={paginaSegura === 1}
              className="h-10 w-10 rounded-full border-slate-200 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPaginas }, (_, index) => index + 1).map((numero) => (
              <Button
                key={numero}
                variant="outline"
                onClick={() => setPaginaAtual(numero)}
                className={`h-10 w-10 rounded-full p-0 ${
                  paginaSegura === numero
                    ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {numero}
              </Button>
            ))}

            <Button
              variant="outline"
              onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
              disabled={paginaSegura === totalPaginas}
              className="h-10 w-10 rounded-full border-slate-200 p-0"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </nav>
        ) : null}
      </main>
    </div>
  );
}
