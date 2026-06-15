import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SOLUTION_ROUTES } from "@/config/solutions";

// ── Páginas Públicas ──────────────────────────────────────────────────────
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

// ── Páginas Privadas e Funcionais ─────────────────────────────────────────
import Dashboard from "./pages/Dashboard";
import NovaAnalise from "./pages/NovaAnalise";
import AnaliseResultado from "./pages/AnaliseResultado";
import NotasFiscais from "./pages/NotasFiscais";
import Perfil from "./pages/Perfil";
import CadastrarProfissional from "./pages/CadastrarProfissional";
import PainelLojista from "./pages/PainelLojista";
import MeusAnuncios from "./pages/MeusAnuncios";

// ── Páginas Admin ─────────────────────────────────────────────────────────
import AdminLayout from "./pages/Admin/AdminLayout";
import VisaoGeral from "./pages/Admin/VisaoGeral";
import UsuariosList from "./pages/Admin/UsuariosList";
import SinapiPage from "./pages/Admin/SinapiPage";
import LogsIA from "./pages/Admin/LogsIA";
import Configuracoes from "./pages/Admin/Configuracoes";
import LojasPendentes from "./pages/Admin/LojasPendentes";
import AdminBlog from "./pages/Admin/AdminBlog";

// Instância do QueryClient fora do componente para não recriar a cada render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache
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
 * AppRoutes: O gerente central das rotas da plataforma
 */
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <RouteFallback />;

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ── Rotas Públicas Principais ─────────────────────────────── */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        
        {/* ── Conteúdo e Institucional ──────────────────────────────── */}
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/documentos" element={<DocumentosDicas />} />
        <Route path="/sobre-nos" element={<QuemSomos />} />
        <Route path="/suporte" element={<Suporte />} />
        <Route path="/carreira" element={<Carreira />} />
        <Route path="/termos-de-uso" element={<TermosUso />} />
        <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/seja-parceiro" element={<SejaParceiro />} />
        <Route path="/solicitar-acesso" element={<SolicitarAcesso />} />
        
        {/* ── Diretório, Lojas e Compartilhamento ───────────────────── */}
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/loja/:id" element={<LojaPublica />} />
        <Route path="/vendedor/:id" element={<VendedorPerfil />} />
        <Route path="/profissionais" element={<Profissionais />} />
        <Route path="/servicos" element={<Navigate to="/profissionais" replace />} />
        <Route path="/share/:analysisId" element={<ShareAnalise />} />
        <Route path="/recurso/:slug" element={<RecursoBloqueado />} />

<<<<<<< HEAD
        {/* ── Soluções Internas Condicionais (Route Guard do Lovable) ── */}
=======
        {/* Landing Pages Dinâmicas de Conversão (captura de visitantes) */}
        <Route path="/solucoes/:slug" element={<SolucaoLanding />} />

        {/* ✅ /servicos redireciona para /profissionais (evita conteúdo duplicado) */}
        <Route path="/servicos" element={<Navigate to="/profissionais" replace />} />

        {/* ── Soluções Internas (Route Guard condicional) ────────── */}
>>>>>>> 204edfb8ed222bbb1bcfd303100c9db278bb1ae9
        {SOLUTION_ROUTES.map(({ slug, path, component: Component }) => (
          <Route
            key={slug}
            path={path}
            element={user ? <Component /> : <RecursoBloqueado slug={slug} />}
          />
        ))}

        {/* ── Telas Privadas Core (Atrás do ProtectedRoute) ─────────── */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/nova-analise" element={<ProtectedRoute><NovaAnalise /></ProtectedRoute>} />
        <Route path="/analise/:id" element={<ProtectedRoute><AnaliseResultado /></ProtectedRoute>} />
        <Route path="/notas-fiscais" element={<ProtectedRoute><NotasFiscais /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
        <Route path="/cadastrar-profissional" element={<ProtectedRoute><CadastrarProfissional /></ProtectedRoute>} />
        <Route path="/painel-loja" element={<ProtectedRoute><PainelLojista /></ProtectedRoute>} />
        <Route path="/meus-anuncios" element={<ProtectedRoute><MeusAnuncios /></ProtectedRoute>} />

        {/* ── Painel Admin (Atrás do ProtectedRoute) ────────────────── */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<VisaoGeral />} />
          <Route path="usuarios" element={<UsuariosList />} />
          <Route path="lojas" element={<LojasPendentes />} />
          <Route path="sinapi" element={<SinapiPage />} />
          <Route path="logs-ia" element={<LogsIA />} />
          <Route path="config" element={<Configuracoes />} />
          <Route path="blog" element={<AdminBlog />} />
        </Route>

        {/* ── Fallback Universal ────────────────────────────────────── */}
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
<<<<<<< HEAD
          <AppRoutes /> {/* ✅ Apenas UMA chamada para o mapa de rotas oficial */}
=======
          <AppRoutes />
>>>>>>> 204edfb8ed222bbb1bcfd303100c9db278bb1ae9
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;