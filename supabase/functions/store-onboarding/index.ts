import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Onboarding / configuração da Vitrine (contas CNPJ).
 *
 * Segurança (RBAC rígido no servidor):
 *  - Exige JWT válido.
 *  - Carrega o perfil e SÓ permite contas Pessoa Jurídica (PJ/CNPJ).
 *  - Qualquer conta CPF (ou sem tipo) recebe HTTP 403 Forbidden.
 *
 * Processa: Nome da Loja, Nicho de Mercado, Logotipo, Banner (upload no Storage)
 * e a parametrização inicial da vitrine. As imagens chegam em base64 (data URL)
 * e são gravadas no bucket público via service role; o registro é salvo como
 * `pending` para passar pela moderação do administrador.
 */

const PUBLIC_BUCKET = "project-covers";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

interface OnboardingBody {
  nome_loja?: string;
  categoria?: string; // Nicho de mercado
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Converte uma data URL (base64) em bytes + mime, validando tipo e tamanho. */
function parseDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string; ext: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Formato de imagem inválido.");
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.includes(mime)) throw new Error("Tipo de imagem não suportado (use PNG, JPG ou WEBP).");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Imagem muito grande (máximo 5 MB).");
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return { bytes, mime, ext };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  // ── 1. Autenticação ──────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Não autenticado", code: "UNAUTHORIZED" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return json({ error: "Sessão inválida", code: "UNAUTHORIZED" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  // ── 2. RBAC: somente contas CNPJ (PJ) ────────────────────────────
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await admin
    .from("profiles")
    .select("account_type")
    .eq("user_id", userId)
    .maybeSingle();

  const rawType = (profile?.account_type ?? "").toUpperCase();
  const isCNPJ = rawType === "PJ" || rawType === "CNPJ";
  if (!isCNPJ) {
    return json(
      {
        error: "Acesso restrito a contas Pessoa Jurídica (CNPJ).",
        code: "FORBIDDEN_ACCOUNT_SCOPE",
      },
      403,
    );
  }

  // ── 3. Validação do corpo ────────────────────────────────────────
  let body: OnboardingBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const nome_loja = (body.nome_loja ?? "").trim();
  const categoria = (body.categoria ?? "").trim();
  const cidade = (body.cidade ?? "").trim();
  const whatsapp = (body.whatsapp ?? "").trim();
  const cnpj = (body.cnpj ?? "").trim();

  if (nome_loja.length < 2 || nome_loja.length > 120) {
    return json({ error: "Informe o nome da loja (2 a 120 caracteres)." }, 400);
  }
  if (!categoria) return json({ error: "Selecione o nicho de mercado." }, 400);
  if (!cidade) return json({ error: "Informe a cidade." }, 400);
  if (!whatsapp) return json({ error: "Informe o WhatsApp comercial." }, 400);
  if (!cnpj) return json({ error: "Informe o CNPJ." }, 400);

  // ── 4. Upload das imagens (Storage) ──────────────────────────────
  async function uploadImage(dataUrl: string, kind: "logo" | "banner"): Promise<string> {
    const { bytes, mime, ext } = parseDataUrl(dataUrl);
    const path = `lojas/${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await admin.storage.from(PUBLIC_BUCKET).upload(path, bytes, {
      contentType: mime,
      upsert: true,
    });
    if (error) throw new Error(`Falha ao enviar ${kind}: ${error.message}`);
    const { data } = admin.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  let logo_url = body.logo_url ?? null;
  let banner_url = body.banner_url ?? null;
  try {
    if (body.logo_data_url) logo_url = await uploadImage(body.logo_data_url, "logo");
    if (body.banner_data_url) banner_url = await uploadImage(body.banner_data_url, "banner");
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Falha no upload de imagem." }, 400);
  }

  // ── 5. Parametrização inicial da vitrine ─────────────────────────
  // Loja recém-configurada entra como `pending` para moderação do admin.
  const { data: existing } = await admin
    .from("perfil_lojista")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    user_id: userId,
    nome_loja,
    categoria,
    cidade,
    whatsapp,
    cnpj,
    descricao: (body.descricao ?? "").trim() || null,
    estado: (body.estado ?? "SP").trim() || "SP",
    instagram: (body.instagram ?? "").trim() || null,
    horario_atendimento: (body.horario_atendimento ?? "").trim() || null,
    logo_url,
    banner_url,
  };

  // Mantém aprovação existente; novas lojas ficam pendentes de moderação.
  if (!existing) payload.status = "pending";

  const { data: saved, error: upsertError } = await admin
    .from("perfil_lojista")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .maybeSingle();

  if (upsertError) {
    return json({ error: "Não foi possível salvar a vitrine.", detail: upsertError.message }, 500);
  }

  return json({ ok: true, perfil: saved, logo_url, banner_url });
});
