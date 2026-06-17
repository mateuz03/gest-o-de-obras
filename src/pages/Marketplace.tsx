import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Box,
  Search,
  ShoppingCart,
  ArrowRight,
  Store,
  Sparkles,
  Filter,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  Loader2,
  SlidersHorizontal,
  X,
  PackageOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { StoreDirectory } from "@/components/marketplace/StoreDirectory";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { isHighlightActive } from "@/lib/featured";

const categorias = [
  "Todos",
  "Cimento e Argamassa",
  "Aço e Ferragens",
  "Tijolos e Blocos",
  "Areia e Pedra",
  "Hidráulica",
  "Elétrica",
  "Acabamentos",
] as const;

type Categoria = string;
type Ordenacao = "recentes" | "preco-asc" | "preco-desc" | "nome-asc";

interface Produto {
  id: string;
  user_id: string;
  nome_produto: string;
  categoria: string;
  preco: number;
  unidade_medida: string;
  foto_url?: string;
  created_at?: string | null;
  is_featured?: boolean | null;
  featured_until?: string | null;
  perfil_lojista?: {
    nome_loja: string;
    whatsapp: string;
  };
}

interface ItemProjeto {
  produto: Produto;
  quantidade: number;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fallbackImage =
  "https://images.unsplash.com/photo-1541888081622-132d718b52f6?q=80&w=400&auto=format&fit=crop";

function ProductImage({ src, alt }: { src?: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src || fallbackImage);

  useEffect(() => {
    setImgSrc(src || fallbackImage);
  }, [src]);

  return (
    <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
      <img
        src={imgSrc}
        alt={alt}
        loading="lazy"
        onError={() => setImgSrc(fallbackImage)}
        className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
      />
    </div>
  );
}

function FiltrosPanel({
  categoria,
  setCategoria,
  marcasSelecionadas,
  toggleMarca,
  precoMin,
  precoMax,
  setPrecoMin,
  setPrecoMax,
  onLimpar,
  lojasDisponiveis,
}: {
  categoria: Categoria;
  setCategoria: (c: Categoria) => void;
  marcasSelecionadas: string[];
  toggleMarca: (m: string) => void;
  precoMin: string;
  precoMax: string;
  setPrecoMin: (v: string) => void;
  setPrecoMax: (v: string) => void;
  onLimpar: () => void;
  lojasDisponiveis: string[];
}) {
  return (
    <div className="space-y-6 p-1">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Categorias</h3>
        <div className="space-y-1">
          {categorias.map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                categoria === c
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Lojas</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {lojasDisponiveis.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma loja disponível.</p>
          ) : (
            lojasDisponiveis.map((m) => (
              <label
                key={m}
                className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 hover:text-slate-900"
              >
                <Checkbox
                  checked={marcasSelecionadas.includes(m)}
                  onCheckedChange={() => toggleMarca(m)}
                />
                <span>{m}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Faixa de preço</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Mín"
            value={precoMin}
            onChange={(e) => setPrecoMin(e.target.value)}
            className="h-9"
          />
          <span className="text-slate-400">—</span>
          <Input
            type="number"
            placeholder="Máx"
            value={precoMax}
            onChange={(e) => setPrecoMax(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full border-slate-300 text-slate-600"
        onClick={onLimpar}
      >
        Limpar filtros
      </Button>
    </div>
  );
}

function ProjetoPanel({
  itens,
  onUpdateQtd,
  onRemove,
}: {
  itens: ItemProjeto[];
  onUpdateQtd: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  const subtotal = itens.reduce((acc, i) => acc + i.produto.preco * i.quantidade, 0);

  const comprarViaWhatsApp = () => {
    if (itens.length === 0) return;

    const primeiraLoja = itens[0].produto.perfil_lojista;
    if (!primeiraLoja || !primeiraLoja.whatsapp) {
      toast.error("Número de WhatsApp da loja não encontrado.");
      return;
    }

    const numeroZap = primeiraLoja.whatsapp.replace(/\D/g, "");

    let mensagem = `Olá, vim pelo Obra Link e gostaria de cotar os seguintes materiais:\n\n`;
    itens.forEach((it) => {
      mensagem += `- ${it.quantidade}x ${it.produto.nome_produto} (${it.produto.unidade_medida})\n`;
    });
    mensagem += `\nSubtotal estimado: ${formatCurrency(subtotal)}\nPodemos fechar o pedido?`;

    const url = `https://wa.me/55${numeroZap}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-1 pb-3">
        <ShoppingBag className="h-4 w-4 text-emerald-600" />
        <h3 className="font-semibold text-slate-900">Materiais do Projeto</h3>
        {itens.length > 0 && (
          <Badge className="ml-auto bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            {itens.length}
          </Badge>
        )}
      </div>

      {itens.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center px-4 py-10">
          <div>
            <PackageOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 mb-1">
              Monte sua lista de materiais
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Adicione produtos ao projeto para comparar preços e organizar seu orçamento.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 -mx-1 px-1 max-h-[420px]">
            <div className="space-y-3">
              {itens.map((it) => (
                <div
                  key={it.produto.id}
                  className="border border-slate-200 rounded-md p-3 bg-white"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 leading-tight line-clamp-2">
                        {it.produto.nome_produto}
                      </p>
                      <Link
                        to={`/vendedor/${it.produto.user_id}`}
                        className="text-xs text-emerald-600 hover:underline mt-0.5 inline-block"
                      >
                        {it.produto.perfil_lojista?.nome_loja || "Loja Parceira"}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatCurrency(it.produto.preco)} / {it.produto.unidade_medida}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(it.produto.id)}
                      className="text-slate-400 hover:text-red-500"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => onUpdateQtd(it.produto.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-semibold w-8 text-center">
                        {it.quantidade}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => onUpdateQtd(it.produto.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {formatCurrency(it.produto.preco * it.quantidade)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200 pt-3 mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Subtotal</span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <Button
              onClick={comprarViaWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Comprar pelo WhatsApp
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Marketplace() {
  const { user } = useAuth();

  const [produtosDB, setProdutosDB] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Todos");
  const [marcasSelecionadas, setMarcasSelecionadas] = useState<string[]>([]);
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recentes");
  const [viewMode, setViewMode] = useState<"produtos" | "lojas">("produtos");

  const [itens, setItens] = useState<ItemProjeto[]>([]);

  useEffect(() => {
    async function fetchMarketplace() {
      try {
        const { data, error } = await supabase
          .from("produtos_loja")
          .select(`
            id,
            user_id,
            nome_produto,
            categoria,
            preco,
            unidade_medida,
            foto_url,
<<<<<<< HEAD
            perfil_lojista!inner(nome_loja, whatsapp, status)
            is_featured,
            featured_until,
            perfil_lojista(nome_loja, whatsapp)
=======
            is_featured,
            featured_until,
            perfil_lojista!inner(nome_loja, whatsapp, status)
>>>>>>> 204edfb8ed222bbb1bcfd303100c9db278bb1ae9
          `)
          .eq("status", "ativo")
          .eq("perfil_lojista.status", "approved")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setProdutosDB(data as unknown as Produto[]);
      } catch (error) {
        console.error("Erro ao carregar o marketplace:", error);
        toast.error("Não foi possível carregar os produtos.");
      } finally {
        setLoading(false);
      }
    }
    fetchMarketplace();
  }, []);

  const lojasDisponiveis = useMemo(() => {
    const lojas = produtosDB
      .map((p) => p.perfil_lojista?.nome_loja)
      .filter(Boolean) as string[];
    return Array.from(new Set(lojas)).sort();
  }, [produtosDB]);

  const toggleMarca = (m: string) =>
    setMarcasSelecionadas((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const limparFiltros = () => {
    setCategoria("Todos");
    setMarcasSelecionadas([]);
    setPrecoMin("");
    setPrecoMax("");
    setBusca("");
  };

  const filtrados = useMemo(() => {
    const min = precoMin ? parseFloat(precoMin) : -Infinity;
    const max = precoMax ? parseFloat(precoMax) : Infinity;

    let resultado = produtosDB.filter((p) => {
      const lojaNome = p.perfil_lojista?.nome_loja || "";

      return (
        (categoria === "Todos" || p.categoria === categoria) &&
        (marcasSelecionadas.length === 0 || marcasSelecionadas.includes(lojaNome)) &&
        p.preco >= min &&
        p.preco <= max &&
        (busca === "" ||
          p.nome_produto.toLowerCase().includes(busca.toLowerCase()) ||
          lojaNome.toLowerCase().includes(busca.toLowerCase()))
      );
    });

    switch (ordenacao) {
      case "preco-asc":
        resultado = [...resultado].sort((a, b) => a.preco - b.preco);
        break;
      case "preco-desc":
        resultado = [...resultado].sort((a, b) => b.preco - a.preco);
        break;
      case "nome-asc":
        resultado = [...resultado].sort((a, b) =>
          a.nome_produto.localeCompare(b.nome_produto, "pt-BR")
        );
        break;
      case "recentes":
      default:
        break;
    }

    return resultado;
  }, [produtosDB, busca, categoria, marcasSelecionadas, precoMin, precoMax, ordenacao]);

  // Anúncios com destaque ativo (respeitando a validade do prazo)
  const destacados = useMemo(
    () => filtrados.filter((p) => isHighlightActive(p.is_featured, p.featured_until)),
    [filtrados]
  );

  // Feed geral com os destaques priorizados no topo
  const filtradosOrdenados = useMemo(() => {
    return [...filtrados].sort((a, b) => {
      const fa = isHighlightActive(a.is_featured, a.featured_until) ? 1 : 0;
      const fb = isHighlightActive(b.is_featured, b.featured_until) ? 1 : 0;
      return fb - fa;
    });
  }, [filtrados]);

  const filtrosAtivos = useMemo(() => {
    const ativos: { label: string; onRemove: () => void }[] = [];

    if (categoria !== "Todos") {
      ativos.push({
        label: categoria,
        onRemove: () => setCategoria("Todos"),
      });
    }

    marcasSelecionadas.forEach((marca) => {
      ativos.push({
        label: marca,
        onRemove: () => toggleMarca(marca),
      });
    });

    if (precoMin) {
      ativos.push({
        label: `Mín: ${formatCurrency(Number(precoMin))}`,
        onRemove: () => setPrecoMin(""),
      });
    }

    if (precoMax) {
      ativos.push({
        label: `Máx: ${formatCurrency(Number(precoMax))}`,
        onRemove: () => setPrecoMax(""),
      });
    }

    if (busca) {
      ativos.push({
        label: `Busca: "${busca}"`,
        onRemove: () => setBusca(""),
      });
    }

    return ativos;
  }, [categoria, marcasSelecionadas, precoMin, precoMax, busca]);

  const adicionarAoProjeto = (p: Produto) => {
    setItens((prev) => {
      const existe = prev.find((i) => i.produto.id === p.id);
      if (existe) {
        return prev.map((i) =>
          i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      return [...prev, { produto: p, quantidade: 1 }];
    });
    toast.success(`${p.nome_produto} adicionado ao projeto`);
  };

  const updateQtd = (id: string, delta: number) =>
    setItens((prev) =>
      prev
        .map((i) =>
          i.produto.id === id
            ? { ...i, quantidade: Math.max(0, i.quantidade + delta) }
            : i
        )
        .filter((i) => i.quantidade > 0)
    );

  const removerItem = (id: string) =>
    setItens((prev) => prev.filter((i) => i.produto.id !== id));

  const totalItensProjeto = itens.reduce((acc, i) => acc + i.quantidade, 0);

  return (
<div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">      
      <Navbar /> {/* <-- A MÁGICA ACONTECE AQUI */}

      <div className="lg:hidden sticky top-16 z-30 bg-white border-b border-slate-200 px-4 py-2 flex gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1">
              <Filter className="h-4 w-4 mr-1" /> Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[340px] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <FiltrosPanel
              categoria={categoria}
              setCategoria={setCategoria}
              marcasSelecionadas={marcasSelecionadas}
              toggleMarca={toggleMarca}
              precoMin={precoMin}
              precoMax={precoMax}
              setPrecoMin={setPrecoMin}
              setPrecoMax={setPrecoMax}
              onLimpar={limparFiltros}
              lojasDisponiveis={lojasDisponiveis}
            />
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white relative"
            >
              <ShoppingBag className="h-4 w-4 mr-1" /> Projeto
              {totalItensProjeto > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItensProjeto}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] sm:w-[380px] flex flex-col">
            <SheetHeader className="mb-4">
              <SheetTitle>Materiais do Projeto</SheetTitle>
            </SheetHeader>
            <ProjetoPanel itens={itens} onUpdateQtd={updateQtd} onRemove={removerItem} />
          </SheetContent>
        </Sheet>
      </div>

      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white">
        <div className="px-4 lg:px-6 py-8 lg:py-10">
          <Badge className="mb-3 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/30">
            Marketplace Obra Link
          </Badge>
          <div className="max-w-4xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Encontre materiais para sua obra com{" "}
              <span className="text-emerald-400">preços de atacado</span>.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-200 max-w-2xl">
              Compare lojas, organize seu projeto e monte seu orçamento com mais rapidez.
            </p>
          </div>
        </div>
      </section>

      <div className="px-4 lg:px-6 py-6 grid gap-6 lg:grid-cols-[260px_1fr_320px] xl:grid-cols-[280px_1fr_340px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-4">
                <FiltrosPanel
                  categoria={categoria}
                  setCategoria={setCategoria}
                  marcasSelecionadas={marcasSelecionadas}
                  toggleMarca={toggleMarca}
                  precoMin={precoMin}
                  precoMax={precoMax}
                  setPrecoMin={setPrecoMin}
                  setPrecoMax={setPrecoMax}
                  onLimpar={limparFiltros}
                  lojasDisponiveis={lojasDisponiveis}
                />
              </CardContent>
            </Card>
          </div>
        </aside>

        <main className="min-w-0">
          {/* Alternância de visão: Materiais x Lojas */}
          <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setViewMode("produtos")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "produtos"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Materiais
            </button>
            <button
              onClick={() => setViewMode("lojas")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "lojas"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Store className="h-4 w-4" />
              Lojas
            </button>
          </div>

          {viewMode === "lojas" ? (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">Diretório de Lojas</h2>
                <p className="text-sm text-slate-500">
                  Conheça as lojas parceiras e visite a vitrine de cada uma.
                </p>
              </div>
              <StoreDirectory />
            </>
          ) : (
          <>
          <div className="space-y-4 mb-5">

            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Buscar materiais, lojas..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center text-xs text-slate-500 whitespace-nowrap">
                  {filtrados.length} produtos encontrados
                </div>
                <div className="relative">
                  <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={ordenacao}
                    onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
                    className="h-11 pl-9 pr-9 rounded-md border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="recentes">Mais recentes</option>
                    <option value="preco-asc">Menor preço</option>
                    <option value="preco-desc">Maior preço</option>
                    <option value="nome-asc">Nome A-Z</option>
                  </select>
                </div>
              </div>
            </div>

            {filtrosAtivos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filtrosAtivos.map((filtro, index) => (
                  <Badge
                    key={`${filtro.label}-${index}`}
                    variant="outline"
                    className="bg-white border-slate-200 text-slate-700 pr-1"
                  >
                    <span className="px-1">{filtro.label}</span>
                    <button
                      onClick={filtro.onRemove}
                      className="ml-1 rounded-sm hover:bg-slate-100 p-0.5"
                      aria-label={`Remover filtro ${filtro.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-20 text-slate-500 bg-white rounded-lg border border-slate-200 shadow-sm">
              <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-medium text-slate-900">Nenhum produto encontrado</p>
              <p className="text-sm">
                Tente ajustar sua busca ou remover alguns filtros.
              </p>
            </div>
          ) : (
            <>
              {/* Carrossel "Materiais em Destaque" */}
              {destacados.length > 0 && (
                <section className="mb-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-slate-900">Materiais em Destaque</h2>
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                      Patrocinado
                    </Badge>
                  </div>
                  <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 snap-x">
                    {destacados.map((p) => (
                      <div key={p.id} className="w-60 shrink-0 snap-start">
                        <ProductCard produto={p} featured onAdd={adicionarAoProjeto} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filtradosOrdenados.map((p) => (
                  <ProductCard
                    key={p.id}
                    produto={p}
                    featured={isHighlightActive(p.is_featured, p.featured_until)}
                    onAdd={adicionarAoProjeto}
                  />
                ))}
              </div>
            </>
          )}
          </>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mt-8">

            <Card className="border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md">
              <CardContent className="p-5 flex items-center gap-4">
                <Sparkles className="h-8 w-8 text-emerald-100 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-base leading-snug mb-0.5">
                    Tem uma loja de construção?
                  </h3>
                  <p className="text-xs text-emerald-50">
                    Venda seus produtos no Obra Link.
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="bg-white text-emerald-700 hover:bg-emerald-50 whitespace-nowrap"
                >
                  <Link to="/seja-parceiro">Ser parceiro</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-4">
                <ProjetoPanel itens={itens} onUpdateQtd={updateQtd} onRemove={removerItem} />
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}