import { Sparkles } from "lucide-react";

/** Finalidades de cobrança suportadas. */
export type PixPurpose = "destaque_produto" | "destaque_loja" | "plano_pro";

export interface PlanOption {
  key: "7" | "30";
  dias: number;
  valor: number;
  label: string;
  badge?: string;
}

/** Preços oficiais (espelham a tabela do servidor em create-pix-charge). */
export const DESTAQUE_PLANS: PlanOption[] = [
  { key: "7", dias: 7, valor: 19.9, label: "Destaque por 7 dias" },
  { key: "30", dias: 30, valor: 49.9, label: "Destaque por 30 dias", badge: "Melhor custo" },
];

export const PLANO_PRO: PlanOption = {
  key: "30",
  dias: 30,
  valor: 29.9,
  label: "Plano Profissional — 30 dias",
};

export const LIMITE_GRATIS = 10;

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const PRO_BENEFITS = [
  "Publicações ilimitadas de materiais",
  "Maior visibilidade para milhares de compradores",
  "Selo de vendedor profissional",
  "Suporte prioritário",
];

export const PaywallIcon = Sparkles;
