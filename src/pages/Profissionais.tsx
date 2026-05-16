import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import {
  Box,
  Search,
  Star,
  ArrowRight,
  HardHat,
  MapPin,
  Briefcase,
  TrendingUp,
  Loader2,
  Phone,
  ShieldCheck,
  X,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const especialidades = [
  "Todas",
  "Pedreiro",
  "Eletricista",
  "Encanador",
  "Empreiteiro",
  "Pintor",
  "Carpinteiro",
  "Mestre de Obras",
  "Engenheiro",
  "Arquiteto",
  "Outros",
] as const;

type Especialidade = (typeof especialidades)[number];

interface Profissional {
  id: string;
  especialidade: string;
  regiao: string | null;
  resumo: string | null;
  valor_diaria: number | string | null;
  telefone: string | null;
  created_at?: string;
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-700 tabular-nums">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const getAvatarFallback = (especialidade?: string | null) => {
  if (!especialidade) return "PR";
  return especialidade.substring(0, 2).toUpperCase();
};

const getDisplayName = (especialidade?: string | null) => {
  if (!especialidade) return "Profissional Parceiro";
  return `${especialidade} Parceiro`;
};

export default function Profissionais() {
  const { user } = useAuth();

  const [busca, setBusca] = useState("");
  const [esp, setEsp] = useState<Especialidade | "Todas">("Todas");
  const [reg, setReg] = useState<string>("Todas");

  const [listaProfissionais, setListaProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfissionais() {
      try {
        const { data, error } = await supabase
          .from("profissionais")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          setListaProfissionais(data as Profissional[]);
        }
      } catch (error) {
        console.error("Erro ao buscar profissionais:", error);
        toast.error("Não foi possível carregar o diretório de profissionais.");
      } finally {
        setLoading(false);
      }
    }

    fetchProfissionais();
  }, []);

  const regioesDinamicas = useMemo(() => {
    const regioesSet = new Set(
      listaProfissionais.map((p) => p.regiao).filter(Boolean)
    );
    return ["Todas", ...Array.from(regioesSet)] as string[];
  }, [listaProfissionais]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return listaProfissionais.filter((p) => {
      const especialidade = p.especialidade?.toLowerCase() || "";
      const resumo = p.resumo?.toLowerCase() || "";
      const regiao = p.regiao?.toLowerCase() || "";

      return (
        (esp === "Todas" || p.especialidade === esp) &&
        (reg === "Todas" || p.regiao === reg) &&
        (termo === "" ||
          especialidade.includes(termo) ||
          resumo.includes(termo) ||
          regiao.includes(termo))
      );
    });
  }, [busca, esp, reg, listaProfissionais]);

  const filtrosAtivos = useMemo(() => {
    const ativos: { label: string; onRemove: () => void }[] = [];

    if (busca.trim()) {
      ativos.push({
        label: `Busca: "${busca}"`,
        onRemove: () => setBusca(""),
      });
    }

    if (esp !== "Todas") {
      ativos.push({
        label: esp,
        onRemove: () => setEsp("Todas"),
      });
    }

    if (reg !== "Todas") {
      ativos.push({
        label: reg,
        onRemove: () => setReg("Todas"),
      });
    }

    return ativos;
  }, [busca, esp, reg]);

  const limparFiltros = () => {
    setBusca("");
    setEsp("Todas");
    setReg("Todas");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      <Navbar />

      {/* Hero */}
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

              <p className="text-lg text-slate-300 max-w-xl mb-4">
                Cadastre sua mão de obra no Obra Link e receba propostas diretamente
                de engenheiros e gestores de obras que já estão usando nosso ecossistema.
              </p>

              <p className="text-sm text-emerald-100/90 max-w-xl mb-8">
                Cadastre seu perfil, destaque sua especialidade e fique visível para
                clientes da sua região.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 text-base"
                >
                  <Link
                    to={
                      user
                        ? "/cadastrar-profissional"
                        : "/auth?redirect=/cadastrar-profissional"
                    }
                  >
                    <HardHat className="h-5 w-5 mr-2" />
                    Cadastrar minha Mão de Obra
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base bg-transparent border-slate-400 text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <a href="#diretorio">Encontrar profissionais</a>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Badge className="bg-white/10 text-slate-100 hover:bg-white/10 border border-white/10">
                  Sem complicação para começar
                </Badge>
                <Badge className="bg-white/10 text-slate-100 hover:bg-white/10 border border-white/10">
                  Leads da sua região
                </Badge>
                <Badge className="bg-white/10 text-slate-100 hover:bg-white/10 border border-white/10">
                  Perfil profissional público
                </Badge>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { icon: Briefcase, label: "Obras ativas", value: "+1.200" },
                { icon: TrendingUp, label: "Renda média/mês", value: "R$ 6,4 mil" },
                { icon: Users, label: "Profissionais", value: "+3.800" },
                { icon: Star, label: "Avaliação média", value: "4,8 / 5" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5"
                >
                  <s.icon className="h-6 w-6 text-emerald-400 mb-2" />
                  <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                  <div className="text-sm text-slate-300">{s.label}</div>
                </div>
              ))}

              <div className="col-span-2 text-xs text-slate-300/80 px-1">
                Indicadores ilustrativos da atividade média na plataforma.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diretório */}
      <section id="diretorio" className="container py-12 min-h-[400px]">
        <div className="mb-8">
          <Badge
            variant="outline"
            className="mb-3 bg-white border-slate-200 text-slate-600"
          >
            Diretório de profissionais
          </Badge>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            Encontre profissionais para sua obra
          </h2>

          <p className="text-slate-500 text-sm">
            Filtre por especialidade e região para encontrar a equipe ideal para seu projeto.
          </p>
        </div>

        {/* Filtros */}
        <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar pedreiro, eletricista, encanador ou região..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>

          <select
            value={esp}
            onChange={(e) => setEsp(e.target.value as Especialidade)}
            className="h-10 rounded-md border border-input bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {especialidades.map((e) => (
              <option key={e} value={e}>
                {e === "Todas" ? "Todas especialidades" : e}
              </option>
            ))}
          </select>

          <select
            value={reg}
            onChange={(e) => setReg(e.target.value)}
            className="h-10 rounded-md border border-input bg-white px-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {regioesDinamicas.map((r) => (
              <option key={r} value={r}>
                {r === "Todas" ? "Todas regiões" : r}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            className="border-slate-300 text-slate-600"
            onClick={limparFiltros}
          >
            Limpar
          </Button>
        </div>

        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-slate-500">
              {loading ? "Carregando profissionais..." : `${filtrados.length} profissional(is) encontrado(s)`}
            </p>
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
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
            <p>Buscando profissionais na sua região...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white border border-slate-200 rounded-2xl">
            <HardHat className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900">
              Nenhum profissional encontrado
            </p>
            <p className="text-sm mb-4">
              Tente ajustar sua busca ou remover alguns filtros.
            </p>
            <Button variant="outline" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtrados.map((p) => {
              const diaria =
                typeof p.valor_diaria === "number"
                  ? formatCurrency(p.valor_diaria)
                  : p.valor_diaria
                  ? `R$ ${p.valor_diaria}`
                  : "A combinar";

              return (
                <Card
                  key={p.id}
                  className="border-slate-200 bg-white hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />

                  <CardContent className="p-5 flex flex-col items-center text-center h-full">
                    <Avatar className="h-20 w-20 mb-3 ring-2 ring-emerald-100">
                      <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold text-xl">
                        {getAvatarFallback(p.especialidade)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 text-base text-center line-clamp-1">
                        {getDisplayName(p.especialidade)}
                      </h3>
                    </div>

                    <Badge className="mt-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                      {p.especialidade || "Especialidade não informada"}
                    </Badge>

                    <div className="mt-3 flex items-center gap-1 text-xs text-slate-600 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="line-clamp-1">{p.regiao || "Região não informada"}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 bg-emerald-50"
                      >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Perfil parceiro
                      </Badge>
                    </div>

                    <p className="mt-3 text-sm text-slate-500 line-clamp-3 min-h-[4rem] break-words w-full">
                      {p.resumo?.trim()
                        ? p.resumo
                        : "Profissional disponível para atender obras e serviços na sua região."}
                    </p>

                    <div className="mt-4 w-full flex items-center justify-between text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-slate-400">Avaliação</span>
                        <Stars value={5.0} />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-slate-400">Diária estimada</span>
                        <span className="font-bold text-emerald-700 tabular-nums">
                          {diaria}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 w-full grid gap-2">
                      <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={() => {
                          if (!p.telefone) {
                            toast.error("Telefone do profissional não disponível.");
                            return;
                          }

                          toast.success("Contato liberado!", {
                            description: `WhatsApp do profissional: ${p.telefone}`,
                            duration: 8000,
                          });
                        }}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Solicitar orçamento
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}