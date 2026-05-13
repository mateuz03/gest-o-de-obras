import { useState } from "react";
import { Link } from "react-router-dom";
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

  const faqItems = [
    { q: "Quais formatos de planta são suportados?", a: "Aceitamos PDF, JPG, PNG e arquivos DWG (até 50MB para DWG e 20MB para os demais). A IA funciona melhor com plantas em escala e boa resolução." },
    { q: "Como funciona a integração com o SINAPI?", a: "Você pode fazer upload da planilha oficial do SINAPI para sua região. A IA vincula automaticamente cada insumo identificado ao código SINAPI mais próximo por similaridade de descrição." },
    { q: "A IA substitui o orçamentista?", a: "Não. O Obra Link é um copiloto que acelera o trabalho do profissional. A revisão humana continua sendo fundamental, especialmente em projetos complexos." },
    { q: "Qual a margem de precisão da análise?", a: "Para plantas com escala definida e área informada, a precisão fica entre 85-95%. Sem escala, a margem de erro pode chegar a 30%. Sempre recomendamos calibração manual." },
    { q: "Posso usar para obras de grande porte?", a: "Sim. O sistema suporta múltiplos pavimentos e diversas tipologias construtivas. Para obras muito complexas, recomendamos dividir a análise por etapas ou blocos." },
    { q: "Como funciona o BDI configurável?", a: "Você define os percentuais de administração central, lucro, impostos e outros encargos. O BDI é aplicado sobre o custo direto de cada item do orçamento." },
    { q: "Meus dados e plantas ficam seguros?", a: "Sim. Toda comunicação é criptografada (TLS/SSL), os dados ficam em servidores isolados e seguimos as diretrizes da LGPD. Você pode excluir seus dados a qualquer momento." },
    { q: "Quantas análises posso fazer gratuitamente?", a: "As primeiras 3 análises são gratuitas, sem necessidade de cartão de crédito. Após isso, oferecemos planos acessíveis para profissionais e empresas." },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* ─── HEADER ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>Obra Link</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to={user ? "/dashboard" : "/auth"} className="hover:text-slate-900 transition-colors">Gestão de Projetos</Link>
            <Link to="/marketplace" className="hover:text-slate-900 transition-colors">Marketplace</Link>
            <Link to="/profissionais" className="hover:text-slate-900 transition-colors">Prestar Serviços</Link>
            <Link to="/seja-parceiro" className="hover:text-slate-900 transition-colors">Seja Parceiro</Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link to="/dashboard">Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-slate-600 hover:text-slate-900">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link to="/solicitar-acesso">Começar Grátis</Link>
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
                <Zap className="h-4 w-4" /> Inteligência Artificial Multimodal
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-tight tracking-tight text-slate-900 mb-6">
                De <span className="text-emerald-600">3 dias</span> para{" "}
                <span className="text-emerald-600">5 minutos</span> no levantamento de quantitativos
              </h1>
              <p className="text-lg text-slate-500 mb-8 max-w-xl leading-relaxed">
                Nossa IA usa Gemini 2.5 Pro para interpretar suas plantas, cruza automaticamente com a
                tabela SINAPI regional, aplica BDI configurável e gera orçamento completo + cronograma Gantt.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white text-base px-8 h-12" asChild>
                  <Link to={user ? "/nova-analise" : "/solicitar-acesso"}>
                    Analisar minha primeira planta agora <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8 h-12 border-slate-300 text-slate-700 hover:bg-slate-50">
                  Ver exemplo real PDF/Excel
                </Button>
              </div>
              <p className="text-sm text-slate-400">
                Primeiras 3 análises grátis • Sem cartão de crédito
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
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
                <li><a href="#" className="hover:text-slate-900 transition-colors">Carreira</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Política de Privacidade</a></li>
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
