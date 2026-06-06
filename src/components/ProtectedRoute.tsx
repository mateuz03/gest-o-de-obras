import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { saveIntendedRoute, authUrlWithRedirect } from "@/lib/intendedRoute";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Estado explícito de "Checking Auth": bloqueia a renderização condicional
  // das rotas até que o status real do usuário seja resolvido (sem flicker).
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Preserva o deep link para redirecionamento pós-login.
    const intended = location.pathname + location.search;
    saveIntendedRoute(intended);
    return <Navigate to={authUrlWithRedirect(intended, "login")} replace />;
  }

  return <>{children}</>;
}
