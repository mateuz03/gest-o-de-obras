import { Link, useNavigate } from "react-router-dom";
import { 
  Box, 
  ArrowLeft, 
  Target, 
  Users, 
  TrendingUp, 
  Shield, 
  Building, 
  Lightbulb 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function QuemSomos() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      
      {/* ─── HEADER ─── */}
      <Navbar /> {/* <-- A MÁGICA ACONTECE AQUI */}

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-20 pb-16 lg:pt-28 lg:pb-24 overflow-hidden bg-slate-50">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-6">
            <Building className="w-4 h-4" /> Sobre o Obra Link
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            Mais <span className="text-emerald-600">previsibilidade</span> para quem constrói
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Nascemos para acabar com o desencontro entre quem planeja a obra, quem executa e quem fornece os materiais. Reunimos dados confiáveis, conexões certas e eficiência em um só lugar, do orçamento ao canteiro.
          </p>
        </div>
      </section>

      {/* ─── NOSSA HISTÓRIA / O PROBLEMA ─── */}
      <section className="py-20 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Por que existimos?</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                <p>
                  Observando o mercado em Sorocaba, Votorantim e região, percebemos que a construção civil ainda perde muito tempo e dinheiro com processos manuais. Orçamentos desatualizados, planilhas quebradas e dificuldade em encontrar os fornecedores certos rapidamente.
                </p>
                <p>
                  O Obra Link foi desenvolvido com um rigor absoluto focado em <strong>Qualidade de Software</strong> e arquitetura moderna. Nós automatizamos a complexidade de cruzar listas de materiais com os padrões rigorosos do SINAPI, entregando uma plataforma rápida, segura e escalável.
                </p>
                <p>
                  Não somos apenas uma ferramenta de gestão. Somos o elo digital que conecta engenheiros confiantes a fornecedores preparados.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-600 rounded-3xl transform translate-x-4 translate-y-4 opacity-10"></div>
              <img 
                src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1000&auto=format&fit=crop" 
                alt="Engenharia e Arquitetura" 
                className="rounded-3xl shadow-xl relative z-10 w-full object-cover h-[400px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── MISSÃO, VISÃO E FOCO ─── */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">O que nos move</h2>
          
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-emerald-500 transition-colors group">
              <Target className="w-10 h-10 text-emerald-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Nossa Missão</h3>
              <p className="text-slate-300 leading-relaxed">
                Digitalizar e simplificar processos manuais, oferecendo orçamentos baseados em dados reais (SINAPI) e um marketplace direto com fornecedores validados da região.
              </p>
            </div>
            
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-emerald-500 transition-colors group">
              <Lightbulb className="w-10 h-10 text-emerald-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Nossa Visão</h3>
              <p className="text-slate-300 leading-relaxed">
                Ser o maior e mais confiável ecossistema digital da construção civil no interior paulista, padronizando a forma como obras são orçadas e executadas.
              </p>
            </div>

            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 hover:border-emerald-500 transition-colors group">
              <Users className="w-10 h-10 text-emerald-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Nosso Foco</h3>
              <p className="text-slate-300 leading-relaxed">
                Engenheiros, construtoras e lojistas que buscam eficiência, redução de desperdícios, margens de lucro saudáveis e transparência total na gestão de compras.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VALORES CORE ─── */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Nossos Pilares</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-xl border border-slate-100 text-left">
              <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><Shield className="w-6 h-6" /></div>
              <div>
                <h4 className="font-bold text-slate-900">Rigor e Precisão</h4>
                <p className="text-sm text-slate-600 mt-1">Confiabilidade sistêmica e dados sempre atualizados.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-xl border border-slate-100 text-left">
              <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><TrendingUp className="w-6 h-6" /></div>
              <div>
                <h4 className="font-bold text-slate-900">Eficiência Escalável</h4>
                <p className="text-sm text-slate-600 mt-1">Fazer mais com menos tempo e menos desperdício.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}