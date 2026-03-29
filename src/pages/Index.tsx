import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Brain, FileSpreadsheet, ArrowRight, Box, Ruler, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const steps = [
  { icon: Upload, title: "Faça o Upload", desc: "Envie a planta baixa da sua obra em formato de imagem ou PDF." },
  { icon: Brain, title: "IA Analisa", desc: "Nossa IA identifica paredes, portas, janelas e calcula dimensões automaticamente." },
  { icon: FileSpreadsheet, title: "Receba os Resultados", desc: "Obtenha uma lista completa de materiais com quantidades e recomendações de marcas." },
];

const features = [
  { icon: Box, title: "Estrutura Completa", desc: "Tijolos, cimento, areia, vergalhões — tudo calculado automaticamente." },
  { icon: Ruler, title: "Acabamento Preciso", desc: "Metragem de piso, volume de tinta e gesso com base nas dimensões reais." },
  { icon: Zap, title: "Instalações Elétricas e Hidráulicas", desc: "Estimativa de fiação, tubulação e pontos baseados na planta." },
];

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-primary/20 bg-primary text-primary-foreground backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-foreground">
            <Box className="h-6 w-6" />
            <span>AI Construct</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild>
                <Link to="/dashboard">Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/auth">Entrar</Link></Button>
                <Button asChild><Link to="/auth?tab=signup">Começar Grátis</Link></Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[90vh] items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" /> Powered by IA Gemini
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Calcule materiais de obra{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                com inteligência artificial
              </span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Envie a planta baixa e receba instantaneamente a lista completa de materiais,
              quantidades e as melhores marcas — tudo calculado por IA.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to={user ? "/nova-analise" : "/auth?tab=signup"}>
                  Começar Análise <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <a href="#como-funciona">Como Funciona</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Como Funciona</h2>
            <p className="text-muted-foreground text-lg">Três passos simples para sua estimativa completa</p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative rounded-2xl border bg-card p-8 text-center shadow-sm"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-24">
        <div className="container">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">O que Você Recebe</h2>
            <p className="text-muted-foreground text-lg">Estimativa detalhada para cada etapa da obra</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border bg-card p-8 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" />
            <span>AI Construct Estimator</span>
          </div>
          <span>© {new Date().getFullYear()} Todos os direitos reservados</span>
        </div>
      </footer>
    </div>
  );
}
