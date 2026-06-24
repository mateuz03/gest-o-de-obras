import {
  corsHeaders,
  HttpError,
  json,
  requireAdminContext,
  requireMethod,
  toErrorResponse,
} from "../_shared/security.ts";

interface Body {
  storeUserId?: string;
  status?: "approved" | "rejected" | "pending";
  motivo?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";

function buildSubject(status: Body["status"], storeName: string) {
  if (status === "approved") return `Sua loja ${storeName} foi aprovada no Obra Link`;
  if (status === "rejected") return `Atualização sobre a análise da loja ${storeName}`;
  return `Atualização do cadastro da loja ${storeName}`;
}

function buildHtml({
  storeName,
  status,
  motivo,
}: {
  storeName: string;
  status: Body["status"];
  motivo?: string;
}) {
  const headline =
    status === "approved"
      ? "Sua loja está liberada para vender no marketplace."
      : status === "rejected"
        ? "Precisamos de alguns ajustes antes de liberar a loja."
        : "Seu cadastro de loja recebeu uma atualização.";

  const statusLabel =
    status === "approved"
      ? "Aprovada"
      : status === "rejected"
        ? "Recusada"
        : "Atualizada";

  const reasonBlock = motivo?.trim()
    ? `<p style="margin:16px 0 0;color:#334155;line-height:1.6;"><strong>Motivo informado:</strong><br />${motivo.trim()}</p>`
    : "";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:32px;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
        <p style="margin:0 0 12px;color:#059669;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Obra Link Marketplace</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">${headline}</h1>
        <p style="margin:0;color:#475569;line-height:1.7;">A loja <strong>${storeName}</strong> foi marcada como <strong>${statusLabel}</strong> pela nossa equipe de validação.</p>
        ${reasonBlock}
        <p style="margin:24px 0 0;color:#475569;line-height:1.7;">Se precisar de suporte, responda este e-mail ou entre em contato com o time do Obra Link.</p>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    requireMethod(req, "POST");
    const ctx = await requireAdminContext(req);

    let body: Body;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "Corpo da requisição inválido.", "INVALID_BODY");
    }

    if (!body.storeUserId) {
      throw new HttpError(400, "Informe o usuário da loja.", "INVALID_STORE");
    }

    const status = body.status ?? "pending";
    if (!["approved", "rejected", "pending"].includes(status)) {
      throw new HttpError(400, "Status inválido.", "INVALID_STATUS");
    }

    const { data: store, error: storeError } = await ctx.adminClient
      .from("perfil_lojista")
      .select("user_id, nome_loja, status, motivo_rejeicao")
      .eq("user_id", body.storeUserId)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store) {
      throw new HttpError(404, "Loja não encontrada.", "STORE_NOT_FOUND");
    }

    const motivo = body.motivo?.trim() || store.motivo_rejeicao || undefined;
    const { data: userData, error: userError } = await ctx.adminClient.auth.admin.getUserById(store.user_id);
    if (userError) throw userError;

    const targetEmail = userData.user?.email?.trim().toLowerCase();
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("NOTIFY_FROM_EMAIL");

    let delivered = false;
    let provider = "disabled";
    let providerMessage = "Provider de e-mail não configurado.";

    if (targetEmail && resendApiKey && fromEmail) {
      provider = "resend";
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [targetEmail],
          subject: buildSubject(status, store.nome_loja),
          html: buildHtml({ storeName: store.nome_loja, status, motivo }),
        }),
      });

      if (!response.ok) {
        providerMessage = `Falha no envio (${response.status}).`;
      } else {
        delivered = true;
        providerMessage = "Notificação enviada com sucesso.";
      }
    }

    await ctx.authClient.rpc("admin_log_action", {
      _action: "store_status_notification",
      _target_type: "store",
      _target_id: store.user_id,
      _reason: motivo ?? null,
      _metadata: {
        status,
        delivered,
        provider,
        providerMessage,
        email: targetEmail ?? null,
      },
    });

    return json({
      ok: true,
      delivered,
      provider,
      providerMessage,
      email: targetEmail ?? null,
    });
  } catch (error) {
    return toErrorResponse(error, "Não foi possível processar a notificação da loja.");
  }
});
