import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, ChevronDown, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, accountType } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // "Crie sua Loja" é exclusivo de CNPJ. Visível para visitantes e contas CNPJ.
  const podeCriarLoja = !user || accountType === "CNPJ";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
          <Box className="h-6 w-6 text-emerald-600" />
          <span>Obra Link</span>
        </Link>

        {/* MENU DESKTOP */}
        <div className="hidden md:flex items-center gap-8">
          
          {/* Dropdown 1: Soluções */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-600 py-2 transition-colors">
              Soluções <ChevronDown className="w-4 h-4 transition-transform group-hover:-rotate-180" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-slate-100 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col p-2">
              <Link to={user ? "/dashboard" : "/recurso/gestao-de-projetos"} className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors">Gestão de Projetos</Link>
              <Link to="/marketplace" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors">Marketplace</Link>
              <Link to="/profissionais" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors">Prestar Serviços</Link>
              {podeCriarLoja && <Link to="/seja-parceiro" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors">Crie sua Loja</Link>}
            </div>
          </div>

          {/* Dropdown 2: Conteúdo */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-600 py-2 transition-colors">
              Conteúdo <ChevronDown className="w-4 h-4 transition-transform group-hover:-rotate-180" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-slate-100 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col p-2">
              <Link to="/blog" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors">Blog</Link>
              <Link to="/documentos" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors">Documentos e dicas</Link>
            </div>
          </div>

          {/* Dropdown 3: Obra Link */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-600 py-2 transition-colors">
              Obra Link <ChevronDown className="w-4 h-4 transition-transform group-hover:-rotate-180" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-slate-100 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col p-2">
              <Link to="/sobre-nos" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors">Quem somos</Link>
              <Link to="/suporte" className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors">Precisa de suporte?</Link>
            </div>
          </div>

        </div>

        {/* BOTÃO CTA DIREITA */}
        <div className="hidden md:block">
          <Button 
            onClick={() => navigate(user ? "/dashboard" : "/auth")} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {user ? "Meu Painel" : "Entrar / Cadastrar"} <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {/* MENU HAMBÚRGUER (MOBILE) */}
        <button 
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ─── DROPDOWN MOBILE (Abre ao clicar no hambúrguer) ─── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white p-4 space-y-6 shadow-lg absolute w-full">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Soluções</h4>
            <div className="flex flex-col gap-3 pl-2">
              <Link to={user ? "/dashboard" : "/recurso/gestao-de-projetos"} className="text-sm font-medium text-slate-700">Gestão de Projetos</Link>
              <Link to="/marketplace" className="text-sm font-medium text-slate-700">Marketplace</Link>
              <Link to="/profissionais" className="text-sm font-medium text-slate-700">Prestar Serviços</Link>
              {podeCriarLoja && <Link to="/seja-parceiro" className="text-sm font-medium text-slate-700">Crie sua Loja</Link>}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Conteúdo</h4>
            <div className="flex flex-col gap-3 pl-2">
              <Link to="/blog" className="text-sm font-medium text-slate-700">Blog</Link>
              <Link to="/documentos" className="text-sm font-medium text-slate-700">Documentos e dicas</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Obra Link</h4>
            <div className="flex flex-col gap-3 pl-2">
              <Link to="/sobre-nos" className="text-sm font-medium text-slate-700">Quem somos</Link>
              <Link to="/suporte" className="text-sm font-medium text-slate-700">Precisa de suporte?</Link>
            </div>
          </div>
          <Button 
            onClick={() => navigate(user ? "/dashboard" : "/auth")} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {user ? "Meu Painel" : "Entrar / Cadastrar"}
          </Button>
        </div>
      )}
    </nav>
  );
}