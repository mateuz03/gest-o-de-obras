import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SOLUTION_ROUTES } from "@/config/solutions";

// ── Páginas Públicas (sempre carregadas) ──────────────────────────────────
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import DocumentosDicas from "./pages/DocumentosDicas";
import QuemSomos from "./pages/QuemSomos";
import Suporte from "./pages/Suporte";
import ShareAnalise from "./pages/ShareAnalise";
import SolicitarAcesso from "./pages/SolicitarAcesso";
import Marketplace from "./pages/Marketplace";
import LojaPublica from "./pages/LojaPublica";
import VendedorPerfil from "./pages/VendedorPerfil";
import Profissionais from "./pages/Profissionais";
import SejaParceiro from "./pages/SejaParceiro";
import Carreira from "./pages/Carreira";
import TermosUso from "./pages/TermosUso";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import RecursoBloqueado from "./pages/RecursoBloqueado";
import SolucaoLanding from "./pages/SolucaoLanding";
import NotFound from "./pages/NotFound";

// ── Páginas Admin (não alteradas — fluxo de admin permanece o mesmo) ───────
import AdminLayout from "./pages/Admin/AdminLayout";
import VisaoGeral from "./pages/Admin/VisaoGeral";
import UsuariosList from "./pages/Admin/UsuariosList";
import SinapiPage from "./pages/Admin/SinapiPage";
import LogsIA from "./pages/Admin/LogsIA";
import Configuracoes from "./pages/Admin/Configuracoes";
import LojasPendentes from "./pages/Admin/LojasPendentes";
import AdminBlog from "./pages/Admin/AdminBlog";

// ✅ QueryClient instanciado fora do componente (evita recriação a cada render)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache padrão
      retry: 1, // Tenta 1 vez antes de falhar
    },
  },
});

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
  </div>
);

/**
 * Mapa de rotas dinâmico baseado no estado de autenticação.
 *
 * - Visitante (não logado): as Soluções Internas NÃO são renderizadas. Cada
 *   tentativa de acesso cai na Tela de Bloqueio explicativa daquela solução.
 * - Usuário logado: o código das telas privadas é carregado (lazy) e exibido.
 *
 * O fluxo de Admin é mantido separado e inalterado.
 */
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <RouteFallback />;

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ── Rotas Públicas (Área Pública) ──────────────────────── */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/documentos" element={<DocumentosDicas />} />
        <Route path="/sobre-nos" element={<QuemSomos />} />
        <Route path="/suporte" element={<Suporte />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/loja/:id" element={<LojaPublica />} />
        <Route path="/vendedor/:id" element={<VendedorPerfil />} />
        <Route path="/profissionais" element={<Profissionais />} />
        <Route path="/seja-parceiro" element={<SejaParceiro />} />
        <Route path="/solicitar-acesso" element={<SolicitarAcesso />} />
        <Route path="/share/:analysisId" element={<ShareAnalise />} />
        <Route path="/carreira" element={<Carreira />} />
        <Route path="/termos-de-uso" element={<TermosUso />} />
        <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />

        {/* Tela de bloqueio acessível por link direto */}
        <Route path="/recurso/:slug" element={<RecursoBloqueado />} />

        {/* ✅ /servicos redireciona para /profissionais (evita conteúdo duplicado) */}
        <Route path="/servicos" element={<Navigate to="/profissionais" replace />} />

        {/* ── Soluções Internas (Route Guard condicional) ────────── */}
        {SOLUTION_ROUTES.map(({ slug, path, component: Component }) => (
          <Route
            key={slug}
            path={path}
            element={
              user ? <Component /> : <RecursoBloqueado slug={slug} />
            }
          />
        ))}

        {/* ── Rotas Admin (fluxo separado e inalterado) ──────────── */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<VisaoGeral />} />
          <Route path="usuarios" element={<UsuariosList />} />
          <Route path="sinapi" element={<SinapiPage />} />
          <Route path="logs-ia" element={<LogsIA />} />
          <Route path="config" element={<Configuracoes />} />
        </Route>

        {/* ── Fallback 404 ───────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
