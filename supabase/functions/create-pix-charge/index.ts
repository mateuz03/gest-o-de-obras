import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

// ─────────────────────────────────────────────────────────────
// Tabela de preços (fonte da verdade no servidor — nunca confiar no cliente)
// ─────────────────────────────────────────────────────────────
const PRICING: Record<string, Record<string, { dias: number; valor: number; titulo: string }>> = {
  destaque_produto: {
    "7": { dias: 7, valor: 19.9, titulo: "Destaque de anúncio (7 dias)" },
    "30": { dias: 30, valor: 49.9, titulo: "Destaque de anúncio (30 dias)" },
  },
  destaque_loja: {
    "7": { dias: 7, valor: 19.9, titulo: "Destaque de loja (7 dias)" },
    "30": { dias: 30, valor: 49.9, titulo: "Destaque de loja (30 dias)" },
  },
  plano_pro: {
    "30": { dias: 30, valor: 29.9, titulo: "Plano Profissional (30 dias)" },
  },
};

const BodySchema = z.object({
  purpose: z.enum(["destaque_produto", "destaque_loja", "plano_pro"]),
  plan: z.enum(["7", "30"]),
  target_id: z.string().uuid().optional(),
});

function log(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ fn: "create-pix-charge", event, ...data, ts: new Date().toISOString() }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    if (!MP_TOKEN) {
      log("config_error", { reason: "missing_mp_token" });
      return json({ error: "Gateway de pagamento não configurado." }, 500);
    }

    // ── Autenticação ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "comprador@obralink.app";

    // ── Validação de entrada ──
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { purpose, plan, target_id } = parsed.data;

    const priceConfig = PRICING[purpose]?.[plan];
    if (!priceConfig) return json({ error: "Plano inválido para esta finalidade." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Validação de propriedade do recurso ──
    if (purpose === "destaque_produto") {
      if (!target_id) return json({ error: "target_id obrigatório." }, 400);
      const { data: prod } = await admin
        .from("produtos_loja").select("id").eq("id", target_id).eq("user_id", userId).maybeSingle();
      if (!prod) return json({ error: "Anúncio não encontrado ou não pertence a você." }, 403);
    } else if (purpose === "destaque_loja") {
      // o destaque de loja sempre se aplica à loja do próprio usuário
      const { data: loja } = await admin
        .from("perfil_lojista").select("user_id").eq("user_id", userId).maybeSingle();
      if (!loja) return json({ error: "Loja não encontrada." }, 403);
    }

    const resolvedTarget = purpose === "destaque_loja" ? userId : (purpose === "plano_pro" ? null : target_id);

    // ── Cria registro de pagamento pendente ──
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    const { data: payRow, error: payErr } = await admin
      .from("pix_payments")
      .insert({
        user_id: userId,
        gateway: "mercadopago",
        purpose,
        target_id: resolvedTarget,
        plano_dias: priceConfig.dias,
        valor: priceConfig.valor,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
    if (payErr || !payRow) {
      log("db_error", { reason: payErr?.message });
      return json({ error: "Não foi possível iniciar a cobrança." }, 500);
    }

    log("pix_charge_requested", { paymentId: payRow.id, userId, purpose, plan, valor: priceConfig.valor, target: resolvedTarget });

    // ── Telemetria: clique no funil (Destacar) ──
    await admin.from("marketplace_events").insert({
      event_type: "feature_click",
      user_id: userId,
      target_type: purpose === "destaque_loja" ? "loja" : purpose === "plano_pro" ? "plano" : "produto",
      target_id: resolvedTarget ?? userId,
      is_featured: false,
      metadata: { purpose, plan, valor: priceConfig.valor },
    });

    // ── Cria cobrança Pix no Mercado Pago ──
    const webhookUrl = `${SUPABASE_URL}/functions/v1/mercadopago-webhook`;
    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": payRow.id, // idempotência no gateway
      },
      body: JSON.stringify({
        transaction_amount: priceConfig.valor,
        description: priceConfig.titulo,
        payment_method_id: "pix",
        external_reference: payRow.id,
        notification_url: webhookUrl,
        date_of_expiration: toMpDate(expiresAt),
        payer: { email: userEmail },
      }),
    });

    const mpData = await mpResp.json();
    if (!mpResp.ok) {
      log("mp_error", { status: mpResp.status, body: mpData });
      await admin.from("pix_payments").update({ status: "failed" }).eq("id", payRow.id);
      return json({ error: "Falha ao gerar o Pix. Tente novamente." }, 502);
    }

    const tx = mpData?.point_of_interaction?.transaction_data ?? {};
    await admin
      .from("pix_payments")
      .update({
        gateway_payment_id: String(mpData.id),
        qr_code: tx.qr_code ?? null,
        qr_code_base64: tx.qr_code_base64 ?? null,
        ticket_url: tx.ticket_url ?? null,
      })
      .eq("id", payRow.id);

    log("pix_charge_created", { paymentId: payRow.id, mpId: mpData.id, expiresAt: expiresAt.toISOString() });

    return json({
      payment_id: payRow.id,
      valor: priceConfig.valor,
      dias: priceConfig.dias,
      qr_code: tx.qr_code ?? null,
      qr_code_base64: tx.qr_code_base64 ?? null,
      ticket_url: tx.ticket_url ?? null,
      expires_at: expiresAt.toISOString(),
    }, 200);
  } catch (err) {
    log("unhandled_error", { message: String(err) });
    return json({ error: "Erro interno." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Mercado Pago exige o formato yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ com offset
function toMpDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  // usa UTC com offset -00:00
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${ms}-00:00`;
}
