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
const MAX_ATTEMPTS = 5;

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function isInvalidCredentialsError(message: string) {
  return /invalid login credentials|invalid credentials|email not confirmed/i.test(message);
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
      throw new HttpError(400, "Credenciais invalidas.", "INVALID_CREDENTIALS");
    }

    const email = parsedBody.data.email.toLowerCase();
    const password = parsedBody.data.password;
    const ip = getClientIp(req);
    const userAgent = getClientUserAgent(req);
    const adminClient = createServiceRoleClient();
    const rateState = await getRateLimitState(adminClient, {
      action: "login",
      identifier: email,
      ip,
      maxAttempts: MAX_ATTEMPTS,
      windowMs: WINDOW_MS,
    });

    if (rateState.attemptCount >= MAX_ATTEMPTS) {
      await logSecurityEvent({
        source: "auth-login",
        type: "auth_login_rate_limited",
        severity: "warning",
        identifierHash: rateState.identifierHash,
        ipHash: rateState.ipHash,
        message: "Login bloqueado temporariamente por excesso de tentativas.",
        metadata: {
          retryAfterSeconds: rateState.retryAfterSeconds,
        },
      });

      return json(
        {
          error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfterSeconds: rateState.retryAfterSeconds,
        },
        429,
        { "Retry-After": rateState.retryAfterSeconds.toString() },
      );
    }

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      await recordRateLimitAttempt(adminClient, {
        action: "login",
        identifierHash: rateState.identifierHash,
        ipHash: rateState.ipHash,
        succeeded: false,
        userAgent,
        metadata: {
          errorCode: error?.code ?? null,
        },
      });

      await logSecurityEvent({
        source: "auth-login",
        type: "auth_login_failed",
        severity: "warning",
        identifierHash: rateState.identifierHash,
        ipHash: rateState.ipHash,
        message: "Tentativa de login falhou.",
        metadata: {
          errorCode: error?.code ?? null,
        },
      });

      if (isInvalidCredentialsError(String(error?.message ?? ""))) {
        throw new HttpError(401, "Credenciais invalidas.", "INVALID_CREDENTIALS");
      }

      throw new HttpError(500, "Nao foi possivel concluir o login.", "LOGIN_FAILED", false);
    }

    await recordRateLimitAttempt(adminClient, {
      action: "login",
      identifierHash: rateState.identifierHash,
      ipHash: rateState.ipHash,
      succeeded: true,
      userAgent,
      metadata: {
        userId: data.user?.id ?? null,
      },
    });

    await logSecurityEvent({
      source: "auth-login",
      type: "auth_login_succeeded",
      severity: "info",
      actorUserId: data.user?.id ?? null,
      identifierHash: rateState.identifierHash,
      ipHash: rateState.ipHash,
      message: "Login concluido com sucesso.",
    });

    return json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
      },
      user: {
        id: data.user?.id ?? null,
        email: data.user?.email ?? null,
      },
    });
  } catch (error) {
    return await toErrorResponse(error, "Nao foi possivel processar o login.", {
      functionName: "auth-login",
      request: req,
      source: "edge",
    });
  }
});
