// FIX #1 — useNavigate, ArrowLeft e Box removidos: eram imports mortos (nunca usados)
import { Link } from "react-router-dom";
import {
  Target,
  Users,
  TrendingUp,
  Shield,
  Building,
  Lightbulb,
  MapPin,
  CheckCircle2,
  Zap,
  ArrowRight,
  Star,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { landingPath } from "@/config/landingSolutions";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

// ── Constantes fora do componente (sem recriação a cada render) ───────────
const STATS = [
  { valor: "48.920", label: "Insumos SINAPI indexados", destaque: false },
  { valor: "91,8%", label: "Taxa de match automático", destaque: true },
  { valor: "SP", label: "Estado de atuação atual", destaque: false },
  { valor: "100%", label: "Sincronização via IA", destaque: false },
];

const PILARES = [
  {
    icon: Shield,
    titulo: "Rigor e Precisão",
    descricao: "Confiabilidade sistêmica e dados sempre atualizados com a tabela SINAPI vigente.",
  },
  {
    icon: TrendingUp,
    titulo: "Eficiência Escalável",
    descricao: "Fazer mais com menos tempo, menos desperdício e sem perda de qualidade.",
  },
  {
    icon: Zap,
    titulo: "Automação Inteligente",
    descricao: "IA que lê plantas, identifica materiais e cruza preços automaticamente.",
  },
  {
    icon: Users,
    titulo: "Ecossistema Conectado",
    descricao: "Engenheiros, construtoras e fornecedores no mesmo ambiente digital.",
  },
];

const DIFERENCIAIS = [
  "Leitura automatizada de plantas baixas por IA",
  "Orçamentos baseados em SINAPI atualizado",
  "Marketplace B2B com fornecedores regionais validados",
  "Conciliação automática de preços de materiais",
  "Diário de obra, Gantt e Memorial Descritivo integrados",
  "Painel administrativo com controle de lojistas e usuários",
];

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='400' viewBox='0 0 1000 400'%3E%3Crect width='1000' height='400' fill='%23f1f5f9'/%3E%3C/svg%3E";

export default function QuemSomos() {
  const { user } = useAuth();
  const marketplacePath = user ? "/marketplace" : landingPath("marketplace");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 lg:pt-28 lg:pb-24 overflow-hidden bg-slate-50">
        {/* Gradiente decorativo de fundo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-100 opacity-40 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-slate-200 opacity-30 blur-2xl" />
        </div>

        <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-6">
            <Building className="w-4 h-4" /> Sobre o Obra Link
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            A tecnologia construindo a{" "}
            <span className="text-emerald-600">previsibilidade</span> do amanhã
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Nascemos para resolver uma das maiores dores do mercado: o abismo entre quem planeja
            a obra, quem executa e quem fornece os materiais. Trazemos dados, conexão e
            eficiência para o canteiro.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 shadow-sm"
            >
              <Link to="/auth">
                Começar agora <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full px-6 border-slate-300 text-slate-700"
            >
              <Link to={marketplacePath}>Ver Marketplace</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── NÚMEROS / IMPACTO ────────────────────────────────────────────── */}
      <section className="py-14 bg-white border-y border-slate-100">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <p
                  className={`text-4xl font-black mb-1 ${
                    s.destaque ? "text-emerald-600" : "text-slate-900"
                  }`}
                >
                  {s.valor}
                </p>
                <p className="text-sm text-slate-500 font-medium leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NOSSA HISTÓRIA ───────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">
                Nossa origem
              </p>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Por que existimos?</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed text-base">
                <p>
                  Observando o mercado em Sorocaba, Votorantim e região, percebemos que a
                  construção civil ainda perde muito tempo e dinheiro com processos manuais.
                  Orçamentos desatualizados, planilhas quebradas e dificuldade em encontrar os
                  fornecedores certos rapidamente.
                </p>
                <p>
                  O Obra Link foi desenvolvido com foco absoluto em{" "}
                  <strong className="text-slate-800">qualidade de software</strong> e arquitetura
                  moderna. Automatizamos a complexidade de cruzar listas de materiais com os
                  padrões rigorosos do SINAPI, entregando uma plataforma rápida, segura e
                  escalável.
                </p>
                <p>
                  Não somos apenas uma ferramenta de gestão. Somos o elo digital que conecta
                  engenheiros confiantes a fornecedores preparados.
                </p>
              </div>

              {/* Diferenciais */}
              <ul className="mt-8 space-y-2">
                {DIFERENCIAIS.map((d) => (
                  <li key={d} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-emerald-600 rounded-3xl transform translate-x-4 translate-y-4 opacity-10" />
              {/* FIX #2 — onError adicionado: antes a imagem quebrada ficava em branco */}
              <img
                src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1000&auto=format&fit=crop"
                alt="Engenharia e Arquitetura"
                className="rounded-3xl shadow-xl relative z-10 w-full object-cover h-[420px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                }}
              />
              {/* Badge flutuante */}
              <div className="absolute bottom-6 left-6 z-20 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Redução média de custo</p>
                  <p className="text-lg font-black text-slate-900">até 40%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MISSÃO, VISÃO E FOCO ─────────────────────────────────────────── */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3">
            Propósito
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-16">O que nos move</h2>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              {
                icon: Target,
                titulo: "Nossa Missão",
                texto:
                  "Digitalizar e simplificar processos manuais, oferecendo orçamentos baseados em dados reais (SINAPI) e um marketplace direto com fornecedores validados da região.",
              },
              {
                icon: Lightbulb,
                titulo: "Nossa Visão",
                texto:
                  "Ser o maior e mais confiável ecossistema digital da construção civil no interior paulista, padronizando a forma como obras são orçadas e executadas.",
              },
              {
                icon: Users,
                titulo: "Nosso Foco",
                texto:
                  "Engenheiros, construtoras e lojistas que buscam eficiência, redução de desperdícios, margens de lucro saudáveis e transparência total na gestão de compras.",
              },
            ].map(({ icon: Icon, titulo, texto }) => (
              <div
                key={titulo}
                className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-emerald-500 transition-colors group"
              >
                <Icon className="w-10 h-10 text-emerald-400 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-bold mb-3">{titulo}</h3>
                <p className="text-slate-300 leading-relaxed">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PILARES (expandido de 2 para 4) ─────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-3">
            Valores
          </p>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Nossos Pilares</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {PILARES.map(({ icon: Icon, titulo, descricao }) => (
              <div
                key={titulo}
                className="flex items-start gap-4 p-6 bg-slate-50 rounded-xl border border-slate-100 text-left hover:border-emerald-200 hover:shadow-sm transition-all"
              >
                <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600 shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{titulo}</h4>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── REGIÃO DE ATUAÇÃO ────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-sm font-semibold mb-6">
            <MapPin className="w-4 h-4" /> Onde atuamos
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Nascemos no interior paulista
          </h2>
          <p className="text-slate-600 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Com foco inicial em Sorocaba, Votorantim e região, desenvolvemos o Obra Link para
            resolver problemas reais de construtoras, engenheiros e lojistas da nossa própria
            comunidade. A expansão para outros estados é a próxima etapa.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Sorocaba", "Votorantim", "Salto de Pirapora", "Itu", "Tatuí", "São Paulo (SP)"].map(
              (cidade) => (
                <span
                  key={cidade}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700 shadow-sm"
                >
                  {cidade}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ─── AVALIAÇÃO / SOCIAL PROOF ─────────────────────────────────────── */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                texto:
                  '"Reduzi em 3 horas o tempo de elaboração de um orçamento que antes levava o dia inteiro."',
                autor: "Ricardo A.",
                cargo: "Engenheiro Civil, Sorocaba",
              },
              {
                texto:
                  '"A integração com o SINAPI é o diferencial. Finalmente um orçamento com base de dados real."',
                autor: "Priscila M.",
                cargo: "Gestora de Obras, Votorantim",
              },
              {
                texto:
                  '"O marketplace nos trouxe novos clientes da região sem precisar de uma equipe comercial."',
                autor: "Carlos S.",
                cargo: "Lojista de Materiais, Itu",
              },
            ].map(({ texto, autor, cargo }) => (
              <div
                key={autor}
                className="bg-slate-50 rounded-2xl border border-slate-100 p-6 flex flex-col gap-4"
              >
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed italic">{texto}</p>
                <div className="mt-auto">
                  <p className="font-bold text-slate-900 text-sm">{autor}</p>
                  <p className="text-xs text-slate-500">{cargo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-emerald-600 text-white">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Pronto para transformar sua obra?
          </h2>
          <p className="text-emerald-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Crie sua conta gratuitamente e gere o primeiro orçamento com IA em menos de 5
            minutos.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              asChild
              className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-full px-8 py-3 text-base font-bold shadow-lg"
            >
              <Link to="/auth">
                Criar conta grátis <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 rounded-full px-8 py-3 text-base font-medium"
            >
              <Link to="/suporte">Falar com a equipe</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER MINI ──────────────────────────────────────────────────── */}
      <footer className="py-8 bg-slate-900 text-center">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Obra Link — Todos os direitos reservados.{" "}
          <Link to="/suporte" className="text-slate-400 hover:text-white transition-colors">
            Suporte
          </Link>{" "}
          ·{" "}
          <Link to="/blog" className="text-slate-400 hover:text-white transition-colors">
            Blog
          </Link>
        </p>
      </footer>
    </div>
  );
}
