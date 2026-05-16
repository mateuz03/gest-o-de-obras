import { Link, Outlet, useLocation } from "react-router-dom";
import { 
  Users, 
  Database, 
  Settings, 
  ShieldCheck,
  TerminalSquare,
  Activity,
  Box
} from "lucide-react";

export default function AdminLayout() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-900">
      
      {/* ─── SIDEBAR (MENU LATERAL FIXO) ─── */}
      <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col min-h-screen z-10 sticky top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">Obra Link</h1>
            <p className="text-sm font-medium text-emerald-500">Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {/* Note o uso do <Link> para trocar de tela sem recarregar a página */}
          <Link to="/admin" className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${path === "/admin" ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}>
            <Box className="w-5 h-5" /> Visão Geral
          </Link>
          <Link to="/admin/usuarios" className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${path.includes("/admin/usuarios") ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}>
            <Users className="w-5 h-5" /> Usuários & Assinaturas
          </Link>
          
          {/* Botões provisórios sem link ainda */}
          <Link to="/admin/sinapi" className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${path.includes("/admin/sinapi") ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}>
  <Database className="w-5 h-5" /> Base de Dados (SINAPI)
</Link>
          {/* Menu de Logs de IA */}
          <Link to="/admin/logs-ia" className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${path.includes("/admin/logs-ia") ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}>
            <TerminalSquare className="w-5 h-5" /> Logs de IA
          </Link>

          {/* Menu de Configurações */}
          <Link to="/admin/config" className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${path.includes("/admin/config") ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"}`}>
            <Settings className="w-5 h-5" /> Configurações do Sistema
          </Link>
          
        </nav>

        <div className="p-4 m-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">Sistema operacional</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monitoramento interno de usuários, custos e automações IA.
          </p>
        </div>
      </aside>

      

      {/* ─── CONTEÚDO DINÂMICO (ONDE AS TELAS FILHAS APARECEM) ─── */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* O <Outlet /> pega a tela VisaoGeral ou UsuariosList e "injeta" aqui dentro */}
        <Outlet />
      </main>
    </div>
  );
}