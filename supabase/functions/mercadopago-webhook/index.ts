import { createClient } from "npm:@supabase/supabase-js@2";

// Webhook público (sem verify_jwt). Segurança: validação de assinatura HMAC do
// Mercado Pago + reconsulta do pagamento na API oficial. Confiabilidade:
// trava de idempotência por ID do evento + retentativa com backoff exponencial.

function log(level: "info" | "warn" | "error", event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fn: "mercadopago-webhook", level, event, ...data, ts: new Date().toISOString() }));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function validateSignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

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
  const expectedBytes = new Uint8Array((v1.match(/.{1,2}/g) || []).map((hex) => parseInt(hex, 16)));
  return crypto.subtle.verify("HMAC", key, expectedBytes, new TextEncoder().encode(manifest));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const WEBHOOK_SECRET = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

  if (!MP_TOKEN) {
    log("error", "config_error", { reason: "missing_mp_token" });
    return new Response("ok"); // 200 evita retries infinitos do gateway
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const url = new URL(req.url);
    let dataId = url.searchParams.get("data.id") || url.searchParams.get("id");
    let type = url.searchParams.get("type") || url.searchParams.get("topic");

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      /* corpo vazio é válido em algumas notificações */
    }
    dataId = dataId || body?.data?.id || body?.resource;
    type = type || body?.type || body?.action;

    // ── ID único do evento (notification.id) para a trava de idempotência ──
    const eventId = String(body?.id ?? url.searchParams.get("id") ?? dataId ?? "");

    log("info", "received", { type, dataId, eventId, hasSig: !!req.headers.get("x-signature") });

    if (!dataId || !eventId) {
      log("warn", "malformed_payload", { type, dataId, eventId });
      return new Response("ok"); // payload malformado: nada a processar
    }

    if (type && !String(type).includes("payment")) {
      log("info", "ignored_topic", { type });
      return new Response("ok");
    }

    // ── Validação de assinatura ──
    if (WEBHOOK_SECRET) {
      const valid = await validateSignature(req, String(dataId), WEBHOOK_SECRET);
      if (!valid) {
        log("error", "invalid_signature", { dataId, eventId });
        return new Response("invalid signature", { status: 401 });
      }
    }

    // ── Trava de idempotência estrita (ID do evento) ──
    const { data: claim, error: claimErr } = await admin.rpc("claim_webhook_event", {
      _gateway: "mercadopago",
      _event_id: eventId,
      _topic: type ?? null,
    });
    if (claimErr) {
      log("error", "claim_failed", { eventId, message: claimErr.message });
      return new Response("error", { status: 500 }); // gateway irá retentar
    }
    if (claim === "duplicate") {
      log("info", "duplicate_ignored", { eventId });
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Reconsulta o pagamento na API do Mercado Pago ──
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const payment = await mpResp.json();
    if (!mpResp.ok) {
      log("error", "mp_lookup_failed", { status: mpResp.status, dataId, eventId });
      await admin.rpc("mark_webhook_event", { _gateway: "mercadopago", _event_id: eventId, _status: "failed", _error: `mp_lookup_${mpResp.status}` });
      return new Response("ok");
    }

    const status = payment?.status;
    const gatewayPaymentId = String(payment?.id ?? dataId);
    log("info", "payment_status", { gatewayPaymentId, status, eventId });

    if (status !== "approved") {
      await admin.rpc("mark_webhook_event", { _gateway: "mercadopago", _event_id: eventId, _status: "done" });
      return new Response("ok");
    }

    // ── Ativação idempotente com RETENTATIVA + backoff exponencial ──
    const MAX_ATTEMPTS = 4;
    let lastError = "";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { data: result, error } = await admin.rpc("confirm_pix_payment", {
        _gateway_payment_id: gatewayPaymentId,
      });
      if (!error) {
        await admin.rpc("mark_webhook_event", { _gateway: "mercadopago", _event_id: eventId, _status: "done" });
        log("info", "processed", { gatewayPaymentId, eventId, attempt, result });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      lastError = error.message;
      log("warn", "confirm_retry", { gatewayPaymentId, eventId, attempt, message: error.message });
      if (attempt < MAX_ATTEMPTS) {
        await sleep(250 * 2 ** (attempt - 1)); // 250ms, 500ms, 1000ms
      }
    }

    // Esgotou as tentativas: marca falha e devolve 500 para o gateway reentregar.
    await admin.rpc("mark_webhook_event", { _gateway: "mercadopago", _event_id: eventId, _status: "failed", _error: lastError });
    log("error", "confirm_exhausted", { gatewayPaymentId, eventId, message: lastError });
    return new Response("error", { status: 500 });
  } catch (err) {
    log("error", "unhandled_error", { message: String(err) });
    return new Response("error", { status: 500 });
  }
});
