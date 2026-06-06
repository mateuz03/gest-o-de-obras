import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  Users,
  Database,
  Settings,
  ShieldCheck,
  TerminalSquare,
  Activity,
  Store,
  Box,
  BookOpen
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// 4. Lista de itens de navegação extraída para facilitar manutenção
const NAV_ITEMS = [
  { to: "/admin", icon: Box, label: "Visão Geral", exact: true },
  { to: "/admin/usuarios", icon: Users, label: "Usuários & Assinaturas" },
  { to: "/admin/lojas", icon: Store, label: "Aprovação de Lojas" },
  { to: "/admin/sinapi", icon: Database, label: "Base de Dados (SINAPI)" },
  { to: "/admin/logs-ia", icon: TerminalSquare, label: "Logs de IA" },
  { to: "/admin/config", icon: Settings, label: "Configurações do Sistema" },
  { to: "/admin/blog", icon: BookOpen, label: "Gestão do Blog" },
];

export default function AdminLayout() {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth(); // Assumindo que seu contexto expõe o usuário atual

  // 5. Guard de role de admin corrigido
  // Verifica se a role está no metadata ou usa o seu email como "Chave Mestra"
  const isAdmin = user?.user_metadata?.role === "admin" || user?.email === "mateusdiasteus03@gmail.com";

  if (user && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

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
          {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => {
            // 2. Troca do path.includes() por path.startsWith() (e path === to para a raiz)
            const isActive = exact ? path === to : path.startsWith(to);

            return (
              <Link
                key={to}
                to={to}
                // 3. Adição do aria-current para acessibilidade
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" /> {label}
              </Link>
            );
          })}
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
        {/* O <Outlet /> pega a tela filha e "injeta" aqui dentro */}
        <Outlet />
      </main>
    </div>
  );
}