export type AuthAction = "login" | "signup";
export type SignupAccountHint = "PF" | "PJ";

function readErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const candidate = (error as { code?: unknown }).code;
  return typeof candidate === "string" ? candidate.toLowerCase() : "";
}

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const candidate = (error as { message?: unknown }).message;
  return typeof candidate === "string" ? candidate.toLowerCase() : "";
}

export function getFriendlyAuthError(error: unknown, action: AuthAction): string {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);

  if (action === "login") {
    if (code === "rate_limit_exceeded" || /muitas tentativas|aguarde alguns minutos/i.test(message)) {
      return "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.";
    }

    if (
      code === "invalid_credentials"
      || /invalid login credentials|email not confirmed|invalid credentials/i.test(message)
    ) {
      return "E-mail ou senha invalidos. Revise seus dados e tente novamente.";
    }

    return "Nao foi possivel entrar agora. Tente novamente em instantes.";
  }

  if (
    code === "user_already_exists"
    || /already registered|user already registered|already exists/i.test(message)
  ) {
    return "Ja existe uma conta com este e-mail.";
  }

  if (
    code === "weak_password"
    || /password should be at least|weak password/i.test(message)
  ) {
    return "Sua senha precisa ter no minimo 8 caracteres.";
  }

  if (/invalid email/i.test(message)) {
    return "Revise o e-mail informado antes de continuar.";
  }

  return "Nao foi possivel criar sua conta agora. Tente novamente em instantes.";
}

export function parseSignupAccountHint(value?: string | null): SignupAccountHint | null {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "PF" || normalized === "CPF") return "PF";
  if (normalized === "PJ" || normalized === "CNPJ") return "PJ";
  return null;
}
