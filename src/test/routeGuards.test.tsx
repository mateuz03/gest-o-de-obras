import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ── Mock do contexto de autenticação ──────────────────────────────────────
const mockAuth = vi.fn();
vi.mock("@/contexts/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/AuthContext")>();
  return { ...actual, useAuth: () => mockAuth() };
});

import { ProtectedRoute } from "@/components/ProtectedRoute";

// Sentinela: representa QUALQUER árvore de tela privada. Se ela for renderizada
// sem usuário autenticado, houve vazamento de dados no client-side.
const PRIVATE_TEXT = "CONTEUDO-PRIVADO-SECRETO";
const PrivateScreen = vi.fn(() => <div>{PRIVATE_TEXT}</div>);

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PrivateScreen />
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div>Tela de Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Route Guards — isolamento de telas privadas", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    PrivateScreen.mockClear();
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it("NÃO renderiza a árvore privada quando isAuthenticated é falso", () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    renderProtected();

    // Nenhum dado privado pode vazar para o DOM.
    expect(screen.queryByText(PRIVATE_TEXT)).not.toBeInTheDocument();
    // O componente privado nem chega a ser montado/executado.
    expect(PrivateScreen).not.toHaveBeenCalled();
    // O visitante é levado ao login.
    expect(screen.getByText("Tela de Login")).toBeInTheDocument();
  });

  it("mostra o estado de 'Checking Auth' e bloqueia a renderização enquanto carrega", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    renderProtected();

    expect(screen.queryByText(PRIVATE_TEXT)).not.toBeInTheDocument();
    expect(PrivateScreen).not.toHaveBeenCalled();
    // Ainda não redirecionou (status real não resolvido).
    expect(screen.queryByText("Tela de Login")).not.toBeInTheDocument();
  });

  it("persiste a rota de intenção para redirecionamento pós-login", () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    renderProtected();

    expect(sessionStorage.getItem("obralink:intended-route")).toBe("/dashboard");
  });

  it("renderiza a árvore privada apenas quando autenticado", () => {
    mockAuth.mockReturnValue({ user: { id: "u1" }, loading: false });
    renderProtected();

    expect(screen.getByText(PRIVATE_TEXT)).toBeInTheDocument();
    expect(PrivateScreen).toHaveBeenCalled();
  });
});

// ── Guard condicional do App (Soluções Internas) ──────────────────────────
import RecursoBloqueado from "@/pages/RecursoBloqueado";

describe("Guard condicional — Soluções Internas", () => {
  beforeEach(() => {
    PrivateScreen.mockClear();
  });

  it("renderiza a Tela de Bloqueio (não a privada) para visitantes", () => {
    const user = null;
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={user ? <PrivateScreen /> : <RecursoBloqueado slug="gestao-de-projetos" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(PrivateScreen).not.toHaveBeenCalled();
    expect(screen.queryByText(PRIVATE_TEXT)).not.toBeInTheDocument();
    // A tela de bloqueio mostra o marketing do recurso.
    expect(screen.getByText(/Gestão de Projetos/i)).toBeInTheDocument();
  });
});
