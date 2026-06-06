/**
 * Redirecionamento pós-login (deep link).
 *
 * Quando um visitante é interceptado tentando acessar uma rota privada,
 * salvamos a URL de intenção. Após o login bem-sucedido, lemos esse valor
 * e enviamos o usuário direto para onde ele queria ir.
 *
 * Usamos `sessionStorage` (some ao fechar a aba) + um parâmetro `redirect`
 * na URL de /auth, garantindo que funcione mesmo após recarregar a página.
 */

const KEY = "obralink:intended-route";
const FALLBACK = "/dashboard";

/** Rotas que nunca devem ser usadas como destino pós-login. */
const BLOCKLIST = ["/auth", "/esqueci-senha", "/redefinir-senha"];

function isSafeInternalPath(path?: string | null): path is string {
  if (!path) return false;
  // Apenas caminhos internos (evita open-redirect para domínios externos).
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  return !BLOCKLIST.some((b) => path === b || path.startsWith(`${b}?`) || path.startsWith(`${b}/`));
}

/** Guarda a rota de intenção (path + query + hash). */
export function saveIntendedRoute(path: string) {
  if (!isSafeInternalPath(path)) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* ambiente sem storage — ignora */
  }
}

/** Lê e remove a rota de intenção, com prioridade para o parâmetro de URL. */
export function consumeIntendedRoute(fromUrlParam?: string | null): string {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }

  const candidate = isSafeInternalPath(fromUrlParam)
    ? fromUrlParam
    : isSafeInternalPath(stored)
      ? stored
      : null;

  return candidate ?? FALLBACK;
}

/** Monta a URL de /auth carregando o destino de intenção. */
export function authUrlWithRedirect(intended: string, tab?: "signup" | "login"): string {
  const params = new URLSearchParams();
  if (tab) params.set("tab", tab);
  if (isSafeInternalPath(intended)) params.set("redirect", intended);
  const qs = params.toString();
  return qs ? `/auth?${qs}` : "/auth";
}
