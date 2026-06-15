import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Box, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLandingBySlug } from "@/config/landingSolutions";
import { saveIntendedRoute, authUrlWithRedirect } from "@/lib/intendedRoute";

interface SolucaoLandingProps {
  /** Slug da solução. Quando omitido, é lido da rota `/solucoes/:slug`. */
  slug?: string;
}

/** Atualiza título e meta description para SEO dinâmico por solução. */
function useLandingSeo(name?: string, subtitle?: string) {
  useEffect(() => {
    if (!name) return;
    const prevTitle = document.title;
    document.title = `${name} — Obra Link`;

    const meta =
      (document.querySelector('meta[name="description"]') as HTMLMetaElement | null) ??
      (() => {
        const m = document.createElement("meta");
        m.name = "description";
        document.head.appendChild(m);
        return m;
      })();
    const prevDesc = meta.content;
    if (subtitle) meta.content = subtitle.slice(0, 160);

    return () => {
      document.title = prevTitle;
      if (subtitle) meta.content = prevDesc;
    };
  }, [name, subtitle]);
}

/** Renderiza o título com a expressão em destaque. */
function renderTitle(title: string, highlight: string) {
  const [before, after] = title.split("{highlight}");
  return (
    <>
      {before}
      <span className="text-emerald-600">{highlight}</span>
      {after}
    </>
  );
}

/**
 * Landing Page Dinâmica de Conversão (única e reaproveitável).
 *
 * Exibida para VISITANTES que tentam acessar uma das soluções de negócio
 * (Marketplace, Prestar Serviço, Crie sua Loja). Recebe os dados via slug
 * de rota e direciona para cadastro/login preservando a rota de destino
 * (memória de intenção → deep link pós-login).
 */
export default function SolucaoLanding({ slug: slugProp }: SolucaoLandingProps) {
  const params = useParams();
  const slug = slugProp ?? params.slug;
  const solution = getLandingBySlug(slug);

  const destination = solution?.destination ?? "/dashboard";

  useEffect(() => {
    if (solution) saveIntendedRoute(destination);
  }, [solution, destination]);

  useLandingSeo(solution?.marketing.name, solution?.marketing.subtitle);

  // Slug inexistente → volta para a Home pública.
  if (!solution) return <Navigate to="/" replace />;

  const { name, badge, title, highlight, subtitle, benefits, primaryCta, icon: Icon } =
    solution.marketing;
  const signupUrl = authUrlWithRedirect(destination, "signup");
  const loginUrl = authUrlWithRedirect(destination, "login");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 text-slate-900">
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
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <Sparkles className="h-4 w-4" /> {badge}
            </div>

            <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {renderTitle(title, highlight)}
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-slate-500">{subtitle}</p>

            <ul className="mb-10 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="text-slate-700">{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* CTA Primário */}
              <Button
                asChild
                size="lg"
                className="h-12 bg-emerald-600 px-8 text-base text-white hover:bg-emerald-700"
              >
                <Link to={signupUrl}>
                  {primaryCta} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              {/* CTA Secundário discreto */}
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-12 px-4 text-base text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <Link to={loginUrl}>Já tenho uma conta. Fazer login</Link>
              </Button>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              Leva menos de 1 minuto • Sem cartão de crédito
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
                  Crie sua conta gratuita e libere esta solução junto com todas as outras
                  ferramentas do Obra Link.
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                  Acesso liberado na hora, sem espera
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
