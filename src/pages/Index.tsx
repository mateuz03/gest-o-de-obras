import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { landingFaq } from "@/data/faq";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  Brain,
  FileSpreadsheet,
  ArrowRight,
  Box,
  Ruler,
  Zap,
  CheckCircle2,
  XCircle,
  Shield,
  Lock,
  Eye,
  FileText,
  Users,
  Calculator,
  Clock,
  BarChart3,
  ScanLine,
  Layers,
  FileCheck,
  History,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Database,
  ClipboardCheck,
  DollarSign,
  Timer,
  X,
  Check,
  ShieldCheck,
  Server,
  Scale,
  Github,
  Linkedin,
  Instagram,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function Index() {
  const { user } = useAuth();
  const [orcamentosMes, setOrcamentosMes] = useState(8);
  const [horasLevantamento, setHorasLevantamento] = useState(13);

  const horasRecuperadas = Math.round(orcamentosMes * horasLevantamento * 0.9);
  const economiaMensal = horasRecuperadas * 150;
  const valorAnual = economiaMensal * 12;

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  const analysisSteps = [
    { icon: ScanLine, title: "Identificação Automática", desc: "Visão computacional detecta paredes, aberturas, áreas e perímetros da planta." },
    { icon: Database, title: "Conciliação com SINAPI", desc: "Cada insumo é vinculado automaticamente à tabela SINAPI atualizada da sua região." },
    { icon: Calculator, title: "Cálculo de BDI", desc: "BDI configurável aplicado sobre custos diretos para refletir a realidade do seu negócio." },
    { icon: ClipboardCheck, title: "Memória de Cálculo", desc: "Rastreabilidade total: cada linha do orçamento tem a fórmula e a fonte visíveis." },
  ];

  const features = [
    { icon: Eye, title: "Visão Computacional IA", desc: "Gemini 2.5 Pro analisa plantas em PDF, JPG, PNG e DWG identificando elementos construtivos." },
    { icon: Database, title: "Integração SINAPI", desc: "Base de preços oficial vinculada automaticamente com atualização mensal por região." },
    { icon: FileText, title: "Memorial ABNT + Gantt", desc: "Geração automática de memorial descritivo e cronograma de obra em conformidade técnica." },
    { icon: Users, title: "Portal do Cliente", desc: "Link compartilhável para o cliente acompanhar o orçamento em tempo real, sem login." },
    { icon: ScanLine, title: "Extração NF (OCR)", desc: "Upload de notas fiscais com extração automática de itens, valores e fornecedores via IA." },
    { icon: Calculator, title: "BDI Configurável", desc: "Ajuste percentuais de BDI por tipo de obra, incluindo impostos, administração e lucro." },
    { icon: Brain, title: "Revisão Assistida", desc: "IA sugere correções e alerta sobre inconsistências nos quantitativos gerados." },
    { icon: History, title: "Histórico de Versões", desc: "Todas as análises ficam salvas com versionamento para auditoria e comparação." },
  ];

  const howItWorks = [
    { step: "01", icon: Upload, title: "Upload da Planta", desc: "Envie PDF, imagem ou DWG da sua planta baixa." },
    { step: "02", icon: Ruler, title: "Calibração de Escala", desc: "Informe a área total ou calibre a escala manualmente." },
    { step: "03", icon: Sparkles, title: "Conciliação Inteligente", desc: "IA cruza quantitativos com a base SINAPI regional." },
    { step: "04", icon: FileSpreadsheet, title: "Exportação Completa", desc: "Baixe PDF, Excel ou compartilhe o link do orçamento." },
  ];

  const faqItems = landingFaq;


  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* ─── HEADER ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>Obra Link</span>
          </Link>

          {/* MENUS DROPDOWN (Centro) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            
            {/* 1. Soluções */}
            <div className="relative group">
              <button className="flex items-center gap-1 hover:text-emerald-600 transition-colors py-4">
                Soluções <ChevronDown className="w-4 h-4" />
              </button>
              {/* Menu Invisível que aparece no Hover */}
              <div className="absolute top-full left-0 hidden group-hover:block w-56 bg-white shadow-xl border border-slate-100 rounded-md py-2 z-50">
                <Link to={user ? "/dashboard" : "/recurso/gestao-de-projetos"} className="block px-4 py-2 hover:bg-slate-50 hover:text-emerald-600">Gestão de Projetos</Link>
                <Link to="/marketplace" className="block px-4 py-2 hover:bg-slate-50 hover:text-emerald-600">Marketplace</Link>
                <Link to="/profissionais" className="block px-4 py-2 hover:bg-slate-50 hover:text-emerald-600">Prestar Serviços</Link>
                <Link to="/seja-parceiro" className="block px-4 py-2 hover:bg-slate-50 hover:text-emerald-600">Seja Parceiro</Link>
              </div>
            </div>

            {/* 2. Conteúdo */}
            <div className="relative group">
              <button className="flex items-center gap-1 hover:text-emerald-600 transition-colors py-4">
                Conteúdo <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 hidden group-hover:block w-48 bg-white shadow-xl border border-slate-100 rounded-md py-2 z-50">
                <Link to="/blog" className="block px-4 py-2 hover:bg-slate-50 hover:text-emerald-600">Blog</Link>
                <Link to="/documentos" className="block px-4 py-2 hover:bg-slate-50 hover:text-emerald-600">Documentos e Dicas</Link>
              </div>
            </div>

            {/* 3. Obra Link */}
            <div className="relative group">
              <button className="flex items-center gap-1 hover:text-emerald-600 transition-colors py-4">
                Obra Link <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 hidden group-hover:block w-48 bg-white shadow-xl border border-slate-100 rounded-md py-2 z-50">
                <Link to="/sobre-nos" className="block px-4 py-2 hover:bg-slate-50 hover:text-emerald-600">Quem Somos</Link>
                <Link to="/suporte" className="block px-4 py-2 hover:bg-slate-50 hover:text-emerald-600">Precisa de Suporte?</Link>
              </div>
            </div>

          </div>

          {/* BOTÕES DIREITA (Login) */}
          <div className="flex items-center gap-4">
            {user ? (
              // Se o usuário já estiver logado, não precisa do botão de Dashboard gigante
              <Link to="/dashboard" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                Ir para o Painel
              </Link>
            ) : (
              // Se não estiver logado, mostramos os botões padrão de B2B
              <>
                <Link to="/auth" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">
                  Entrar
                </Link>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                  <Link to="/solicitar-acesso">Solicitar Acesso Imediato</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30" />
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fadeInUp}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
                <Zap className="h-4 w-4" /> Orçamentos com Inteligência Artificial
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-tight tracking-tight text-slate-900 mb-6">
                Seu orçamento de obra pronto em{" "}
                <span className="text-emerald-600">minutos</span>, não em{" "}
                <span className="text-emerald-600">dias</span>
              </h1>
              <p className="text-lg text-slate-500 mb-8 max-w-xl leading-relaxed">
                Envie a planta e receba um orçamento completo, com preços oficiais atualizados da
                sua região, memorial descritivo e cronograma. Menos planilha, menos retrabalho e
                mais tempo para fechar negócios.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white text-base px-8 h-12" asChild>
                  <Link to={user ? "/nova-analise" : "/solicitar-acesso"}>
                    Orçar minha primeira planta grátis <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8 h-12 border-slate-300 text-slate-700 hover:bg-slate-50">
                  Ver um orçamento de exemplo
                </Button>
              </div>
              <p className="text-sm text-slate-400">
                3 primeiras análises gratuitas • Sem cartão de crédito • Cancele quando quiser
              </p>
            </motion.div>

            {/* Simulated Terminal */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="rounded-2xl bg-slate-900 p-6 shadow-2xl shadow-slate-900/20 border border-slate-800">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="ml-3 text-sm text-slate-400 font-mono">Obra Link — Análise em andamento</span>
                </div>
                <div className="space-y-3 font-mono text-sm">
                  <div className="text-slate-300">
                    <span className="text-emerald-400">→</span> Analisando <span className="text-sky-400">planta_residencial.pdf</span>
                  </div>
                  {[
                    { label: "Escala detectada (1:50)", done: true },
                    { label: "Área total: 187.4 m²", done: true },
                    { label: "Paredes: 23 segmentos", done: true },
                    { label: "Aberturas: 14 unidades", done: true },
                    { label: "Composições SINAPI vinculadas", done: true },
                    { label: "BDI aplicado (28.5%)", done: true },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.3 }}
                      className="flex items-center gap-2 text-slate-300"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      {item.label}
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3 }}
                    className="pt-3 space-y-2"
                  >
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Gerando orçamento...</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} className="h-2 bg-slate-700 [&>div]:bg-emerald-500" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3.5 }}
                    className="pt-2 text-emerald-400 font-semibold"
                  >
                    ✓ Orçamento gerado — R$ 247.830 — 142 itens
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── BANNER CRIE SUA CONTA (apenas visitantes) ─── */}
      {!user && (
        <section className="py-12">
          <div className="container">
            <motion.div
              {...fadeInUp}
              className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 shadow-2xl shadow-slate-900/20 sm:px-12"
            >
              <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl" />
              <div className="absolute -bottom-12 left-1/3 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="relative flex flex-col items-center justify-between gap-8 lg:flex-row lg:text-left">
                <div className="max-w-xl text-center lg:text-left">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
                    <Sparkles className="h-4 w-4" /> Comece hoje, sem custo
                  </div>
                  <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
                    Tenha o Obra Link trabalhando por você
                  </h2>
                  <p className="text-lg text-slate-300">
                    Crie sua conta e ganhe acesso à análise de plantas, gestão de obras e
                    ao marketplace de materiais e serviços. As 3 primeiras análises são por nossa conta.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 bg-emerald-500 px-8 text-base font-semibold text-white hover:bg-emerald-600"
                  >
                    <Link to="/auth?tab=signup">
                      Solicitar Acesso Imediato <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 border-slate-600 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link to="/auth">Já sou cliente</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}



      {/* ─── ANATOMIA DA ANÁLISE (Bento Grid) ─── */}
      <section className="py-20 bg-slate-50">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Anatomia da Análise: Transparência Total
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Entenda exatamente o que acontece entre o upload da sua planta e o orçamento final.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Simulated System Card */}
            <motion.div {...stagger} transition={{ delay: 0.1 }} className="rounded-2xl bg-slate-900 p-8 flex flex-col justify-center min-h-[400px]">
              <div className="space-y-4">
                <div className="text-emerald-400 font-mono text-sm mb-2">// pipeline de análise</div>
                {["Pré-processamento de imagem", "Detecção de elementos construtivos", "Cálculo de quantitativos", "Vinculação SINAPI por similaridade", "Aplicação de BDI regional", "Geração de memorial descritivo"].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-slate-300 font-mono text-sm">{step}</span>
                    <ChevronRight className="h-4 w-4 text-slate-600 ml-auto" />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right: 4 Steps */}
            <div className="grid gap-4">
              {analysisSteps.map((step, i) => (
                <motion.div
                  key={step.title}
                  {...stagger}
                  transition={{ delay: i * 0.12 }}
                  className="rounded-xl border border-slate-200 bg-white p-6 flex items-start gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">{step.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANTES VS DEPOIS ─── */}
      <section className="py-20">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Do Escalímetro para a Inteligência Artificial
            </h2>
            <p className="text-lg text-slate-500">Compare o processo tradicional com o Obra Link.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Before */}
            <motion.div {...stagger} transition={{ delay: 0.1 }} className="rounded-2xl border-2 border-red-100 bg-red-50/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">O Ontem</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "8 a 12 horas de levantamento manual por planta",
                  "Planilhas Excel frágeis e sem rastreabilidade",
                  "SINAPI desatualizado ou mal vinculado",
                  "Erros de cálculo que só aparecem na obra",
                  "BDI aplicado 'no olho' sem metodologia",
                  "Memorial descritivo escrito do zero, toda vez",
                  "Sem cronograma integrado ao orçamento",
                  "Retrabalho constante por mudanças de projeto",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* After */}
            <motion.div {...stagger} transition={{ delay: 0.2 }} className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">O Hoje com Obra Link</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "5 a 10 minutos de análise automatizada por planta",
                  "Memória de cálculo auditável e rastreável",
                  "SINAPI atualizado e vinculado automaticamente",
                  "Revisão assistida com alertas de inconsistência",
                  "BDI configurável com metodologia transparente",
                  "Memorial descritivo ABNT gerado pela IA",
                  "Cronograma Gantt integrado ao orçamento",
                  "Exportação em PDF e Excel com um clique",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CALCULADORA DE ROI ─── */}
      <section id="roi" className="py-20 bg-slate-50">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Quanto Tempo e Dinheiro Você Está Perdendo?
            </h2>
            <p className="text-lg text-slate-500">Mova os controles e descubra o impacto real no seu negócio.</p>
          </motion.div>

          <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
              {/* Slider 1 */}
              <div className="mb-8">
                <div className="flex justify-between items-baseline mb-3">
                  <label className="font-semibold text-slate-900">Quantos orçamentos você faz por mês?</label>
                  <span className="text-2xl font-bold text-emerald-600">{orcamentosMes}</span>
                </div>
                <Slider
                  value={[orcamentosMes]}
                  onValueChange={([v]) => setOrcamentosMes(v)}
                  min={2}
                  max={50}
                  step={1}
                  className="[&_[role=slider]]:bg-emerald-600 [&_[role=slider]]:border-emerald-600 [&_span[data-orientation]]:bg-emerald-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>2</span><span>50</span>
                </div>
              </div>

              {/* Slider 2 */}
              <div className="mb-10">
                <div className="flex justify-between items-baseline mb-3">
                  <label className="font-semibold text-slate-900">Quantas horas por levantamento?</label>
                  <span className="text-2xl font-bold text-emerald-600">{horasLevantamento}h</span>
                </div>
                <Slider
                  value={[horasLevantamento]}
                  onValueChange={([v]) => setHorasLevantamento(v)}
                  min={2}
                  max={40}
                  step={1}
                  className="[&_[role=slider]]:bg-emerald-600 [&_[role=slider]]:border-emerald-600 [&_span[data-orientation]]:bg-emerald-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>2h</span><span>40h</span>
                </div>
              </div>

              {/* Results */}
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5 text-center">
                  <Timer className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-emerald-700">{horasRecuperadas}h</div>
                  <div className="text-sm text-slate-500 mt-1">Horas recuperadas/mês</div>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5 text-center">
                  <DollarSign className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-emerald-700">{formatCurrency(economiaMensal)}</div>
                  <div className="text-sm text-slate-500 mt-1">Economia mensal</div>
                </div>
                <div className="rounded-xl bg-emerald-600 p-5 text-center">
                  <BarChart3 className="h-6 w-6 text-white mx-auto mb-2" />
                  <div className="text-3xl font-bold text-white">{formatCurrency(valorAnual)}</div>
                  <div className="text-sm text-emerald-100 mt-1">Economia anual</div>
                </div>
              </div>

              <p className="text-center text-sm text-slate-500">
                Com o Obra Link, você elimina 90% do tempo manual, recuperando{" "}
                <strong className="text-emerald-600">{horasRecuperadas} horas por mês</strong>.{" "}
                <span className="text-slate-400">(Hora técnica estimada: R$ 150)</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FUNCIONALIDADES ─── */}
      <section id="funcionalidades" className="py-20">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Funcionalidades de Gestão Profissional
            </h2>
            <p className="text-lg text-slate-500">Tudo que você precisa para orçar, planejar e gerir suas obras.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                {...stagger}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-slate-900 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">{f.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section className="py-20 bg-slate-50">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Como Funciona</h2>
            <p className="text-lg text-slate-500">Quatro passos simples do upload ao orçamento completo.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, i) => (
              <motion.div key={step.step} {...stagger} transition={{ delay: i * 0.12 }} className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-7 w-7 text-emerald-700" />
                </div>
                <div className="text-xs font-bold text-emerald-600 mb-2">{step.step}</div>
                <h4 className="font-semibold text-slate-900 mb-2">{step.title}</h4>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HONESTIDADE TÉCNICA ─── */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Honestidade Técnica: O Que a IA Faz (e o Que Ela Não Faz)
            </h2>
          </motion.div>

          {/* Alert Banner */}
          <motion.div {...fadeInUp} className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4 mb-10">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Margem de Precisão: 10-30%</h4>
              <p className="text-sm text-slate-600">
                A precisão depende da qualidade da planta e da calibração de escala. Exigimos que o profissional
                informe a área total (m²) e recomendamos revisão humana em todos os projetos.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* What AI does well */}
            <motion.div {...stagger} transition={{ delay: 0.1 }} className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                O Que a IA Faz Muito Bem
              </h4>
              <ul className="space-y-3">
                {[
                  "Identificar paredes, portas e janelas em plantas 2D",
                  "Calcular áreas e perímetros com escala informada",
                  "Vincular insumos à tabela SINAPI por similaridade",
                  "Gerar memorial descritivo em formato ABNT",
                  "Estimar cronograma Gantt baseado na área",
                  "Produzir orçamento formatado em PDF e Excel",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* What needs validation */}
            <motion.div {...stagger} transition={{ delay: 0.2 }} className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-sky-600" />
                O Que Exige Validação do Engenheiro
              </h4>
              <ul className="space-y-3">
                {[
                  "Quantitativos de instalações elétricas complexas",
                  "Fundações especiais e estruturas não convencionais",
                  "Detalhes de acabamento de alto padrão",
                  "Condições de solo e topografia específicas",
                  "Projetos com múltiplas plantas sobrepostas",
                  "Custos de mão de obra local e acordos sindicais",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <AlertTriangle className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Dark Banner */}
          <motion.div {...fadeInUp} className="rounded-xl bg-slate-900 p-6 text-center">
            <p className="text-slate-300 text-sm leading-relaxed max-w-2xl mx-auto">
              <strong className="text-white">Nosso compromisso:</strong> Obra Link é um{" "}
              <strong className="text-emerald-400">Copiloto</strong>, não um substituto do engenheiro.
              A IA acelera e organiza — a decisão técnica final é sempre do profissional.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── SEGURANÇA ─── */}
      <section className="py-20 bg-slate-50">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Segurança e Privacidade: Padrão Bancário
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
            {[
              { icon: Lock, title: "Criptografia Ponta a Ponta", desc: "TLS/SSL em todas as comunicações. Dados em repouso criptografados com AES-256." },
              { icon: Server, title: "Retenção Zero de Plantas", desc: "Suas plantas são processadas e descartadas. Nenhum arquivo fica armazenado sem sua autorização." },
              { icon: Scale, title: "100% Conforme LGPD", desc: "Política de privacidade transparente. Você pode exportar ou excluir todos os seus dados a qualquer momento." },
            ].map((item, i) => (
              <motion.div key={item.title} {...stagger} transition={{ delay: i * 0.1 }} className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-slate-700" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="rounded-xl bg-slate-900 p-6 flex items-center justify-center gap-4 max-w-4xl mx-auto">
            <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
            <p className="text-slate-300 text-sm">
              <strong className="text-white">Controle Total dos Seus Dados:</strong>{" "}
              Exporte, compartilhe ou exclua a qualquer momento. Seus projetos pertencem a você.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Perguntas Frequentes
            </h2>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-slate-200 bg-white px-6 data-[state=open]:shadow-sm">
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-500 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="py-20 bg-slate-900">
        <div className="container text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pronto para eliminar o retrabalho?
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
              Comece agora, faça suas primeiras 3 análises gratuitamente e veja o resultado em minutos.
            </p>
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white text-base px-10 h-12" asChild>
              <Link to={user ? "/nova-analise" : "/solicitar-acesso"}>
                Começar Grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-200 py-14 bg-white">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {/* Col 1: Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Box className="h-6 w-6 text-emerald-600" />
                <span className="font-bold text-slate-900 text-lg">Obra Link</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Seu negócio de Arquitetura ou Construção, digital.
              </p>
            </div>

            {/* Col 2: Soluções */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-sm">Soluções</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/solicitar-acesso" className="hover:text-slate-900 transition-colors">Construtoras</Link></li>
                <li><Link to="/solicitar-acesso" className="hover:text-slate-900 transition-colors">Empreiteiros</Link></li>
                <li><Link to="/solicitar-acesso" className="hover:text-slate-900 transition-colors">Escritórios de Arquitetura</Link></li>
              </ul>
            </div>

            {/* Col 3: Recursos */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-sm">Recursos</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Guias</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Eventos</a></li>
              </ul>
            </div>

            {/* Col Empresas */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-sm">Empresas</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/seja-parceiro" className="hover:text-slate-900 transition-colors">Anunciar Materiais</Link></li>
                <li><Link to="/profissionais" className="hover:text-slate-900 transition-colors">Prestar Serviços</Link></li>
              </ul>
            </div>

            {/* Col 4: Geral */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-sm">Geral</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/carreira" className="hover:text-slate-900 transition-colors">Carreira</Link></li>
                <li><Link to="/termos-de-uso" className="hover:text-slate-900 transition-colors">Termos de Uso</Link></li>
                <li><Link to="/politica-de-privacidade" className="hover:text-slate-900 transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>

            {/* Col 5: Social */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-sm">Social</h4>
              <div className="flex items-center gap-3 text-slate-400 mb-3">
                <a href="#" className="hover:text-emerald-600 transition-colors"><Linkedin className="h-5 w-5" /></a>
                <a href="#" className="hover:text-emerald-600 transition-colors"><Instagram className="h-5 w-5" /></a>
                <a href="#" className="hover:text-emerald-600 transition-colors"><Github className="h-5 w-5" /></a>
              </div>
              <a href="mailto:contato@obralink.com.br" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                contato@obralink.com.br
              </a>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Obra Link. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
