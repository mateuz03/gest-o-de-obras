import { useState, useMemo } from "react";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const categorias = ["Todos", "Básicos", "Hidráulica", "Elétrica", "Acabamentos"] as const;
type Categoria = typeof categorias[number];

interface Produto {
  id: string;
  nome: string;
  marca: string;
  categoria: Exclude<Categoria, "Todos">;
  preco: number;
  unidade: string;
  imagem: string;
}

const produtos: Produto[] = [
  { id: "1", nome: "Cimento CP II 50kg", marca: "Votorantim", categoria: "Básicos", preco: 38.9, unidade: "saco", imagem: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop" },
  { id: "2", nome: "Areia Média Lavada", marca: "Mineradora SP", categoria: "Básicos", preco: 145.0, unidade: "m³", imagem: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=300&fit=crop" },
  { id: "3", nome: "Tijolo Cerâmico 9x19x19", marca: "Cerâmica Real", categoria: "Básicos", preco: 1.25, unidade: "un", imagem: "https://images.unsplash.com/photo-1604762524889-3e2fcc145683?w=400&h=300&fit=crop" },
  { id: "4", nome: "Tubo PVC Soldável 25mm", marca: "Tigre", categoria: "Hidráulica", preco: 18.5, unidade: "barra 6m", imagem: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=300&fit=crop" },
  { id: "5", nome: "Conexão Joelho 90° 25mm", marca: "Amanco", categoria: "Hidráulica", preco: 2.3, unidade: "un", imagem: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=300&fit=crop" },
  { id: "6", nome: "Caixa d'água 1000L", marca: "Fortlev", categoria: "Hidráulica", preco: 489.0, unidade: "un", imagem: "https://images.unsplash.com/photo-1603792907191-a929c0d2c7f1?w=400&h=300&fit=crop" },
  { id: "7", nome: "Cabo Flexível 2,5mm² (rolo 100m)", marca: "Prysmian", categoria: "Elétrica", preco: 235.0, unidade: "rolo", imagem: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop" },
  { id: "8", nome: "Disjuntor Bipolar 25A", marca: "Schneider", categoria: "Elétrica", preco: 78.9, unidade: "un", imagem: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&h=300&fit=crop" },
  { id: "9", nome: "Quadro de Distribuição 12 div.", marca: "Pial Legrand", categoria: "Elétrica", preco: 156.0, unidade: "un", imagem: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=300&fit=crop" },
  { id: "10", nome: "Porcelanato Acetinado 60x60", marca: "Portobello", categoria: "Acabamentos", preco: 65.9, unidade: "m²", imagem: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&h=300&fit=crop" },
  { id: "11", nome: "Tinta Acrílica Premium 18L", marca: "Suvinil", categoria: "Acabamentos", preco: 389.0, unidade: "balde", imagem: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=300&fit=crop" },
  { id: "12", nome: "Argamassa AC-III 20kg", marca: "Quartzolit", categoria: "Acabamentos", preco: 32.5, unidade: "saco", imagem: "https://images.unsplash.com/photo-1607472829923-9b4f8aaaf6ec?w=400&h=300&fit=crop" },
];

const marcasDisponiveis = Array.from(new Set(produtos.map((p) => p.marca))).sort();

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface ItemProjeto {
  produto: Produto;
  quantidade: number;
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
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Marcas</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {marcasDisponiveis.map((m) => (
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
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Faixa de Preço</h3>
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
            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 leading-relaxed">
              Seu projeto ainda não tem materiais. Clique em "Adicionar ao Projeto" para começar.
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
                        {it.produto.nome}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatCurrency(it.produto.preco)} / {it.produto.unidade}
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
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Revisar Lista <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Marketplace() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Todos");
  const [marcasSelecionadas, setMarcasSelecionadas] = useState<string[]>([]);
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");

  // Mock 2 itens iniciais
  const [itens, setItens] = useState<ItemProjeto[]>([
    { produto: produtos[0], quantidade: 20 },
    { produto: produtos[3], quantidade: 5 },
  ]);

  const toggleMarca = (m: string) =>
    setMarcasSelecionadas((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );

  const limparFiltros = () => {
    setCategoria("Todos");
    setMarcasSelecionadas([]);
    setPrecoMin("");
    setPrecoMax("");
  };

  const filtrados = useMemo(() => {
    const min = precoMin ? parseFloat(precoMin) : -Infinity;
    const max = precoMax ? parseFloat(precoMax) : Infinity;
    return produtos.filter(
      (p) =>
        (categoria === "Todos" || p.categoria === categoria) &&
        (marcasSelecionadas.length === 0 || marcasSelecionadas.includes(p.marca)) &&
        p.preco >= min &&
        p.preco <= max &&
        (busca === "" ||
          p.nome.toLowerCase().includes(busca.toLowerCase()) ||
          p.marca.toLowerCase().includes(busca.toLowerCase())),
    );
  }, [busca, categoria, marcasSelecionadas, precoMin, precoMax]);

  const adicionarAoProjeto = (p: Produto) => {
    setItens((prev) => {
      const existe = prev.find((i) => i.produto.id === p.id);
      if (existe) {
        return prev.map((i) =>
          i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      }
      return [...prev, { produto: p, quantidade: 1 }];
    });
    toast.success(`${p.nome} adicionado ao projeto`);
  };

  const updateQtd = (id: string, delta: number) =>
    setItens((prev) =>
      prev
        .map((i) =>
          i.produto.id === id ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i,
        )
        .filter((i) => i.quantidade > 0),
    );

  const removerItem = (id: string) =>
    setItens((prev) => prev.filter((i) => i.produto.id !== id));

  const totalItensProjeto = itens.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="px-4 lg:px-6 flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>Obra Link</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to={user ? "/dashboard" : "/auth"} className="hover:text-slate-900">Gestão de Projetos</Link>
            <Link to="/marketplace" className="text-slate-900 font-semibold">Marketplace</Link>
            <Link to="/profissionais" className="hover:text-slate-900">Prestar Serviços</Link>
            <Link to="/seja-parceiro" className="hover:text-slate-900">Seja Parceiro</Link>
          </div>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to={user ? "/dashboard" : "/auth"}>
              {user ? "Dashboard" : "Entrar"} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Mobile action bar */}
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
            />
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white relative">
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

      {/* Hero compacto */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white">
        <div className="px-4 lg:px-6 py-10">
          <Badge className="mb-3 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/30">
            Marketplace Obra Link
          </Badge>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight max-w-3xl">
            Compre materiais direto do seu orçamento com{" "}
            <span className="text-emerald-400">preços de atacado</span>.
          </h1>
        </div>
      </section>

      {/* Layout 3 colunas full width */}
      <div className="px-4 lg:px-6 py-6 grid gap-6 lg:grid-cols-[260px_1fr_320px] xl:grid-cols-[280px_1fr_340px]">
        {/* Sidebar Esquerda - Filtros */}
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
                />
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Centro - Catálogo */}
        <main className="min-w-0">
          <div className="mb-5 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Buscar materiais, marcas, códigos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 h-11 bg-white border-slate-200"
              />
            </div>
            <span className="hidden sm:inline-block text-xs text-slate-500 whitespace-nowrap">
              {filtrados.length} produtos
            </span>
          </div>

          {filtrados.length === 0 ? (
            <div className="text-center py-20 text-slate-500 bg-white rounded-lg border border-slate-200">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filtrados.map((p) => (
                <Card
                  key={p.id}
                  className="overflow-hidden border-slate-200 hover:shadow-lg transition-shadow bg-white"
                >
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={p.imagem}
                      alt={p.nome}
                      loading="lazy"
                      className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                    />
                  </div>
                  <CardContent className="p-4 flex flex-col gap-2">
                    <Badge variant="outline" className="w-fit text-xs border-slate-200 text-slate-600">
                      {p.categoria}
                    </Badge>
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                      {p.nome}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Marca: <span className="font-medium text-slate-700">{p.marca}</span>
                    </p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-lg font-bold text-slate-900 tabular-nums">
                        {formatCurrency(p.preco)}
                      </span>
                      <span className="text-xs text-slate-500">/ {p.unidade}</span>
                    </div>
                    <Button
                      size="sm"
                      className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => adicionarAoProjeto(p)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Adicionar ao Projeto
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Cards parceiros embaixo no desktop largo */}
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <Card className="border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md">
              <CardContent className="p-5 flex items-center gap-4">
                <Sparkles className="h-8 w-8 text-emerald-100 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-base leading-snug mb-0.5">Tem uma loja de construção?</h3>
                  <p className="text-xs text-emerald-50">Venda seus produtos no Obra Link.</p>
                </div>
                <Button asChild size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50 whitespace-nowrap">
                  <Link to="/seja-parceiro">Ser parceiro</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-semibold text-sm text-slate-900">Lojas em Destaque</h3>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["Construfácil", "Mega Materiais", "Casa & Obra", "Depósito União"].map((n) => (
                    <Badge key={n} variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">
                      {n}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Sidebar Direita - Projeto */}
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
