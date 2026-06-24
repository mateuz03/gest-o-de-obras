import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockAuth = vi.fn();
const mockUseAdminRole = vi.fn();
const mockUsePlatformFlags = vi.fn();

vi.mock("@/contexts/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/AuthContext")>();
  return { ...actual, useAuth: () => mockAuth() };
});

vi.mock("@/hooks/useAdminRole", () => ({
  useAdminRole: (...args: unknown[]) => mockUseAdminRole(...args),
}));

vi.mock("@/hooks/usePlatformFlags", () => ({
  usePlatformFlags: (...args: unknown[]) => mockUsePlatformFlags(...args),
}));

import { ProtectedRoute } from "@/components/ProtectedRoute";
import RecursoBloqueado from "@/pages/RecursoBloqueado";

const PRIVATE_TEXT = "CONTEUDO-PRIVADO-SECRETO";
const PrivateScreen = vi.fn(() => <div>{PRIVATE_TEXT}</div>);

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <PrivateScreen />
            </ProtectedRoute>
          )}
        />
        <Route path="/auth" element={<div>Tela de Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Route guards", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockUseAdminRole.mockReset();
    mockUsePlatformFlags.mockReset();
    PrivateScreen.mockClear();

    try {
      sessionStorage.clear();
    } catch {
      // ignore storage errors
    }

    mockUseAdminRole.mockReturnValue({
      isAdmin: false,
      isAdminLoading: false,
    });

    mockUsePlatformFlags.mockReturnValue({
      flags: {
        maintenance_mode: false,
        maintenance_message: "",
      },
      loading: false,
    });
  });

  it("does not render the private tree when the user is not authenticated", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      accountStatus: "active",
      signOut: vi.fn(),
    });

    renderProtected();

    expect(screen.queryByText(PRIVATE_TEXT)).not.toBeInTheDocument();
    expect(PrivateScreen).not.toHaveBeenCalled();
    expect(screen.getByText("Tela de Login")).toBeInTheDocument();
  });

  it("keeps the private tree blocked while auth is still loading", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: true,
      accountStatus: "active",
      signOut: vi.fn(),
    });

    renderProtected();

    expect(screen.queryByText(PRIVATE_TEXT)).not.toBeInTheDocument();
    expect(PrivateScreen).not.toHaveBeenCalled();
    expect(screen.queryByText("Tela de Login")).not.toBeInTheDocument();
  });

  it("persists the intended route for post-login redirect", () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
      accountStatus: "active",
      signOut: vi.fn(),
    });

    renderProtected();

    expect(sessionStorage.getItem("obralink:intended-route")).toBe("/dashboard");
  });

  it("renders the private tree only when the user is authenticated", () => {
    mockAuth.mockReturnValue({
      user: { id: "u1" },
      loading: false,
      accountStatus: "active",
      signOut: vi.fn(),
    });

    renderProtected();

    expect(screen.getByText(PRIVATE_TEXT)).toBeInTheDocument();
    expect(PrivateScreen).toHaveBeenCalled();
  });
});

describe("Solution intercept", () => {
  beforeEach(() => {
    PrivateScreen.mockClear();
  });

  it("renders the blocked marketing screen for visitors instead of the private tree", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={<RecursoBloqueado slug="gestao-de-projetos" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(PrivateScreen).not.toHaveBeenCalled();
    expect(screen.queryByText(PRIVATE_TEXT)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Todos os seus orçamentos e obras em um só painel/i }),
    ).toBeInTheDocument();
  });
});
