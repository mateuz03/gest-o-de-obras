import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { MemoryRouter } from "react-router-dom";

const mockAuth = vi.fn();

vi.mock("@/contexts/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/AuthContext")>();
  return { ...actual, useAuth: () => mockAuth() };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import Auth from "@/pages/Auth";
import EsqueciSenha from "@/pages/EsqueciSenha";
import { authUrlWithRedirect, saveIntendedRoute } from "@/lib/intendedRoute";

describe("Auth conversion flow", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    try {
      sessionStorage.clear();
    } catch {
      // ignore storage errors
    }
    mockAuth.mockReturnValue({
      user: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
    });
  });

  it("preselects PJ from the query string and preserves CNPJ data when toggling account type", async () => {
    render(
      <MemoryRouter initialEntries={["/auth?tab=signup&account=pj"]}>
        <Auth />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Razao social/i)).toBeInTheDocument();

    const cnpjInput = screen.getByLabelText(/CNPJ/i);
    fireEvent.change(cnpjInput, { target: { value: "12345678000190" } });
    expect(cnpjInput).toHaveValue("12.345.678/0001-90");

    fireEvent.click(screen.getByRole("button", { name: /Pessoa Fisica/i }));
    expect(await screen.findByLabelText(/Nome completo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Pessoa Juridica/i }));
    expect(await screen.findByLabelText(/CNPJ/i)).toHaveValue("12.345.678/0001-90");
  });

  it("keeps the login CTA disabled until the form becomes valid and exposes the password toggle", () => {
    render(
      <MemoryRouter initialEntries={["/auth?tab=login"]}>
        <Auth />
      </MemoryRouter>,
    );

    const loginPanel = screen.getByRole("tabpanel");
    const submitButton = within(loginPanel).getByRole("button", { name: /^Entrar$/ });
    const emailInput = within(loginPanel).getByLabelText(/E-mail/i);
    const passwordInput = within(loginPanel).getByPlaceholderText(/Digite sua senha/i);

    expect(submitButton).toBeDisabled();
    expect(within(loginPanel).getByRole("button", { name: /Mostrar senha/i })).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: "email-invalido" } });
    fireEvent.change(passwordInput, { target: { value: "12345678" } });
    expect(submitButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "contato@empresa.com" } });
    expect(submitButton).toBeEnabled();
  });

  it("adds the signup account hint to auth redirect URLs", () => {
    const url = authUrlWithRedirect("/painel-loja", "signup", "PJ");

    expect(url).toContain("tab=signup");
    expect(url).toContain("account=pj");
    expect(url).toContain("redirect=%2Fpainel-loja");
  });

  it("redirects an already authenticated user to the explicit redirect target before any stored fallback", async () => {
    saveIntendedRoute("/dashboard");
    mockAuth.mockReturnValue({
      user: { id: "user-1" },
      signIn: vi.fn(),
      signUp: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/auth?redirect=/marketplace"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/marketplace" element={<div>Marketplace privada</div>} />
          <Route path="/dashboard" element={<div>Dashboard privada</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Marketplace privada")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard privada")).not.toBeInTheDocument();
  });

  it("redirects an already authenticated user to /inicio when no redirect context exists", async () => {
    mockAuth.mockReturnValue({
      user: { id: "user-1" },
      signIn: vi.fn(),
      signUp: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/inicio" element={<div>Central privada</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Central privada")).toBeInTheDocument();
  });
});

describe("Forgot password flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the success message generic even when the backend fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("internal error"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <MemoryRouter initialEntries={["/esqueci-senha"]}>
        <EsqueciSenha />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/E-mail cadastrado/i), {
      target: { value: "contato@empresa.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Enviar instrucoes/i }));

    expect(await screen.findByText(/Verifique seu e-mail/i)).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
