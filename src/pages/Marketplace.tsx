import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Box, Search, ShoppingCart, ArrowRight, Filter } from "lucide-react";
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

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Marketplace() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("Todos");

  const filtrados = useMemo(
    () =>
      produtos.filter(
        (p) =>
          (categoria === "Todos" || p.categoria === categoria) &&
          (busca === "" ||
            p.nome.toLowerCase().includes(busca.toLowerCase()) ||
            p.marca.toLowerCase().includes(busca.toLowerCase())),
      ),
    [busca, categoria],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>AI Construct</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to={user ? "/dashboard" : "/auth"} className="hover:text-slate-900">Gestão de Projetos</Link>
            <Link to="/marketplace" className="text-slate-900 font-semibold">Marketplace</Link>
            <Link to="/profissionais" className="hover:text-slate-900">Prestar Serviços</Link>
          </div>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to={user ? "/dashboard" : "/auth"}>
              {user ? "Dashboard" : "Entrar"} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white">
        <div className="container py-16 lg:py-20">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/30">
              Marketplace Obra Link
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Compre materiais direto do seu orçamento com{" "}
              <span className="text-emerald-400">preços de atacado</span>.
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mb-8">
              Conectamos sua obra a fornecedores parceiros. Adicione itens ao projeto em um clique
              e receba na obra com preços negociados.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Buscar materiais, marcas, códigos..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 h-12 bg-white text-slate-900 border-0"
                />
              </div>
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8">
                Pesquisar
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filtros + Grid */}
      <section className="container py-10">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700 mr-2">Categorias:</span>
          {categorias.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={categoria === c ? "default" : "outline"}
              onClick={() => setCategoria(c)}
              className={
                categoria === c
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }
            >
              {c}
            </Button>
          ))}
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            Nenhum produto encontrado.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtrados.map((p) => (
              <Card key={p.id} className="overflow-hidden border-slate-200 hover:shadow-lg transition-shadow bg-white">
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
                  <p className="text-xs text-slate-500">Marca: <span className="font-medium text-slate-700">{p.marca}</span></p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(p.preco)}</span>
                    <span className="text-xs text-slate-500">/ {p.unidade}</span>
                  </div>
                  <Button
                    size="sm"
                    className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => toast.success(`${p.nome} adicionado ao projeto`)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Adicionar ao Projeto
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
