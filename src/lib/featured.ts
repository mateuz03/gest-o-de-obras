// Lógica de "Destaque" (Featured) do Marketplace — abordagem MVP Concierge.
// A ativação do destaque é feita manualmente após o pagamento via WhatsApp/Pix.

export const WHATSAPP_DESTAQUE = "5515991869809";

export interface FeaturePlan {
  id: string;
  nome: string;
  preco: string;
  duracao: string;
  destaque?: boolean;
}

// Planos para anúncios avulsos (Pessoa Física)
export const PLANOS_ANUNCIO: FeaturePlan[] = [
  { id: "anuncio-7d", nome: "Destaque Rápido", preco: "R$ 15", duracao: "7 dias" },
  { id: "anuncio-15d", nome: "Destaque Plus", preco: "R$ 25", duracao: "15 dias", destaque: true },
];

// Plano para lojas (Pessoa Jurídica) — assinatura mensal recorrente
export const PLANO_LOJA: FeaturePlan = {
  id: "loja-30d",
  nome: "Loja em Destaque",
  preco: "R$ 97/mês",
  duracao: "30 dias",
  destaque: true,
};

/**
 * Verifica se um destaque está ativo, considerando o prazo de validade.
 * Caso o prazo tenha expirado, o item volta automaticamente a ser tratado
 * como "normal" (mesmo que a flag no banco ainda esteja marcada).
 */
export function isHighlightActive(flag?: boolean | null, until?: string | null): boolean {
  if (!flag) return false;
  if (!until) return true;
  return new Date(until).getTime() > Date.now();
}

/** Dias restantes de destaque (arredondado para cima). 0 quando expirado/inativo. */
export function highlightDaysLeft(until?: string | null): number {
  if (!until) return 0;
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Monta o link de WhatsApp para iniciar a negociação do destaque. */
export function buildDestaqueWhatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_DESTAQUE}?text=${encodeURIComponent(message)}`;
}
