import { LIMITE_GRATIS } from "@/config/marketplacePlans";

/**
 * Regra de negócio do limite de publicações gratuitas (Pessoa Física).
 * Mantida como função pura para ser testável e espelhar exatamente a lógica
 * do servidor (RPCs `can_user_publish` / `get_publish_status`).
 *
 * Regras:
 *  - Apenas anúncios com status "ativo" contam para o limite.
 *  - Usuário "pro" (com plano válido) tem publicações ilimitadas.
 *  - Plano gratuito pode publicar enquanto a contagem de ativos < limite.
 */

export interface AnuncioLike {
  status?: string | null;
}

export interface PublishStatus {
  active_count: number;
  free_limit: number;
  is_pro: boolean;
  can_publish: boolean;
  restantes: number;
}

/** Conta apenas materiais com status "ativo". Rascunhos/arquivados não entram. */
export function countActive(anuncios: AnuncioLike[]): number {
  return anuncios.filter((a) => a.status === "ativo").length;
}

/**
 * Calcula o estado de publicação a partir da lista de anúncios e do plano.
 * @param anuncios lista de anúncios do usuário
 * @param isPro    se o usuário possui plano profissional válido
 * @param freeLimit limite gratuito (default = LIMITE_GRATIS)
 */
export function computePublishStatus(
  anuncios: AnuncioLike[],
  isPro = false,
  freeLimit: number = LIMITE_GRATIS,
): PublishStatus {
  const active_count = countActive(anuncios);
  const can_publish = isPro || active_count < freeLimit;
  return {
    active_count,
    free_limit: freeLimit,
    is_pro: isPro,
    can_publish,
    restantes: Math.max(0, freeLimit - active_count),
  };
}

/** Atalho booleano: o usuário pode publicar um novo anúncio agora? */
export function canUserPublish(
  anuncios: AnuncioLike[],
  isPro = false,
  freeLimit: number = LIMITE_GRATIS,
): boolean {
  return computePublishStatus(anuncios, isPro, freeLimit).can_publish;
}

/** Erro lançado quando o paywall deve barrar a criação de um novo anúncio. */
export class PaywallError extends Error {
  constructor(message = "Limite de publicações gratuitas atingido.") {
    super(message);
    this.name = "PaywallError";
  }
}

/**
 * Garante a regra antes de criar um anúncio. Lança {@link PaywallError}
 * quando o plano gratuito já atingiu o limite — sinal para exibir o paywall.
 */
export function assertCanPublish(
  anuncios: AnuncioLike[],
  isPro = false,
  freeLimit: number = LIMITE_GRATIS,
): void {
  if (!canUserPublish(anuncios, isPro, freeLimit)) {
    throw new PaywallError();
  }
}
