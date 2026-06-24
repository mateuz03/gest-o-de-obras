import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { usePlatformFlags } from "@/hooks/usePlatformFlags";
import { saveIntendedRoute, authUrlWithRedirect } from "@/lib/intendedRoute";
import { Button } from "@/components/ui/button";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  unauthenticatedFallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  unauthenticatedFallback,
}: ProtectedRouteProps) {
  const { user, loading, accountStatus, signOut } = useAuth();
  const { isAdmin, isAdminLoading } = useAdminRole(user?.id);
  const { flags, loading: flagsLoading } = usePlatformFlags();
  const location = useLocation();

  if (loading || flagsLoading || (user && isAdminLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    const intended = location.pathname + location.search;
    saveIntendedRoute(intended);

    if (unauthenticatedFallback) return <>{unauthenticatedFallback}</>;

    return <Navigate to={authUrlWithRedirect(intended, "login")} replace />;
  }

  if (accountStatus !== "active") {
    const title = accountStatus === "banned" ? "Conta bloqueada" : "Conta suspensa";
    const description = accountStatus === "banned"
      ? "Seu acesso às áreas privadas foi bloqueado pela equipe administrativa."
      : "Seu acesso às áreas privadas está temporariamente suspenso pela equipe administrativa.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">Acesso restrito</p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => {
                void signOut();
              }}
            >
              Sair da conta
            </Button>
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <a href="/suporte">Falar com o suporte</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (flags.maintenance_mode && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">Modo de manutenção</p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Voltamos em instantes</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {flags.maintenance_message}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => {
                void signOut();
              }}
            >
              Sair da conta
            </Button>
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <a href="/suporte">Abrir suporte</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
