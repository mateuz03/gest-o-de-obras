import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Páginas Públicas
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Blog from "./pages/Blog";
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
import NotFound from "./pages/NotFound";

// Páginas Protegidas (usuário autenticado)
import Dashboard from "./pages/Dashboard";
import NovaAnalise from "./pages/NovaAnalise";
import AnaliseResultado from "./pages/AnaliseResultado";
import SinapiUpload from "./pages/SinapiUpload";
import NotasFiscais from "./pages/NotasFiscais";
import Perfil from "./pages/Perfil";
import CadastrarProfissional from "./pages/CadastrarProfissional";
import PainelLojista from "./pages/PainelLojista";
import MeusAnuncios from "./pages/MeusAnuncios";

// Páginas Admin
import AdminLayout from "./pages/Admin/AdminLayout";
import VisaoGeral from "./pages/Admin/VisaoGeral";
import UsuariosList from "./pages/Admin/UsuariosList";
import SinapiPage from "./pages/Admin/SinapiPage";
import LogsIA from "./pages/Admin/LogsIA";
import Configuracoes from "./pages/Admin/Configuracoes";
import LojasPendentes from "./pages/Admin/LojasPendentes";
import Destaques from "./pages/Admin/Destaques";

// ✅ QueryClient instanciado fora do componente (evita recriação a cada render)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache padrão
      retry: 1, // Tenta 1 vez antes de falhar
    },
  },
});

const App = () => (
  // ✅ client={queryClient} — expressão JS, não string
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>

            {/* ── Rotas Públicas ───────────────────────────────────── */}
            <Route path="/"               element={<Index />} />
            <Route path="/auth"           element={<Auth />} />
            <Route path="/esqueci-senha"  element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/blog"           element={<Blog />} />
            <Route path="/documentos"     element={<DocumentosDicas />} />
            <Route path="/sobre-nos"      element={<QuemSomos />} />
            <Route path="/suporte"        element={<Suporte />} />
            <Route path="/marketplace"    element={<Marketplace />} />
            <Route path="/loja/:id"       element={<LojaPublica />} />
            <Route path="/vendedor/:id"   element={<VendedorPerfil />} />
            <Route path="/profissionais"  element={<Profissionais />} />
            <Route path="/seja-parceiro"  element={<SejaParceiro />} />
            <Route path="/solicitar-acesso" element={<SolicitarAcesso />} />
            <Route path="/share/:analysisId" element={<ShareAnalise />} />
            <Route path="/carreira" element={<Carreira />} />
            <Route path="/termos-de-uso" element={<TermosUso />} />
            <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />

            {/* ✅ /servicos redireciona para /profissionais (evita conteúdo duplicado) */}
            <Route path="/servicos" element={<Navigate to="/profissionais" replace />} />

            {/* ── Rotas Protegidas ─────────────────────────────────── */}
            <Route path="/dashboard"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            <Route path="/nova-analise"
              element={<ProtectedRoute><NovaAnalise /></ProtectedRoute>} />

            <Route path="/analise/:id"
              element={<ProtectedRoute><AnaliseResultado /></ProtectedRoute>} />
              

            <Route path="/notas-fiscais"
              element={<ProtectedRoute><NotasFiscais /></ProtectedRoute>} />

            <Route path="/perfil"
              element={<ProtectedRoute><Perfil /></ProtectedRoute>} />

            <Route path="/cadastrar-profissional"
              element={<ProtectedRoute><CadastrarProfissional /></ProtectedRoute>} />

            {/* ✅ Painel do lojista agora protegido (apenas CNPJ) */}
            <Route path="/painel-loja"
              element={<ProtectedRoute><PainelLojista /></ProtectedRoute>} />

            {/* Gestão de anúncios avulsos (Pessoa Física / CPF) */}
            <Route path="/meus-anuncios"
              element={<ProtectedRoute><MeusAnuncios /></ProtectedRoute>} />

            {/* ── Rotas Admin ──────────────────────────────────────── */}
            

              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<VisaoGeral />} /> 
              <Route path="usuarios" element={<UsuariosList />} />
              <Route path="lojas" element={<LojasPendentes />} /> {/* Moderação de lojas */}
              <Route path="destaques" element={<Destaques />} /> {/* Gerenciamento de destaques */}
              <Route path="sinapi" element={<SinapiPage />} /> {/* Nova tela filha */}
              <Route path="logs-ia" element={<LogsIA />} /> {/* <-- ADICIONE AQUI */}
              <Route path="config" element={<Configuracoes />} /> {/* <-- NOVA ROTA AQUI */}
            </Route>


            {/* ── Fallback 404 ─────────────────────────────────────── */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;