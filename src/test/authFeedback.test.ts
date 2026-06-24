import { describe, expect, it } from "vitest";

import { getFriendlyAuthError } from "@/lib/authFeedback";

describe("auth feedback", () => {
  it("maps login rate limits to a clear message", () => {
    expect(
      getFriendlyAuthError(
        { code: "RATE_LIMIT_EXCEEDED", message: "Muitas tentativas. Aguarde alguns minutos." },
        "login",
      ),
    ).toMatch(/Muitas tentativas de login/i);
  });

  it("keeps invalid credentials generic", () => {
    expect(
      getFriendlyAuthError({ code: "INVALID_CREDENTIALS", message: "invalid login credentials" }, "login"),
    ).toMatch(/E-mail ou senha invalidos/i);
  });
});
