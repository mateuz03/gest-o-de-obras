import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

const mockUseAdminRole = vi.fn();

vi.mock("@/hooks/useAdminRole", () => ({
  useAdminRole: (...args: unknown[]) => mockUseAdminRole(...args),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

import { DashboardUserMenu } from "@/components/dashboard/DashboardUserMenu";

describe("DashboardUserMenu", () => {
  beforeEach(() => {
    mockUseAdminRole.mockReset();
  });

  it("does not render the admin entry for regular users", () => {
    mockUseAdminRole.mockReturnValue({
      isAdmin: false,
      isAdminLoading: false,
    });

    render(
      <MemoryRouter>
        <DashboardUserMenu
          email="contato@obra.link"
          userId="user-1"
          onSignOut={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Minha central/i)).toBeInTheDocument();
    expect(screen.getByText(/Meu perfil/i)).toBeInTheDocument();
    expect(screen.queryByText(/Painel Admin/i)).not.toBeInTheDocument();
  });

  it("renders the admin entry only when the role check confirms admin", () => {
    mockUseAdminRole.mockReturnValue({
      isAdmin: true,
      isAdminLoading: false,
    });

    render(
      <MemoryRouter>
        <DashboardUserMenu
          email="admin@obra.link"
          userId="admin-1"
          onSignOut={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Minha central/i)).toBeInTheDocument();
    expect(screen.getByText(/Painel Admin/i)).toBeInTheDocument();
  });
});
