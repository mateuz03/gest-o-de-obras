import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockAuth = vi.fn();

vi.mock("@/contexts/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/AuthContext")>();
  return { ...actual, useAuth: () => mockAuth() };
});

import { PublicOnlyRoute } from "@/components/PublicOnlyRoute";
import { consumeIntendedRoute, saveIntendedRoute } from "@/lib/intendedRoute";

describe("Navigation hub fallbacks", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    try {
      sessionStorage.clear();
    } catch {
      // ignore storage errors
    }
  });

  it("redirects authenticated users away from public-only pages to /inicio", () => {
    mockAuth.mockReturnValue({
      user: { id: "u1" },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route
            path="/auth"
            element={(
              <PublicOnlyRoute>
                <div>Tela publica</div>
              </PublicOnlyRoute>
            )}
          />
          <Route path="/inicio" element={<div>Central privada</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Central privada")).toBeInTheDocument();
    expect(screen.queryByText("Tela publica")).not.toBeInTheDocument();
  });

  it("uses /inicio as the fallback when no intended route exists", () => {
    expect(consumeIntendedRoute()).toBe("/inicio");
  });

  it("still honors an intended private route when one was stored", () => {
    saveIntendedRoute("/dashboard");

    expect(consumeIntendedRoute()).toBe("/dashboard");
  });
});
