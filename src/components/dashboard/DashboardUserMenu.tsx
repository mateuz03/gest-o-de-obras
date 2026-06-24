import { Link } from "react-router-dom";
import { ChevronDown, Home, LogOut, ShieldCheck, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminRole } from "@/hooks/useAdminRole";

interface DashboardUserMenuProps {
  email?: string | null;
  userId?: string;
  onSignOut: () => Promise<void> | void;
}

function getUserInitials(email?: string | null) {
  const base = email?.trim() || "U";
  return base.slice(0, 2).toUpperCase();
}

export function DashboardUserMenu({
  email,
  userId,
  onSignOut,
}: DashboardUserMenuProps) {
  const { isAdmin, isAdminLoading } = useAdminRole(userId);
  const metaLabel = isAdminLoading
    ? "Validando acesso"
    : isAdmin
      ? "Administrador"
      : "Conta da plataforma";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 rounded-full px-2 text-white hover:bg-white/10 hover:text-white"
          aria-label="Abrir menu da conta"
        >
          <Avatar className="h-8 w-8 border border-white/15">
            <AvatarFallback className="bg-white/10 text-xs font-semibold text-white">
              {getUserInitials(email)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 text-left sm:block">
            <p className="truncate text-sm font-medium leading-tight text-white">
              {email || "Minha conta"}
            </p>
            <p className="truncate text-xs text-white/60">{metaLabel}</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-white/70 sm:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="font-medium">Minha conta</p>
          <p className="break-all text-xs font-normal text-muted-foreground">
            {email || "Sem e-mail"}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/inicio" className="flex w-full items-center gap-2">
            <Home className="h-4 w-4" />
            Minha central
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/perfil" className="flex w-full items-center gap-2">
            <User className="h-4 w-4" />
            Meu perfil
          </Link>
        </DropdownMenuItem>

        {!isAdminLoading && isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="flex w-full items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Painel Admin
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => {
            void onSignOut();
          }}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
