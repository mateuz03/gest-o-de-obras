import { createClient } from "npm:@supabase/supabase-js@2";

// Webhook público (sem verify_jwt). A segurança é feita por validação de assinatura
// HMAC do Mercado Pago e por reconsulta do pagamento na API oficial.

function log(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ fn: "mercadopago-webhook", event, ...data, ts: new Date().toISOString() }));
}

async function validateSignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  // x-signature: "ts=1700000000,v1=hexhash"
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string]),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === v1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const WEBHOOK_SECRET = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

    if (!MP_TOKEN) {
      log("config_error", { reason: "missing_mp_token" });
      return new Response("ok"); // responde 200 para evitar retries infinitos
    }

    const url = new URL(req.url);
    let dataId = url.searchParams.get("data.id") || url.searchParams.get("id");
    let type = url.searchParams.get("type") || url.searchParams.get("topic");

    // Corpo pode trazer { type, data: { id } }
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      /* corpo vazio é válido em algumas notificações */
    }
    dataId = dataId || body?.data?.id || body?.resource;
    type = type || body?.type || body?.action;

    log("received", { type, dataId, hasSig: !!req.headers.get("x-signature") });

    if (!dataId) return new Response("ok"); // nada a processar

    if (type && !String(type).includes("payment")) {
      log("ignored", { type });
      return new Response("ok");
    }

    // ── Validação de assinatura (quando há secret e cabeçalho) ──
    if (WEBHOOK_SECRET) {
      const valid = await validateSignature(req, String(dataId), WEBHOOK_SECRET);
      if (!valid && req.headers.get("x-signature")) {
        log("invalid_signature", { dataId });
        return new Response("invalid signature", { status: 401 });
      }
    }

    // ── Reconsulta o pagamento na API do Mercado Pago ──
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const payment = await mpResp.json();
    if (!mpResp.ok) {
      log("mp_lookup_failed", { status: mpResp.status, dataId });
      return new Response("ok");
    }

    const status = payment?.status;
    const gatewayPaymentId = String(payment?.id ?? dataId);
    log("payment_status", { gatewayPaymentId, status });

    if (status !== "approved") {
      // mantém pendente/expira via lógica própria; só registramos estado
      return new Response("ok");
    }

    // ── Ativação idempotente no banco ──
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: result, error } = await admin.rpc("confirm_pix_payment", {
      _gateway_payment_id: gatewayPaymentId,
    });

    if (error) {
      log("confirm_error", { gatewayPaymentId, message: error.message });
      return new Response("error", { status: 500 });
    }

    log("processed", { gatewayPaymentId, result });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    log("unhandled_error", { message: String(err) });
    return new Response("error", { status: 500 });
  }
});
