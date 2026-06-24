import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockAuth = vi.fn();

vi.mock("@/contexts/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/AuthContext")>();
  return { ...actual, useAuth: () => mockAuth() };
});

import { SolutionEntryRoute } from "@/components/SolutionEntryRoute";

describe("Solution entry routing", () => {
  beforeEach(() => {
    mockAuth.mockReset();

    try {
      sessionStorage.clear();
    } catch {
      // ignore storage errors
    }
  });

  it("shows the public conversion page for landing solutions and stores the intended destination", async () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={["/solucoes/marketplace"]}>
        <Routes>
          <Route path="/solucoes/:slug" element={<SolutionEntryRoute mode="landing" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /Liberar acesso ao marketplace/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(sessionStorage.getItem("obralink:intended-route")).toBe("/marketplace");
    });
  });

  it("intercepts private solution routes for visitors and stores the private destination", async () => {
    mockAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={["/recurso/gestao-de-projetos"]}>
        <Routes>
          <Route path="/recurso/:slug" element={<SolutionEntryRoute mode="private" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /obras em um s[oó] painel/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(sessionStorage.getItem("obralink:intended-route")).toBe("/dashboard");
    });
  });

  it("redirects authenticated users from landing solution pages straight into the unlocked tool", async () => {
    mockAuth.mockReturnValue({
      user: { id: "user-1" },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={["/solucoes/marketplace"]}>
        <Routes>
          <Route path="/solucoes/:slug" element={<SolutionEntryRoute mode="landing" />} />
          <Route path="/marketplace" element={<div>Marketplace liberado</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Marketplace liberado")).toBeInTheDocument();
  });

  it("redirects authenticated users from blocked private entries to the real private route", async () => {
    mockAuth.mockReturnValue({
      user: { id: "user-1" },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={["/recurso/gestao-de-projetos"]}>
        <Routes>
          <Route path="/recurso/:slug" element={<SolutionEntryRoute mode="private" />} />
          <Route path="/dashboard" element={<div>Dashboard privada</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Dashboard privada")).toBeInTheDocument();
  });
});
