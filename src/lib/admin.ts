export interface AdminDashboardSnapshot {
  users: {
    total: number;
    cpf: number;
    cnpj: number;
    active: number;
    suspended: number;
    banned: number;
    admins: number;
  };
  marketplace: {
    pendingStores: number;
    approvedStores: number;
    hiddenStores: number;
    activeProducts: number;
    hiddenProducts: number;
    featuredProducts: number;
    featuredStores: number;
    pendingReports: number;
    openPixCharges: number;
    paidPixCharges: number;
  };
  operations: {
    analyses: number;
    analysesLast30Days: number;
    aiFailuresLast7Days: number;
    aiPendingRuns: number;
    webhookFailures: number;
    blogPosts: number;
    sinapiUploads: number;
    latestSinapiUpload: {
      id: string;
      nome_arquivo: string;
      status: string;
      qtd_itens: number;
      regiao: string | null;
      mes_ano: string | null;
      created_at: string;
    } | null;
  };
  flags: {
    maintenanceMode: boolean;
    sellerOnboardingOpen: boolean;
  };
}

export interface AdminUserRow {
  user_id: string;
  email: string;
  nome: string;
  account_type: string | null;
  account_status: string;
  plano_marketplace: string;
  plano_marketplace_until: string | null;
  nome_empresa: string | null;
  cpf: string | null;
  cnpj: string | null;
  analyses_count: number;
  active_ads_count: number;
  is_admin: boolean;
  created_at: string;
  total_rows: number;
}

export interface AdminAiRunRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  stage: string;
  error_message: string | null;
  analysis_id: string;
  document_id: string | null;
  project_name: string;
  owner_user_id: string;
  owner_name: string;
  owner_email: string;
  payload_json: unknown;
  total_rows: number;
}

export interface AdminActivityRow {
  id: string;
  source: string;
  action: string;
  actor_label: string;
  target_type: string;
  target_id: string | null;
  target_label: string;
  details: string | null;
  created_at: string;
}

export interface AdminMarketplaceReportRow {
  id: string;
  created_at: string;
  status: string;
  reason: string;
  details: string | null;
  decision_reason: string | null;
  target_type: string;
  target_id: string;
  reporter_id: string;
  reporter_name: string;
  reporter_email: string;
  target_name: string | null;
  target_owner_id: string | null;
  target_owner_name: string | null;
  target_hidden: boolean;
  total_rows: number;
}

export interface AdminPendingStoreRow {
  id: string;
  nome_loja: string;
  cnpj: string;
  cidade: string;
  estado: string | null;
  categoria: string | null;
  created_at: string;
}

export interface AdminFeaturedItemRow {
  type: "produto" | "loja";
  id: string;
  nome: string;
  is_featured: boolean;
  featured_until: string | null;
}

export type PendingStoreSort = "oldest" | "newest" | "name";

export const BLOG_CATEGORIES = [
  "Gestão de Obras",
  "Produtividade",
  "Suprimentos",
  "Tecnologia BIM",
] as const;

export const BLOG_FORMATS = [
  "Artigo Técnico",
  "Guia Prático",
  "Tendência",
  "Estudo de Caso",
] as const;

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  suspended: "Suspensa",
  banned: "Banida",
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  PF: "CPF",
  PJ: "CNPJ",
};

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
};

export function formatAccountType(value: string | null | undefined) {
  return ACCOUNT_TYPE_LABELS[String(value || "").toUpperCase()] ?? "Não informado";
}

export function formatAccountStatus(value: string | null | undefined) {
  return ACCOUNT_STATUS_LABELS[String(value || "").toLowerCase()] ?? "Indefinido";
}

export function formatPlan(value: string | null | undefined) {
  return PLAN_LABELS[String(value || "").toLowerCase()] ?? "Personalizado";
}

export function formatAdminAction(action: string) {
  const map: Record<string, string> = {
    blog_post_created: "Post criado",
    blog_post_updated: "Post atualizado",
    blog_post_deleted: "Post removido",
    marketplace_report_moderated: "Denúncia moderada",
    marketplace_visibility_changed: "Visibilidade alterada",
    password_reset_requested: "Redefinição de senha",
    store_status_notification: "Notificação de loja",
    store_status_updated: "Status da loja alterado",
    user_account_updated: "Conta atualizada",
    feature_extended: "Destaque ajustado",
    feature_revoked: "Destaque removido",
    feature_granted: "Destaque concedido",
    feature_expired: "Destaque expirado",
  };

  return map[action] ?? action.replace(/_/g, " ");
}

export function normalizeAdminSearch(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesAdminSearch(values: Array<string | null | undefined>, query?: string | null) {
  const normalizedQuery = normalizeAdminSearch(query);
  if (!normalizedQuery) return true;

  return values.some((value) => normalizeAdminSearch(value).includes(normalizedQuery));
}

export function filterPendingStores<T extends AdminPendingStoreRow>(
  rows: T[],
  options?: {
    query?: string | null;
    sortBy?: PendingStoreSort;
    previousRejections?: Record<string, number>;
    onlyRepeated?: boolean;
  },
) {
  const { query, sortBy = "oldest", previousRejections = {}, onlyRepeated = false } = options ?? {};

  return rows
    .filter((row) => {
      const repeatedCount = previousRejections[row.cnpj] ?? 0;
      if (onlyRepeated && repeatedCount <= 0) return false;

      return matchesAdminSearch(
        [row.nome_loja, row.cnpj, row.cidade, row.estado, row.categoria],
        query,
      );
    })
    .sort((left, right) => {
      if (sortBy === "name") {
        return left.nome_loja.localeCompare(right.nome_loja, "pt-BR");
      }

      const leftDate = new Date(left.created_at).getTime();
      const rightDate = new Date(right.created_at).getTime();

      if (sortBy === "newest") {
        return rightDate - leftDate;
      }

      return leftDate - rightDate;
    });
}

export function filterMarketplaceReports<T extends AdminMarketplaceReportRow>(rows: T[], query?: string | null) {
  return rows.filter((row) =>
    matchesAdminSearch(
      [
        row.target_name,
        row.target_type,
        row.reason,
        row.details,
        row.reporter_name,
        row.reporter_email,
        row.target_owner_name,
      ],
      query,
    ),
  );
}

export function filterFeaturedItems<T extends AdminFeaturedItemRow>(rows: T[], query?: string | null) {
  return rows.filter((row) => matchesAdminSearch([row.nome, row.type], query));
}
