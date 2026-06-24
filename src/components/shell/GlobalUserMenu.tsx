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

interface GlobalUserMenuProps {
  accountLabel: string;
  email?: string | null;
  isAdmin: boolean;
  isAdminLoading: boolean;
  onSignOut: () => Promise<void> | void;
}

function getUserInitials(email?: string | null) {
  const base = email?.trim() || "U";
  return base.slice(0, 2).toUpperCase();
}

export function GlobalUserMenu({
  accountLabel,
  email,
  isAdmin,
  isAdminLoading,
  onSignOut,
}: GlobalUserMenuProps) {
  const metaLabel = isAdminLoading
    ? "Validando acesso"
    : isAdmin
      ? "Administrador"
      : accountLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="hidden h-10 items-center gap-2 rounded-full border border-slate-200 px-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 md:inline-flex"
          aria-label="Abrir menu da conta"
        >
          <Avatar className="h-8 w-8 border border-slate-200">
            <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
              {getUserInitials(email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-left">
            <p className="max-w-[180px] truncate text-sm font-medium leading-tight">
              {email || "Minha conta"}
            </p>
            <p className="max-w-[180px] truncate text-xs text-slate-500">{metaLabel}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
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
