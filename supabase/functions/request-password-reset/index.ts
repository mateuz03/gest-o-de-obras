import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import {
  corsHeaders,
  createServiceRoleClient,
  getClientIp,
  getClientUserAgent,
  getRateLimitState,
  HttpError,
  json,
  logSecurityEvent,
  recordRateLimitAttempt,
  requireMethod,
  toErrorResponse,
} from "../_shared/security.ts";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  redirectTo: z.string().url().max(500).optional(),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function resolveSecurityContext(email: string, req: Request) {
  const ip = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const adminClient = createServiceRoleClient();
    const rateState = await getRateLimitState(adminClient, {
      action: "password_reset",
      identifier: email,
      ip,
      maxAttempts: MAX_ATTEMPTS,
      windowMs: WINDOW_MS,
    });

    return { adminClient, rateState, ip, userAgent };
  } catch (error) {
    console.warn(
      "[request-password-reset] security context unavailable, continuing without rate limit",
      error,
    );
    return { adminClient: null, rateState: null, ip, userAgent };
  }
}

function getAllowedOrigins(req: Request) {
  const origins = new Set<string>();
  const headerOrigin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const envOrigins = [
    Deno.env.get("SITE_URL"),
    Deno.env.get("APP_URL"),
    Deno.env.get("PUBLIC_APP_URL"),
  ].filter(Boolean) as string[];

  for (const value of [headerOrigin, ...envOrigins]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // ignore invalid origin
    }
  }

  if (referer) {
    try {
      origins.add(new URL(referer).origin);
    } catch {
      // ignore invalid referer
    }
  }

  return origins;
}

function resolveSafeRedirect(req: Request, redirectTo?: string) {
  if (!redirectTo) return undefined;

  const allowedOrigins = getAllowedOrigins(req);
  let parsed: URL;
  try {
    parsed = new URL(redirectTo);
  } catch {
    throw new HttpError(400, "URL de redirecionamento invalida.", "INVALID_REDIRECT");
  }

  if (!allowedOrigins.has(parsed.origin)) {
    throw new HttpError(400, "URL de redirecionamento nao autorizada.", "INVALID_REDIRECT");
  }

  return parsed.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    requireMethod(req, "POST");

    let parsedBody;
    try {
      parsedBody = BodySchema.safeParse(await req.json());
    } catch {
      throw new HttpError(400, "Corpo da requisicao invalido.", "INVALID_BODY");
    }

    if (!parsedBody.success) {
      throw new HttpError(400, "E-mail invalido.", "INVALID_EMAIL");
    }

    const email = parsedBody.data.email.toLowerCase();
    const redirectTo = resolveSafeRedirect(req, parsedBody.data.redirectTo);
    const { adminClient, rateState, ip, userAgent } = await resolveSecurityContext(email, req);

    if (adminClient && rateState && rateState.attemptCount >= MAX_ATTEMPTS) {
      await logSecurityEvent({
        source: "request-password-reset",
        type: "password_reset_rate_limited",
        severity: "warning",
        identifierHash: rateState.identifierHash,
        ipHash: rateState.ipHash,
        message: "Solicitacao de redefinicao bloqueada por excesso de tentativas.",
        metadata: {
          retryAfterSeconds: rateState.retryAfterSeconds,
        },
      });

      return json(
        {
          error: `Muitas tentativas. Por favor, aguarde ${Math.max(1, Math.ceil(rateState.retryAfterSeconds / 60))} minuto(s) antes de tentar novamente.`,
          code: "RATE_LIMIT_EXCEEDED",
          retryAfterSeconds: rateState.retryAfterSeconds,
        },
        429,
        { "Retry-After": rateState.retryAfterSeconds.toString() },
      );
    }

    if (adminClient && rateState) {
      await recordRateLimitAttempt(adminClient, {
        action: "password_reset",
        identifierHash: rateState.identifierHash,
        ipHash: rateState.ipHash,
        succeeded: true,
        userAgent,
      });
    }

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      await authClient.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
    } catch (error) {
      if (adminClient && rateState) {
        await logSecurityEvent({
          source: "request-password-reset",
          type: "password_reset_dispatch_warning",
          severity: "warning",
          identifierHash: rateState.identifierHash,
          ipHash: rateState.ipHash,
          message: "Falha ao despachar e-mail de redefinicao.",
          metadata: {
            detail: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    if (adminClient && rateState) {
      await logSecurityEvent({
        source: "request-password-reset",
        type: "password_reset_requested",
        severity: "info",
        identifierHash: rateState.identifierHash,
        ipHash: rateState.ipHash,
        message: "Solicitacao de redefinicao registrada.",
      });
    }

    return json({
      message: "Se o e-mail estiver cadastrado, voce recebera um link de recuperacao em instantes.",
    });
  } catch (error) {
    return await toErrorResponse(error, "Nao foi possivel processar a solicitacao.", {
      functionName: "request-password-reset",
      request: req,
      source: "edge",
    });
  }
});
