import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ClientErrorMonitor } from "@/components/ClientErrorMonitor";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/PublicOnlyRoute";
import { AppShell } from "@/components/shell/AppShell";
import { SolutionEntryRoute } from "@/components/SolutionEntryRoute";
import { landingPath } from "@/config/landingSolutions";
import { SOLUTION_ROUTES } from "@/config/solutions";
import RecursoBloqueado from "./pages/RecursoBloqueado";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const EsqueciSenha = lazy(() => import("./pages/EsqueciSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const DocumentosDicas = lazy(() => import("./pages/DocumentosDicas"));
const QuemSomos = lazy(() => import("./pages/QuemSomos"));
const Suporte = lazy(() => import("./pages/Suporte"));
const ShareAnalise = lazy(() => import("./pages/ShareAnalise"));
const SolicitarAcesso = lazy(() => import("./pages/SolicitarAcesso"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const LojaPublica = lazy(() => import("./pages/LojaPublica"));
const VendedorPerfil = lazy(() => import("./pages/VendedorPerfil"));
const Profissionais = lazy(() => import("./pages/Profissionais"));
const Inicio = lazy(() => import("./pages/Inicio"));
const Carreira = lazy(() => import("./pages/Carreira"));
const SinapiUpload = lazy(() => import("./pages/SinapiUpload"));
const TermosUso = lazy(() => import("./pages/TermosUso"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminLayout = lazy(() => import("./pages/Admin/AdminLayout"));
const VisaoGeral = lazy(() => import("./pages/Admin/VisaoGeral"));
const UsuariosList = lazy(() => import("./pages/Admin/UsuariosList"));
const SinapiPage = lazy(() => import("./pages/Admin/SinapiPage"));
const LogsIA = lazy(() => import("./pages/Admin/LogsIA"));
const Configuracoes = lazy(() => import("./pages/Admin/Configuracoes"));
const LojasPendentes = lazy(() => import("./pages/Admin/LojasPendentes"));
const AdminBlog = lazy(() => import("./pages/Admin/AdminBlog"));
const Destaques = lazy(() => import("./pages/Admin/Destaques"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
  </div>
);

function PublicAreaRoutes() {
  return (
    <>
      <Route
        element={<AppShell />}
      >
        <Route path="/" element={<Index />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/documentos" element={<DocumentosDicas />} />
        <Route path="/sobre-nos" element={<QuemSomos />} />
        <Route path="/suporte" element={<Suporte />} />
        <Route path="/carreira" element={<Carreira />} />
        <Route path="/termos-de-uso" element={<TermosUso />} />
        <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
        <Route
          path="/solicitar-acesso"
          element={(
            <PublicOnlyRoute>
              <SolicitarAcesso />
            </PublicOnlyRoute>
          )}
        />

        <Route path="/loja/:id" element={<LojaPublica />} />
        <Route path="/vendedor/:id" element={<VendedorPerfil />} />
        <Route path="/share/:analysisId" element={<ShareAnalise />} />
        <Route path="/solucoes/:slug" element={<SolutionEntryRoute mode="landing" />} />
        <Route path="/recurso/:slug" element={<SolutionEntryRoute mode="private" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  );
}

function AppAreaRoutes() {
  return (
    <>
      <Route element={<AppShell />}>
        <Route
          path="/inicio"
          element={(
            <ProtectedRoute>
              <Inicio />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/marketplace"
          element={(
            <ProtectedRoute
              unauthenticatedFallback={<Navigate to={landingPath("marketplace")} replace />}
            >
              <Marketplace />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/profissionais"
          element={(
            <ProtectedRoute
              unauthenticatedFallback={<Navigate to={landingPath("prestar-servico")} replace />}
            >
              <Profissionais />
            </ProtectedRoute>
          )}
        />
        <Route path="/servicos" element={<Navigate to="/profissionais" replace />} />
        <Route
          path="/seja-parceiro"
          element={(
            <ProtectedRoute
              unauthenticatedFallback={<Navigate to={landingPath("criar-loja")} replace />}
            >
              <Navigate to="/painel-loja" replace />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/sinapi"
          element={(
            <ProtectedRoute unauthenticatedFallback={<RecursoBloqueado slug="gestao-de-projetos" />}>
              <SinapiUpload />
            </ProtectedRoute>
          )}
        />

        {SOLUTION_ROUTES.map(({ slug, path, component: Component }) => (
          <Route
            key={slug}
            path={path}
            element={(
              <ProtectedRoute unauthenticatedFallback={<RecursoBloqueado slug={slug} />}>
                <Component />
              </ProtectedRoute>
            )}
          />
        ))}

        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<VisaoGeral />} />
          <Route path="usuarios" element={<UsuariosList />} />
          <Route path="lojas" element={<LojasPendentes />} />
          <Route path="destaques" element={<Destaques />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="sinapi" element={<SinapiPage />} />
          <Route path="logs-ia" element={<LogsIA />} />
          <Route path="config" element={<Configuracoes />} />
        </Route>
      </Route>
    </>
  );
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <RouteFallback />;

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/esqueci-senha"
          element={(
            <PublicOnlyRoute>
              <EsqueciSenha />
            </PublicOnlyRoute>
          )}
        />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        {PublicAreaRoutes()}
        {AppAreaRoutes()}
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <ClientErrorMonitor />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </GlobalErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
