import { Link, useLocation } from "react-router-dom";
import { Box, Home, Menu, ShieldCheck, User } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { GlobalUserMenu } from "@/components/shell/GlobalUserMenu";
import { DesktopSiteMenuTabs, MobileSiteMenuTabs } from "@/components/shell/SiteMenuTabs";

export function GlobalHeader() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user, accountType, signOut } = useAuth();
  const { isAdmin, isAdminLoading } = useAdminRole(user?.id);

  const accountLabel = accountType === "CNPJ" ? "Conta PJ" : "Conta PF";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:gap-10">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Box className="h-6 w-6 text-emerald-600" />
            <span>Obra Link</span>
          </Link>

          <DesktopSiteMenuTabs />
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <GlobalUserMenu
              accountLabel={accountLabel}
              email={user.email}
              isAdmin={isAdmin}
              isAdminLoading={isAdminLoading}
              onSignOut={signOut}
            />
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                to="/auth"
                className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600"
              >
                Entrar
              </Link>
              <Button asChild className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700">
                <Link to="/solicitar-acesso">Solicitar Acesso Imediato</Link>
              </Button>
            </div>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-slate-700 hover:bg-slate-100 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu global</span>
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[88vw] max-w-sm">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>
                  Navegue entre soluções, conteúdo e páginas institucionais.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <MobileSiteMenuTabs closeOnSelect />

                  {user && !isAdminLoading && isAdmin ? (
                    <div className="space-y-2">
                      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Administração
                      </p>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                        <SheetClose asChild>
                          <Link
                            to="/admin"
                            replace={pathname.startsWith("/admin")}
                            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                              pathname.startsWith("/admin")
                                ? "bg-white text-emerald-700 shadow-sm"
                                : "text-slate-700 hover:bg-white hover:text-emerald-600"
                            }`}
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Painel Admin
                          </Link>
                        </SheetClose>
                      </div>
                    </div>
                  ) : null}
                </div>

                <Separator />

                {user ? (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{user.email}</p>
                      <p className="text-xs text-slate-500">
                        {!isAdminLoading && isAdmin ? "Administrador" : accountLabel}
                      </p>
                    </div>

                    <SheetClose asChild>
                      <Link
                        to="/inicio"
                        replace={pathname === "/inicio"}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
                      >
                        <Home className="h-4 w-4" />
                        Minha central
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link
                        to="/perfil"
                        replace={pathname.startsWith("/perfil")}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
                      >
                        <User className="h-4 w-4" />
                        Meu perfil
                      </Link>
                    </SheetClose>

                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-xl border-slate-200"
                      onClick={() => {
                        void signOut();
                      }}
                    >
                      Sair
                    </Button>
                  </div>
                ) : (
                  <SheetClose asChild>
                    <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                      <Link to="/auth">Entrar / Criar Conta</Link>
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
