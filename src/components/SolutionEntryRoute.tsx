import { getLandingBySlug } from "@/config/landingSolutions";
import { getSolutionBySlug } from "@/config/solutions";
import { useAuth } from "@/contexts/AuthContext";
import RecursoBloqueado from "@/pages/RecursoBloqueado";
import SolucaoLanding from "@/pages/SolucaoLanding";
import { Navigate, useParams } from "react-router-dom";

type SolutionEntryMode = "landing" | "private";

interface SolutionEntryRouteProps {
  mode: SolutionEntryMode;
}

function resolveAuthenticatedDestination(slug?: string) {
  const landingSolution = getLandingBySlug(slug);
  if (landingSolution) return landingSolution.destination;

  const privateSolution = getSolutionBySlug(slug);
  if (!privateSolution) return "/inicio";

  return privateSolution.path.includes(":") ? "/dashboard" : privateSolution.path;
}

export function SolutionEntryRoute({ mode }: SolutionEntryRouteProps) {
  const { user, loading } = useAuth();
  const { slug } = useParams();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={resolveAuthenticatedDestination(slug)} replace />;
  }

  return mode === "landing" ? <SolucaoLanding /> : <RecursoBloqueado />;
}
