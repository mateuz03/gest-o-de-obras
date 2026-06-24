import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export class HttpError extends Error {
  status: number;
  code: string;
  expose: boolean;

  constructor(status: number, message: string, code = "ERROR", expose = true) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError(500, `Variavel de ambiente ausente: ${name}`, "CONFIG_ERROR", false);
  }
  return value;
}

export function createServiceRoleClient() {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface ErrorLogContext {
  actorUserId?: string | null;
  functionName?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
  source?: string;
}

export interface SecurityEventInput {
  actorUserId?: string | null;
  identifierHash?: string | null;
  ipHash?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
  severity?: "info" | "warning" | "error" | "critical";
  source: string;
  type: string;
}

export interface RateLimitInput {
  action: "login" | "password_reset";
  identifier: string;
  ip: string;
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitState {
  attemptCount: number;
  identifierHash: string;
  ipHash: string;
  retryAfterSeconds: number;
}

export async function toErrorResponse(
  error: unknown,
  fallbackMessage = "Erro interno",
  context?: ErrorLogContext,
) {
  const isHttpError = error instanceof HttpError;
  const status = isHttpError ? error.status : 500;
  const code = isHttpError ? error.code : "INTERNAL_ERROR";
  const exposedMessage = isHttpError ? error.message : fallbackMessage;

  if (!isHttpError) {
    console.error("[edge-error]", error);
  }

  if (!isHttpError || status >= 500 || status === 429) {
    await logErrorEvent({
      source: context?.source ?? "edge",
      functionName: context?.functionName ?? "unknown",
      errorCode: code,
      message: error instanceof Error ? error.message : fallbackMessage,
      actorUserId: context?.actorUserId ?? null,
      request: context?.request,
      severity: !isHttpError || status >= 500 ? "critical" : "warning",
      metadata: {
        ...(context?.metadata ?? {}),
        httpStatus: status,
      },
    });
  }

  return json({ error: exposedMessage, code }, status);
}

export function requireMethod(req: Request, method: string) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== method) {
    throw new HttpError(405, "Metodo nao permitido", "METHOD_NOT_ALLOWED");
  }
}

export interface RequestContext {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  authHeader: string;
  authClient: ReturnType<typeof createClient>;
  adminClient: ReturnType<typeof createClient>;
  user: {
    id: string;
    email?: string | null;
  };
}

export async function getAuthenticatedContext(req: Request): Promise<RequestContext> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Nao autenticado", "UNAUTHORIZED");
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user?.id) {
    throw new HttpError(401, "Sessao invalida", "UNAUTHORIZED");
  }

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    authHeader,
    authClient,
    adminClient,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  };
}

export async function requireAdminContext(req: Request) {
  const ctx = await getAuthenticatedContext(req);
  const { data, error } = await ctx.adminClient.rpc("has_role", {
    _user_id: ctx.user.id,
    _role: "admin",
  });

  if (error || !data) {
    throw new HttpError(403, "Acesso restrito", "FORBIDDEN");
  }

  return ctx;
}

export async function assertAnalysisAccess(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  analysisId: string,
) {
  const { data, error } = await adminClient
    .from("analyses")
    .select("id, user_id, nome_projeto, status, resultado_json, bdi_percentual")
    .eq("id", analysisId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new HttpError(404, "Analise nao encontrada", "ANALYSIS_NOT_FOUND");
  }

  return data;
}

export async function assertDocumentAccess(
  adminClient: ReturnType<typeof createClient>,
  analysisId: string,
  documentId: string,
) {
  const { data, error } = await adminClient
    .from("analysis_documents")
    .select("*")
    .eq("id", documentId)
    .eq("analysis_id", analysisId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new HttpError(404, "Documento nao encontrado", "DOCUMENT_NOT_FOUND");
  }

  return data;
}

export function assertOwnedStoragePath(userId: string, analysisId: string, storagePath: string) {
  const normalized = String(storagePath || "").replace(/^\/+/, "");
  const expectedPrefix = `${userId}/${analysisId}/`;
  if (!normalized.startsWith(expectedPrefix)) {
    throw new HttpError(403, "Caminho do arquivo nao pertence a analise", "INVALID_STORAGE_SCOPE");
  }
}

