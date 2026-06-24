import { useEffect } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSolutionBySlug } from "@/config/solutions";
import { authUrlWithRedirect, saveIntendedRoute } from "@/lib/intendedRoute";

interface RecursoBloqueadoProps {
  slug?: string;
}

function useResourceSeo(name?: string, description?: string) {
  useEffect(() => {
    if (!name) return;

    const prevTitle = document.title;
    document.title = `${name} - Obra Link`;

    const meta =
      (document.querySelector('meta[name="description"]') as HTMLMetaElement | null) ??
      (() => {
        const created = document.createElement("meta");
        created.name = "description";
        document.head.appendChild(created);
        return created;
      })();

    const prevDescription = meta.content;
    if (description) meta.content = description.slice(0, 160);

    return () => {
      document.title = prevTitle;
      if (description) meta.content = prevDescription;
    };
  }, [description, name]);
}

export default function RecursoBloqueado({ slug: slugProp }: RecursoBloqueadoProps) {
  const params = useParams();
  const location = useLocation();
  const slug = slugProp ?? params.slug;
  const solution = getSolutionBySlug(slug);
  const intended = slugProp ? location.pathname + location.search : solution?.path ?? "/dashboard";

  useEffect(() => {
    if (solution) saveIntendedRoute(intended);
  }, [intended, solution]);

  useResourceSeo(solution?.marketing.name, solution?.marketing.description);

  if (!solution) return <Navigate to="/" replace />;

  const { name, tagline, description, benefits, icon: Icon } = solution.marketing;
  const signupUrl = authUrlWithRedirect(intended, "signup", solution.signupAccountHint);
  const loginUrl = authUrlWithRedirect(intended, "login");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 text-slate-900">
      <main className="container mx-auto px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <Sparkles className="h-4 w-4" /> Falta so um passo para liberar
            </div>

            <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {tagline}
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-slate-500">{description}</p>

            <ul className="mb-10 space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="text-slate-700">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 bg-emerald-600 px-8 text-base text-white hover:bg-emerald-700"
              >
                <Link to={signupUrl}>
                  Liberar {name} agora <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-slate-300 px-8 text-base text-slate-700 hover:bg-slate-50"
              >
                <Link to={loginUrl}>Ja tenho conta</Link>
              </Button>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              Leva menos de 1 minuto - 3 primeiras analises gratis - Sem cartao de credito
            </p>
          </motion.div>

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
                  Com uma conta gratuita voce libera este recurso e todas as outras solucoes do
                  Obra Link.
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
