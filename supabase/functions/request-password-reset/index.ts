import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

// Limite: 3 solicitações por IP+e-mail a cada 15 minutos.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  redirectTo: z.string().url().max(500).optional(),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validação de entrada
  let parsed;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "E-mail inválido", details: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const redirectTo = parsed.data.redirectTo;
  const ip = getClientIp(req);
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  // 1. Verifica tentativas recentes (por e-mail OU por IP) dentro da janela
  const { data: attempts, error: queryError } = await admin
    .from("password_reset_attempts")
    .select("created_at, email, ip")
    .or(`email.eq.${email},ip.eq.${ip}`)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true });

  if (queryError) {
    console.error("[request-password-reset] query error:", queryError.message);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const emailCount = (attempts ?? []).filter((a) => a.email === email).length;
  const ipCount = (attempts ?? []).filter((a) => a.ip === ip).length;

  // 2. Bloqueio: HTTP 429 se o limite for excedido por e-mail ou por IP
  if (emailCount >= MAX_ATTEMPTS || ipCount >= MAX_ATTEMPTS) {
    const oldest = attempts && attempts.length > 0 ? new Date(attempts[0].created_at).getTime() : Date.now();
    const retryAfterMs = Math.max(0, oldest + WINDOW_MS - Date.now());
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    const retryAfterMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

    console.warn(`[request-password-reset] rate limit hit (ip=${ip})`);

    return new Response(
      JSON.stringify({
        error: `Muitas tentativas. Por favor, aguarde ${retryAfterMinutes} minuto(s) antes de tentar novamente.`,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfterMinutes,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": retryAfterSeconds.toString(),
        },
      },
    );
  }

  // 3. Registra a tentativa atual
  const { error: insertError } = await admin
    .from("password_reset_attempts")
    .insert({ email, ip });
  if (insertError) {
    console.error("[request-password-reset] insert error:", insertError.message);
  }

  // 4. Dispara o e-mail de recuperação via endpoint nativo do Auth.
  //    Sempre retornamos sucesso genérico para não revelar se o e-mail existe.
  try {
    const recoverUrl = new URL(`${SUPABASE_URL}/auth/v1/recover`);
    if (redirectTo) recoverUrl.searchParams.set("redirect_to", redirectTo);

    await fetch(recoverUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ email }),
    }).then((r) => r.text());
  } catch (err) {
    console.error("[request-password-reset] recover error:", String(err));
  }

  return new Response(
    JSON.stringify({
      message:
        "Se o e-mail estiver cadastrado, você receberá um link de recuperação em instantes.",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
