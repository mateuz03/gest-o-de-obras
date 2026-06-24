import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

const mockAuth = vi.fn();

vi.mock("@/contexts/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/AuthContext")>();
  return { ...actual, useAuth: () => mockAuth() };
});

vi.mock("@/components/ui/sheet", () => ({
  SheetClose: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { MobileSiteMenuTabs } from "@/components/shell/SiteMenuTabs";

function renderMenu(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <MobileSiteMenuTabs />
    </MemoryRouter>,
  );
}

describe("Site menu navigation", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("keeps public pages visible for visitors and routes solution links through intercept pages", () => {
    mockAuth.mockReturnValue({ user: null });

    renderMenu("/");

    expect(screen.getByRole("link", { name: /Blog/i })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("link", { name: /Documentos e Dicas/i })).toHaveAttribute("href", "/documentos");
    expect(screen.getByRole("link", { name: /Quem Somos/i })).toHaveAttribute("href", "/sobre-nos");
    expect(screen.getByRole("link", { name: /Precisa de Suporte/i })).toHaveAttribute("href", "/suporte");
    expect(screen.getByRole("link", { name: /Termos de Uso/i })).toHaveAttribute("href", "/termos-de-uso");

    expect(screen.getByRole("link", { name: /Gest[aã]o de Projetos/i })).toHaveAttribute(
      "href",
      "/recurso/gestao-de-projetos",
    );
    expect(screen.getByRole("link", { name: /^Marketplace$/i })).toHaveAttribute(
      "href",
      "/solucoes/marketplace",
    );
    expect(screen.getByRole("link", { name: /Prestar Serv/i })).toHaveAttribute(
      "href",
      "/solucoes/prestar-servico",
    );
    expect(screen.getByRole("link", { name: /Crie sua Loja/i })).toHaveAttribute(
      "href",
      "/solucoes/criar-loja",
    );
  });

  it("keeps public pages available after login and unlocks direct private destinations", () => {
    mockAuth.mockReturnValue({ user: { id: "user-1" } });

    renderMenu("/inicio");

    expect(screen.getByRole("link", { name: /Blog/i })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("link", { name: /Precisa de Suporte/i })).toHaveAttribute("href", "/suporte");
    expect(screen.getByRole("link", { name: /Termos de Uso/i })).toHaveAttribute("href", "/termos-de-uso");

    expect(screen.getByRole("link", { name: /Gest[aã]o de Projetos/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /^Marketplace$/i })).toHaveAttribute(
      "href",
      "/marketplace",
    );
    expect(screen.getByRole("link", { name: /Prestar Serv/i })).toHaveAttribute(
      "href",
      "/cadastrar-profissional",
    );
    expect(screen.getByRole("link", { name: /Crie sua Loja/i })).toHaveAttribute(
      "href",
      "/painel-loja",
    );
  });
});
