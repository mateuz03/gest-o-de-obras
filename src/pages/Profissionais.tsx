import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Box,
  Search,
  Star,
  ArrowRight,
  HardHat,
  MapPin,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const especialidades = [
  "Todas",
  "Pedreiro",
  "Eletricista",
  "Encanador",
  "Empreiteiro",
  "Pintor",
  "Carpinteiro",
] as const;
type Especialidade = (typeof especialidades)[number];

const regioes = ["Todas", "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Salvador"] as const;
type Regiao = (typeof regioes)[number];

interface Profissional {
  id: string;
  nome: string;
  especialidade: Exclude<Especialidade, "Todas">;
  regiao: Exclude<Regiao, "Todas">;
  avaliacao: number;
  obras: number;
  foto: string;
  resumo: string;
}

const profissionais: Profissional[] = [
  { id: "1", nome: "Carlos Silva", especialidade: "Pedreiro", regiao: "São Paulo", avaliacao: 4.9, obras: 142, foto: "https://i.pravatar.cc/200?img=12", resumo: "Especialista em alvenaria estrutural e revestimentos." },
  { id: "2", nome: "Marcos Pereira", especialidade: "Eletricista", regiao: "São Paulo", avaliacao: 4.8, obras: 98, foto: "https://i.pravatar.cc/200?img=15", resumo: "NR-10, instalações residenciais e prediais." },
  { id: "3", nome: "João Almeida", especialidade: "Encanador", regiao: "Rio de Janeiro", avaliacao: 4.7, obras: 76, foto: "https://i.pravatar.cc/200?img=33", resumo: "Hidráulica completa, água quente, gás GLP." },
  { id: "4", nome: "Ricardo Souza", especialidade: "Empreiteiro", regiao: "Belo Horizonte", avaliacao: 5.0, obras: 215, foto: "https://i.pravatar.cc/200?img=51", resumo: "Empreitada global de obras residenciais e comerciais." },
  { id: "5", nome: "Paulo Mendes", especialidade: "Pintor", regiao: "Curitiba", avaliacao: 4.6, obras: 64, foto: "https://i.pravatar.cc/200?img=53", resumo: "Pintura fina, textura, grafiato e efeitos." },
  { id: "6", nome: "Antônio Lima", especialidade: "Carpinteiro", regiao: "Salvador", avaliacao: 4.8, obras: 88, foto: "https://i.pravatar.cc/200?img=68", resumo: "Formas, telhados, esquadrias e marcenaria." },
  { id: "7", nome: "José Oliveira", especialidade: "Pedreiro", regiao: "Rio de Janeiro", avaliacao: 4.5, obras: 53, foto: "https://i.pravatar.cc/200?img=60", resumo: "Reforma e acabamento de alto padrão." },
  { id: "8", nome: "Fernando Costa", especialidade: "Eletricista", regiao: "Curitiba", avaliacao: 4.9, obras: 121, foto: "https://i.pravatar.cc/200?img=11", resumo: "Automação residencial e quadros de comando." },
];

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-700 tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

export default function Profissionais() {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [esp, setEsp] = useState<Especialidade>("Todas");
  const [reg, setReg] = useState<Regiao>("Todas");

  const filtrados = useMemo(
    () =>
      profissionais.filter(
        (p) =>
          (esp === "Todas" || p.especialidade === esp) &&
          (reg === "Todas" || p.regiao === reg) &&
          (busca === "" || p.nome.toLowerCase().includes(busca.toLowerCase())),
      ),
    [busca, esp, reg],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>Obra Link</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to={user ? "/dashboard" : "/auth"} className="hover:text-slate-900">Gestão de Projetos</Link>
            <Link to="/marketplace" className="hover:text-slate-900">Marketplace</Link>
            <Link to="/profissionais" className="text-slate-900 font-semibold">Prestar Serviços</Link>
          </div>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to={user ? "/dashboard" : "/auth"}>
              {user ? "Dashboard" : "Entrar"} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero captação */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 text-white">
        <div className="container py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge className="mb-4 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/30">
                Hub de Profissionais
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                Aumente sua renda. Conecte-se com{" "}
                <span className="text-emerald-400">dezenas de obras</span> na sua região.
              </h1>
              <p className="text-lg text-slate-300 max-w-xl mb-8">
                Cadastre sua mão de obra no Obra Link e receba propostas diretamente de
                engenheiros e gestores de obras que já estão usando nosso ecossistema.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 text-base"
                  onClick={() => toast.success("Em breve: cadastro de profissionais")}
                >
                  <HardHat className="h-5 w-5" />
                  Cadastrar minha Mão de Obra
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base bg-transparent border-slate-400 text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <a href="#diretorio">Ver oportunidades</a>
                </Button>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { icon: Briefcase, label: "Obras ativas", value: "+1.200" },
                { icon: TrendingUp, label: "Renda média/mês", value: "R$ 6.4k" },
                { icon: HardHat, label: "Profissionais", value: "+3.800" },
                { icon: Star, label: "Avaliação média", value: "4.8 / 5" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
                  <s.icon className="h-6 w-6 text-emerald-400 mb-2" />
                  <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                  <div className="text-sm text-slate-300">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Diretório */}
      <section id="diretorio" className="container py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Profissionais disponíveis</h2>
          <p className="text-slate-500 text-sm">
            Filtre por especialidade e região para encontrar a equipe ideal para sua obra.
          </p>
        </div>

        {/* Filtros */}
        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <select
            value={esp}
            onChange={(e) => setEsp(e.target.value as Especialidade)}
            className="h-10 rounded-md border border-input bg-white px-3 text-sm"
          >
            {especialidades.map((e) => (
              <option key={e} value={e}>{e === "Todas" ? "Todas especialidades" : e}</option>
            ))}
          </select>
          <select
            value={reg}
            onChange={(e) => setReg(e.target.value as Regiao)}
            className="h-10 rounded-md border border-input bg-white px-3 text-sm"
          >
            {regioes.map((r) => (
              <option key={r} value={r}>{r === "Todas" ? "Todas regiões" : r}</option>
            ))}
          </select>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-20 text-slate-500">Nenhum profissional encontrado.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtrados.map((p) => (
              <Card key={p.id} className="border-slate-200 bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 mb-3 ring-2 ring-emerald-100">
                    <AvatarImage src={p.foto} alt={p.nome} />
                    <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold">
                      {p.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-slate-900">{p.nome}</h3>
                  <Badge className="mt-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                    {p.especialidade}
                  </Badge>
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> {p.regiao}
                  </div>
                  <p className="mt-3 text-xs text-slate-600 line-clamp-2 min-h-[2rem]">{p.resumo}</p>
                  <div className="mt-3 w-full flex items-center justify-between text-xs text-slate-500">
                    <Stars value={p.avaliacao} />
                    <span className="tabular-nums">{p.obras} obras</span>
                  </div>
                  <Button
                    size="sm"
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => toast.success(`Solicitação enviada a ${p.nome}`)}
                  >
                    Solicitar Orçamento
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
