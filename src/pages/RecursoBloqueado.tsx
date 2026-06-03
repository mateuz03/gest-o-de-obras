import { Link, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Box, CheckCircle2, Lock, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSolutionBySlug } from "@/config/solutions";

interface RecursoBloqueadoProps {
  /** Slug da solução. Quando omitido, é lido da URL (`/recurso/:slug`). */
  slug?: string;
}

/**
 * Tela de Explicação / Bloqueio (UX Educativa).
 * Exibida quando um visitante (não logado) tenta acessar uma Solução Interna.
 * Mostra o valor do recurso e direciona para criar conta / login.
 */
export default function RecursoBloqueado({ slug: slugProp }: RecursoBloqueadoProps) {
  const params = useParams();
  const slug = slugProp ?? params.slug;
  const solution = getSolutionBySlug(slug);

  // Slug inexistente → manda para a Home pública.
  if (!solution) return <Navigate to="/" replace />;

  const { name, tagline, description, benefits, icon: Icon } = solution.marketing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 text-slate-900">
      {/* Header simples */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>Obra Link</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="text-slate-600">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
          {/* Coluna de conteúdo */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700">
              <Lock className="h-4 w-4" /> Recurso exclusivo para membros
            </div>

            <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {tagline}
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-slate-500">{description}</p>

            <ul className="mb-10 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="text-slate-700">{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-emerald-600 px-8 text-base text-white hover:bg-emerald-700">
                <Link to="/auth?tab=signup">
                  Criar conta gratuita <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-slate-300 px-8 text-base text-slate-700 hover:bg-slate-50">
                <Link to="/auth">Já tenho conta</Link>
              </Button>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              Primeiras 3 análises grátis • Sem cartão de crédito
            </p>
          </motion.div>

          {/* Coluna ilustrativa */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-900/5">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-100/60 blur-2xl" />
              <div className="relative">
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">{name}</h3>
                <p className="mb-6 text-sm text-slate-500">
                  Desbloqueie esta e todas as outras soluções do Obra Link criando sua conta.
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                  Acesso imediato após o cadastro
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
