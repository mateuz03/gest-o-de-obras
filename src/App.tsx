import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NovaAnalise from "./pages/NovaAnalise";
import AnaliseResultado from "./pages/AnaliseResultado";
import SinapiUpload from "./pages/SinapiUpload";
import NotFound from "./pages/NotFound";
import ShareAnalise from "./pages/ShareAnalise";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/share/:analysisId" element={<ShareAnalise />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/nova-analise" element={<ProtectedRoute><NovaAnalise /></ProtectedRoute>} />
            <Route path="/analise/:id" element={<ProtectedRoute><AnaliseResultado /></ProtectedRoute>} />
            <Route path="/sinapi" element={<ProtectedRoute><SinapiUpload /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
