import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  BookOpen,
  Box,
  Database,
  Settings,
  ShieldCheck,
  Star,
  Store,
  TerminalSquare,
  Users,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";

const NAV_ITEMS = [
  { to: "/admin", icon: Box, label: "Visao Geral", exact: true },
  { to: "/admin/usuarios", icon: Users, label: "Usuarios & Assinaturas" },
  { to: "/admin/lojas", icon: Store, label: "Aprovacao de Lojas" },
  { to: "/admin/destaques", icon: Star, label: "Destaques & Moderacao" },
  { to: "/admin/blog", icon: BookOpen, label: "Gestao do Blog" },
  { to: "/admin/sinapi", icon: Database, label: "Base SINAPI" },
  { to: "/admin/logs-ia", icon: TerminalSquare, label: "Logs, IA & Auditoria" },
  { to: "/admin/config", icon: Settings, label: "Configuracoes Operacionais" },
];

export default function AdminLayout() {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth();
  const { isAdmin, isAdminLoading: adminLoading } = useAdminRole(user?.id);

  if (adminLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (user && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 font-sans text-slate-900">
      <aside className="sticky top-16 z-10 flex min-h-[calc(100vh-4rem)] w-64 flex-col bg-[#0f172a] text-slate-300">
        <div className="flex items-center gap-3 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-lg">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">Obra Link</h1>
            <p className="text-sm font-medium text-emerald-500">Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => {
            const isActive = exact ? path === to : path.startsWith(to);

            return (
              <Link
                key={to}
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="m-4 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">Operacao</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Monitoramento de usuarios, moderacao, faturamento e automacoes de IA.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
