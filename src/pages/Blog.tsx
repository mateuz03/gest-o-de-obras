import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search, Calendar, Clock, User,
  ArrowLeft, ArrowRight, ChevronDown, X,
  BookOpen, Star, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Artigo {
  id: number;
  slug: string;
  categoria: string;
  tipo: string;
  titulo: string;
  resumo: string;
  autor: string;
  data: string;
  tempoLeitura: string;
  destaque: boolean;
  imagem: string;
}

const CATEGORIAS = ["Todas as Categorias", "Gestão de Obras", "Produtividade", "Suprimentos", "Tecnologia BIM"];
const TIPOS = ["Todos os Formatos", "Artigo Técnico", "Guia Prático", "Tendência", "Estudo de Caso"];
const TEMAS_CHIPS = ["SINAPI", "Orçamento", "Produtividade", "Marketplace B2B", "Gestão de Obras", "Suprimentos"];
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%23f1f5f9'/%3E%3Crect x='340' y='160' width='120' height='80' rx='8' fill='%23cbd5e1'/%3E%3Ccircle cx='400' cy='145' r='20' fill='%23cbd5e1'/%3E%3C/svg%3E";

export default function Blog() {
  const { user } = useAuth();
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [favoritos, setFavoritos] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(CATEGORIAS[0]);
  const [tipoSelecionado, setTipoSelecionado] = useState(TIPOS[0]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrandoFavoritos, setMostrandoFavoritos] = useState(false);
  const ARTIGOS_POR_PAGINA = 3;

  // Carregar artigos e favoritos do Supabase
  useEffect(() => {
    async function carregarDadosBlog() {
      setLoading(true);
      try {
        // Buscar artigos
        const { data: postsData, error: postsError } = await supabase
          .from("blog_posts")
          .select("*")
          .order("created_at", { ascending: false });

        if (postsError) throw postsError;

        // Mapeia snake_case do banco para o camelCase da UI
        const artigosMapeados: Artigo[] = (postsData || []).map((p: any) => ({
          id: p.id,
          slug: p.slug,
          categoria: p.categoria,
          tipo: p.tipo,
          titulo: p.titulo,
          resumo: p.resumo,
          autor: p.autor,
          data: new Date(p.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }),
          tempoLeitura: p.tempo_leitura,
          destaque: p.destaque,
          imagem: p.imagem || "",
        }));

        setArtigos(artigosMapeados);

        // Buscar favoritos se o usuário estiver logado
        if (user) {
          const { data: favData, error: favError } = await supabase
            .from("blog_favorites")
            .select("post_id")
            .eq("user_id", user.id);

          if (favError) throw favError;
          setFavoritos(favData?.map((f: any) => Number(f.post_id)) || []);
        }
      } catch (err) {
        console.error("Erro ao carregar o blog:", err);
        toast.error("Não foi possível carregar as publicações.");
      } finally {
        setLoading(false);
      }
    }

    carregarDadosBlog();
  }, [user]);

  // Alternar Favorito
  const toggleFavorito = async (e: React.MouseEvent, postId: number) => {
    e.preventDefault();
    e.stopPropagation();

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
        setFavoritos(prev => prev.filter(id => id !== postId));
        toast.success("Removido dos favoritos.");
      } else {
        const { error } = await supabase
          .from("blog_favorites")
          .insert([{ user_id: user.id, post_id: postId }]);

        if (error) throw error;
        setFavoritos(prev => [...prev, postId]);
        toast.success("Artigo favoritado!");
      }
    } catch (err) {
      console.error("Erro ao gerenciar favorito:", err);
      toast.error("Falha ao processar solicitação.");
    }
  };

  // ── Filtragem real ──────────────────────────────────────
  const artigosFiltrados = useMemo(() => {
    return artigos.filter((a) => {
      const matchBusca =
        !busca ||
        a.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        a.resumo.toLowerCase().includes(busca.toLowerCase()) ||
        a.categoria.toLowerCase().includes(busca.toLowerCase());
      const matchCategoria =
        categoriaSelecionada === CATEGORIAS[0] || a.categoria === categoriaSelecionada;
      const matchTipo =
        tipoSelecionado === TIPOS[0] || a.tipo === tipoSelecionado;
      const matchFavorito = !mostrandoFavoritos || favoritos.includes(a.id);
      
      return matchBusca && matchCategoria && matchTipo && matchFavorito;
    });
  }, [artigos, busca, categoriaSelecionada, tipoSelecionado, mostrandoFavoritos, favoritos]);

  // ── Paginação ───────────────────────────────────────────
  const totalPaginas = Math.max(1, Math.ceil(artigosFiltrados.length / ARTIGOS_POR_PAGINA));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const artigosPagina = artigosFiltrados.slice(
    (paginaSegura - 1) * ARTIGOS_POR_PAGINA,
    paginaSegura * ARTIGOS_POR_PAGINA,
  );

  const artigoDestaque = useMemo(() => artigos.find((a) => a.destaque), [artigos]);

  // ── Filtros ativos ──────────────────────────────────────
  const filtrosAtivos = [
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
      label: "Apenas Favoritos",
      clear: () => setMostrandoFavoritos(false),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const limparFiltros = () => {
    setBusca("");
    setCategoriaSelecionada(CATEGORIAS[0]);
    setTipoSelecionado(TIPOS[0]);
    setMostrandoFavoritos(false);
    setPaginaAtual(1);
  };

  const temFiltrosAtivos = filtrosAtivos.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-500">Buscando publicações do Obra Link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <Navbar />

      <main className="container max-w-5xl mx-auto py-12 px-4">

        {/* HERO DO BLOG */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
              Blog <span className="text-emerald-600">Obra Link</span>
            </h1>
            <p className="text-lg text-slate-500 mb-6 max-w-2xl">
              Conteúdo para engenheiros, gestores de obras, construtoras e
              fornecedores — orçamento, SINAPI, produtividade e tecnologia.
            </p>
            <div className="flex flex-wrap gap-2">
              {TEMAS_CHIPS.map((tema) => (
                <button
                  key={tema}
                  onClick={() => {
                    setBusca(tema);
                    setPaginaAtual(1);
                  }}
                  className="px-3 py-1 text-sm font-medium bg-white border border-slate-200 rounded-full text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                >
                  {tema}
                </button>
              ))}
            </div>
          </div>

          {/* Botão de alternar visualização de favoritos */}
          {user && (
            <Button
              variant={mostrandoFavoritos ? "default" : "outline"}
              onClick={() => {
                setMostrandoFavoritos(!mostrandoFavoritos);
                setPaginaAtual(1);
              }}
              className={`rounded-full shadow-sm ${mostrandoFavoritos ? "bg-amber-500 hover:bg-amber-600 text-white border-none" : "bg-white text-slate-700"}`}
            >
              <Star className={`w-4 h-4 mr-2 ${mostrandoFavoritos ? "fill-white" : ""}`} /> 
              {mostrandoFavoritos ? "Ver Todos os Artigos" : `Meus Favoritos (${favoritos.length})`}
            </Button>
          )}
        </div>

        {/* ARTIGO EM DESTAQUE */}
        {artigoDestaque && !temFiltrosAtivos && (
          <Link
            to={`/blog/${artigoDestaque.slug}`}
            className="block mb-12 group relative"
            aria-label={`Artigo em destaque: ${artigoDestaque.titulo}`}
          >
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Badge className="bg-emerald-600 text-white font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3" /> Destaque
                </Badge>
              </div>

              {/* Botão de favoritar flutuante no Destaque */}
              <button
                onClick={(e) => toggleFavorito(e, artigoDestaque.id)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow hover:bg-white transition-colors"
              >
                <Star className={`w-5 h-5 ${favoritos.includes(artigoDestaque.id) ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} />
              </button>

              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 h-64 md:h-auto overflow-hidden">
                  <img
                    src={artigoDestaque.imagem}
                    alt={artigoDestaque.titulo}
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="md:w-1/2 p-8 flex flex-col justify-center">
                  <Badge className="bg-emerald-100 text-emerald-800 border-none w-fit mb-4 font-semibold">
                    {artigoDestaque.categoria}
                  </Badge>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3 leading-snug group-hover:text-emerald-600 transition-colors">
                    {artigoDestaque.titulo}
                  </h2>
                  <p className="text-slate-500 mb-6 line-clamp-3">
                    {artigoDestaque.resumo}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-400 font-medium mb-6">
                    <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{artigoDestaque.autor}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{artigoDestaque.data}</span>
                    <span className="flex items-center gap-1.5 text-emerald-600"><Clock className="w-4 h-4" />{artigoDestaque.tempoLeitura}</span>
                  </div>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 w-fit">
                    <BookOpen className="w-4 h-4 mr-2" /> Ler artigo completo
                  </Button>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* BUSCA E FILTROS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Buscar por SINAPI, orçamento, produtividade, gestão..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
              className="pl-10 h-12 bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500 text-base"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-3 md:w-auto">
            <div className="relative flex-1 md:w-48">
              <select
                value={tipoSelecionado}
                onChange={(e) => { setTipoSelecionado(e.target.value); setPaginaAtual(1); }}
                className="w-full h-12 appearance-none bg-slate-50 border border-slate-200 rounded-md px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {TIPOS.map((tipo) => <option key={tipo}>{tipo}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative flex-1 md:w-56">
              <select
                value={categoriaSelecionada}
                onChange={(e) => { setCategoriaSelecionada(e.target.value); setPaginaAtual(1); }}
                className="w-full h-12 appearance-none bg-slate-50 border border-slate-200 rounded-md px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {CATEGORIAS.map((cat) => <option key={cat}>{cat}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filtros ativos */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 min-h-[28px]">
          <div className="flex flex-wrap items-center gap-2">
            {filtrosAtivos.map((f) => (
              <span
                key={f.label}
                className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-0.5 text-sm font-medium"
              >
                {f.label}
                <button onClick={() => { f.clear(); setPaginaAtual(1); }}>
                  <X className="w-3 h-3 ml-0.5 hover:text-emerald-900" />
                </button>
              </span>
            ))}
            {temFiltrosAtivos && (
              <button
                onClick={limparFiltros}
                className="text-sm text-slate-400 hover:text-slate-700 underline underline-offset-2 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <span className="text-sm text-slate-400 font-medium">
            {artigosFiltrados.length === 0
              ? "Nenhum artigo encontrado"
              : `${artigosFiltrados.length} artigo${artigosFiltrados.length > 1 ? "s" : ""} encontrado${artigosFiltrados.length > 1 ? "s" : ""}`}
          </span>
        </div>

        {/* LISTA DE ARTIGOS */}
        {artigosPagina.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum artigo encontrado</h3>
            <p className="text-slate-400 mb-6">Tente buscar por outro termo ou limpar os filtros.</p>
            <Button variant="outline" onClick={limparFiltros}>Limpar filtros</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {artigosPagina.map((artigo) => (
              <Link
                key={artigo.id}
                to={`/blog/${artigo.slug}`}
                className="flex flex-col md:flex-row bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all group relative"
                aria-label={artigo.titulo}
              >
                {/* Imagem */}
                <div className="md:w-2/5 lg:w-1/3 h-52 md:h-auto overflow-hidden bg-slate-100 relative flex-shrink-0">
                  <img
                    src={artigo.imagem}
                    alt={artigo.titulo}
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Botão de Favorito no Card Normal */}
                  <button
                    onClick={(e) => toggleFavorito(e, artigo.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow hover:bg-white transition-all scale-90 md:scale-100"
                  >
                    <Star className={`w-4 h-4 ${favoritos.includes(artigo.id) ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} />
                  </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6 md:p-8 flex flex-col justify-center flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-semibold">
                      {artigo.categoria}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">{artigo.tipo}</span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 mb-2 leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
                    {artigo.titulo}
                  </h2>

                  <p className="text-slate-500 mb-5 line-clamp-2 text-sm leading-relaxed">
                    {artigo.resumo}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-4 mt-auto">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{artigo.autor}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{artigo.data}</span>
                      <span className="flex items-center gap-1.5 text-emerald-600"><Clock className="w-3.5 h-3.5" />{artigo.tempoLeitura}</span>
                    </div>
                    <span className="border border-emerald-600 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors text-sm font-medium rounded-full px-5 py-1.5">
                      Ler artigo
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* PAGINAÇÃO */}
        {totalPaginas > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
              disabled={paginaSegura === 1}
              className="w-10 h-10 p-0 rounded-full border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
              <Button
                key={num}
                variant="outline"
                onClick={() => setPaginaAtual(num)}
                className={`w-10 h-10 p-0 rounded-full transition-colors ${
                  paginaSegura === num
                    ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {num}
              </Button>
            ))}

            <Button
              variant="outline"
              onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaSegura === totalPaginas}
              className="w-10 h-10 p-0 rounded-full border-slate-200"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}