export function normalizeDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeIdentifier(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function getClientIp(req: Request) {
  const raw =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || "unknown";

  return raw.replace(/[^a-fA-F0-9:.,]/g, "").slice(0, 100) || "unknown";
}

export function getClientUserAgent(req: Request) {
  return String(req.headers.get("user-agent") ?? "").slice(0, 255) || null;
}

export function isValidCpf(value: string | null | undefined) {
  const cpf = normalizeDigits(value);
  if (!cpf || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += Number(cpf[i]) * (slice + 1 - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function isValidCnpj(value: string | null | undefined) {
  const cnpj = normalizeDigits(value);
  if (!cnpj || cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const calc = (len: number) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export function isSafePublicStorageUrl(urlValue: string | null | undefined, bucketName: string) {
  if (!urlValue) return true;

  try {
    const url = new URL(urlValue);
    return url.pathname.includes(`/storage/v1/object/public/${bucketName}/`);
  } catch {
    return false;
  }
}

export async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashSensitiveValue(value: string | null | undefined) {
  const normalized = normalizeIdentifier(value);
  return normalized ? sha256Hex(normalized) : null;
}

export async function assertValidShareToken(
  adminClient: ReturnType<typeof createClient>,
  analysisId: string,
  shareToken: string,
) {
  const tokenHash = await sha256Hex(shareToken);
  const { data, error } = await adminClient
    .from("analysis_shares")
    .select("id, analysis_id, expires_at, revoked_at")
    .eq("analysis_id", analysisId)
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new HttpError(403, "Link compartilhado invalido ou expirado", "INVALID_SHARE_TOKEN");
  }

  await adminClient
    .from("analysis_shares")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", data.id);

  return data;
}

export async function logSecurityEvent(input: SecurityEventInput) {
  try {
    const adminClient = createServiceRoleClient();
    await adminClient.from("security_events").insert({
      source: input.source,
      event_type: input.type,
      severity: input.severity ?? "warning",
      actor_user_id: input.actorUserId ?? null,
      identifier_hash: input.identifierHash ?? null,
      ip_hash: input.ipHash ?? null,
      message: input.message,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.warn("[security-log-failed]", error);
  }
}

export async function logErrorEvent({
  actorUserId,
  errorCode,
  functionName,
  message,
  metadata,
  request,
  severity = "error",
  source = "edge",
}: {
  actorUserId?: string | null;
  errorCode?: string | null;
  functionName: string;
  message: string;
  metadata?: Record<string, unknown>;
  request?: Request;
  severity?: "info" | "warning" | "error" | "critical";
  source?: string;
}) {
  try {
    const adminClient = createServiceRoleClient();
    await adminClient.from("app_error_events").insert({
      source,
      function_name: functionName,
      severity,
      error_code: errorCode ?? null,
      message,
      request_path: request ? new URL(request.url).pathname : null,
      request_method: request?.method ?? null,
      actor_user_id: actorUserId ?? null,
      metadata: metadata ?? {},
    });
  } catch (error) {
    console.warn("[error-log-failed]", error);
  }
}

export async function getRateLimitState(
  adminClient: ReturnType<typeof createClient>,
  input: RateLimitInput,
) {
  const identifierHash = await sha256Hex(normalizeIdentifier(input.identifier));
  const ipHash = await sha256Hex(normalizeIdentifier(input.ip));
  const windowStart = new Date(Date.now() - input.windowMs).toISOString();

  const [{ count: identifierCount, error: identifierError }, { count: ipCount, error: ipError }] = await Promise.all([
    adminClient
      .from("auth_rate_limit_attempts")
      .select("id", { count: "exact", head: true })
      .eq("action", input.action)
      .eq("identifier_hash", identifierHash)
      .gte("created_at", windowStart),
    adminClient
      .from("auth_rate_limit_attempts")
      .select("id", { count: "exact", head: true })
      .eq("action", input.action)
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart),
  ]);

  if (identifierError || ipError) {
    throw new HttpError(500, "Falha ao validar limite de requisicoes.", "RATE_LIMIT_QUERY", false);
  }

  const attemptCount = Math.max(identifierCount ?? 0, ipCount ?? 0);

  if (attemptCount < input.maxAttempts) {
    return {
      attemptCount,
      identifierHash,
      ipHash,
      retryAfterSeconds: 0,
    } satisfies RateLimitState;
  }

  const { data: oldestRow, error: oldestError } = await adminClient
    .from("auth_rate_limit_attempts")
    .select("created_at")
    .eq("action", input.action)
    .or(`identifier_hash.eq.${identifierHash},ip_hash.eq.${ipHash}`)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (oldestError) {
    throw new HttpError(500, "Falha ao calcular a janela de limite.", "RATE_LIMIT_QUERY", false);
  }

  const oldestTs = oldestRow?.created_at ? new Date(oldestRow.created_at).getTime() : Date.now();
  const retryAfterSeconds = Math.max(1, Math.ceil((oldestTs + input.windowMs - Date.now()) / 1000));

  return {
    attemptCount,
    identifierHash,
    ipHash,
    retryAfterSeconds,
  } satisfies RateLimitState;
}

export async function recordRateLimitAttempt(
  adminClient: ReturnType<typeof createClient>,
  input: {
    action: "login" | "password_reset";
    identifierHash: string;
    ipHash: string;
    metadata?: Record<string, unknown>;
    succeeded?: boolean;
    userAgent?: string | null;
  },
) {
  const { error } = await adminClient.from("auth_rate_limit_attempts").insert({
    action: input.action,
    identifier_hash: input.identifierHash,
    ip_hash: input.ipHash,
    succeeded: input.succeeded ?? false,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new HttpError(500, "Falha ao registrar tentativa de autenticacao.", "RATE_LIMIT_WRITE", false);
  }
}
