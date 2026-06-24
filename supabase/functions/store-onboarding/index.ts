import {
  corsHeaders,
  getAuthenticatedContext,
  HttpError,
  isSafePublicStorageUrl,
  isValidCnpj,
  json,
  requireMethod,
  toErrorResponse,
} from "../_shared/security.ts";
import { parseDataUrlImage } from "../_shared/upload-validation.ts";

const PUBLIC_BUCKET = "project-covers";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface OnboardingBody {
  nome_loja?: string;
  categoria?: string;
  descricao?: string;
  cidade?: string;
  estado?: string;
  whatsapp?: string;
  cnpj?: string;
  instagram?: string;
  horario_atendimento?: string;
  logo_data_url?: string | null;
  banner_data_url?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
}

function parseDataUrl(dataUrl: string) {
  const parsed = parseDataUrlImage(dataUrl, MAX_IMAGE_BYTES);
  return {
    bytes: parsed.bytes,
    mime: parsed.mimeType,
    ext: parsed.extension,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    requireMethod(req, "POST");
    const ctx = await getAuthenticatedContext(req);

    let body: OnboardingBody;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "Corpo da requisicao invalido.", "INVALID_BODY");
    }

    const nomeLoja = (body.nome_loja ?? "").trim();
    const categoria = (body.categoria ?? "").trim();
    const cidade = (body.cidade ?? "").trim();
    const estado = (body.estado ?? "SP").trim().toUpperCase().slice(0, 2) || "SP";
    const whatsapp = (body.whatsapp ?? "").trim();
    const cnpj = (body.cnpj ?? "").trim();
    const descricao = (body.descricao ?? "").trim();
    const instagram = (body.instagram ?? "").trim();
    const horarioAtendimento = (body.horario_atendimento ?? "").trim();

    if (nomeLoja.length < 2 || nomeLoja.length > 120) {
      throw new HttpError(400, "Informe o nome da loja (2 a 120 caracteres).", "INVALID_STORE_NAME");
    }
    if (!categoria || categoria.length > 120) {
      throw new HttpError(400, "Selecione um nicho valido para a loja.", "INVALID_CATEGORY");
    }
    if (!cidade || cidade.length > 120) {
      throw new HttpError(400, "Informe a cidade da loja.", "INVALID_CITY");
    }
    if (descricao.length > 2000) {
      throw new HttpError(400, "Descricao muito longa.", "INVALID_DESCRIPTION");
    }
    if (instagram.length > 80) {
      throw new HttpError(400, "Instagram invalido.", "INVALID_INSTAGRAM");
    }
    if (horarioAtendimento.length > 120) {
      throw new HttpError(400, "Horario de atendimento invalido.", "INVALID_SCHEDULE");
    }
    if (!whatsapp || whatsapp.length > 30) {
      throw new HttpError(400, "Informe o WhatsApp comercial.", "INVALID_PHONE");
    }
    if (!isValidCnpj(cnpj)) {
      throw new HttpError(400, "Informe um CNPJ valido.", "INVALID_CNPJ");
    }
    if (!isSafePublicStorageUrl(body.logo_url, PUBLIC_BUCKET) || !isSafePublicStorageUrl(body.banner_url, PUBLIC_BUCKET)) {
      throw new HttpError(400, "As URLs de imagem existentes nao sao validas.", "INVALID_IMAGE_URL");
    }

    const { data: flagsData, error: flagsError } = await ctx.adminClient.rpc("get_platform_flags");
    if (flagsError) throw flagsError;
    const flags = Array.isArray(flagsData) ? flagsData[0] : flagsData;

    const { data: profile, error: profileError } = await ctx.adminClient
      .from("profiles")
      .select("account_type, cnpj, account_status")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const accountType = String(profile?.account_type ?? "").toUpperCase();
    const isCnpjAccount = accountType === "PJ" || accountType === "CNPJ";
    if (!isCnpjAccount) {
      throw new HttpError(403, "Acesso restrito a contas Pessoa Juridica (CNPJ).", "FORBIDDEN_ACCOUNT_SCOPE");
    }

    const accountStatus = String((profile as { account_status?: string | null })?.account_status ?? "active").toLowerCase();
    if (accountStatus !== "active") {
      throw new HttpError(403, "Sua conta esta suspensa para alteracoes no marketplace.", "ACCOUNT_BLOCKED");
    }

    const profileCnpj = String(profile?.cnpj ?? "").replace(/\D/g, "");
    if (profileCnpj && profileCnpj !== cnpj.replace(/\D/g, "")) {
      throw new HttpError(400, "O CNPJ informado nao corresponde ao cadastro da conta.", "CNPJ_MISMATCH");
    }

    async function uploadImage(dataUrl: string, kind: "logo" | "banner") {
      const { bytes, mime, ext } = parseDataUrl(dataUrl);
      const path = `lojas/${ctx.user.id}/${kind}-${Date.now()}.${ext}`;

      const { error } = await ctx.adminClient.storage.from(PUBLIC_BUCKET).upload(path, bytes, {
        contentType: mime,
        upsert: true,
      });
      if (error) throw error;

      const { data } = ctx.adminClient.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }

    let logoUrl = body.logo_url ?? null;
    let bannerUrl = body.banner_url ?? null;
    if (body.logo_data_url) logoUrl = await uploadImage(body.logo_data_url, "logo");
    if (body.banner_data_url) bannerUrl = await uploadImage(body.banner_data_url, "banner");

    const { data: existing, error: existingError } = await ctx.adminClient
      .from("perfil_lojista")
      .select("user_id, status")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (flags?.seller_onboarding_open === false && existing?.status !== "approved") {
      throw new HttpError(
        403,
        "O cadastro de novas lojas esta temporariamente pausado pela equipe.",
        "SELLER_ONBOARDING_DISABLED",
      );
    }

    const nextStatus = existing?.status === "approved" ? "approved" : "pending";

    const payload = {
      user_id: ctx.user.id,
      nome_loja: nomeLoja,
      categoria,
      descricao: descricao || null,
      cidade,
      estado,
      whatsapp,
      cnpj,
      instagram: instagram || null,
      horario_atendimento: horarioAtendimento || null,
      logo_url: logoUrl,
      banner_url: bannerUrl,
      status: nextStatus,
      motivo_rejeicao: nextStatus === "pending" ? null : undefined,
    };

    const { data: saved, error: upsertError } = await ctx.adminClient
      .from("perfil_lojista")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();

    if (upsertError) throw upsertError;

    return json({ ok: true, perfil: saved, logo_url: logoUrl, banner_url: bannerUrl });
  } catch (error) {
    return await toErrorResponse(error, "Nao foi possivel salvar a vitrine.", {
      functionName: "store-onboarding",
      request: req,
      source: "edge",
    });
  }
});
