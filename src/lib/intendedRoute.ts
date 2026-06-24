import type { SignupAccountHint } from "@/lib/authFeedback";

const KEY = "obralink:intended-route";
const FALLBACK = "/inicio";
const BLOCKLIST = ["/auth", "/esqueci-senha", "/redefinir-senha"];

function isSafeInternalPath(path?: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/") || path.startsWith("//")) return false;

  return !BLOCKLIST.some(
    (blockedPath) =>
      path === blockedPath
      || path.startsWith(`${blockedPath}?`)
      || path.startsWith(`${blockedPath}/`),
  );
}

export function saveIntendedRoute(path: string) {
  if (!isSafeInternalPath(path)) return;

  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Ignore storage failures in unsupported environments.
  }
}

export function consumeIntendedRoute(fromUrlParam?: string | null): string {
  let stored: string | null = null;

  try {
    stored = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    // Ignore storage failures in unsupported environments.
  }

  const candidate = isSafeInternalPath(fromUrlParam)
    ? fromUrlParam
    : isSafeInternalPath(stored)
      ? stored
      : null;

  return candidate ?? FALLBACK;
}

export function authUrlWithRedirect(
  intended: string,
  tab?: "signup" | "login",
  accountHint?: SignupAccountHint | null,
): string {
  const params = new URLSearchParams();

  if (tab) params.set("tab", tab);
  if (accountHint) params.set("account", accountHint.toLowerCase());
  if (isSafeInternalPath(intended)) params.set("redirect", intended);

  const qs = params.toString();
  return qs ? `/auth?${qs}` : "/auth";
}
