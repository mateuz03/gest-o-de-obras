import { normalizeAccountType, type AccountType } from "@/contexts/AuthContext";

/**
 * Resolvedor Público do Vendedor (fonte única de verdade).
 *
 * Identifica dinamicamente o tipo de conta e devolve a URL correta:
 *  - CPF (Pessoa Física)  → perfil público padrão do vendedor  → /vendedor/:id
 *  - CNPJ (Pessoa Jurídica) → vitrine da loja corporativa       → /loja/:id
 *
 * Aceita tanto o tipo normalizado ("CPF"/"CNPJ") quanto o valor cru do banco
 * ("PF"/"PJ"/"CPF"/"CNPJ"), e ainda um sinal explícito `isStore` (ex.: quando
 * já sabemos que existe um perfil de lojista associado).
 */
export interface SellerLinkInput {
  userId: string;
  /** Valor cru ou normalizado do tipo de conta. */
  accountType?: string | null;
  /** Sinal forte: o vendedor possui vitrine de loja (perfil_lojista). */
  isStore?: boolean;
}

export function resolveSellerType(input: Omit<SellerLinkInput, "userId">): AccountType {
  if (input.isStore) return "CNPJ";
  return normalizeAccountType(input.accountType);
}

export function resolveSellerLink({ userId, accountType, isStore }: SellerLinkInput): string {
  const tipo = resolveSellerType({ accountType, isStore });
  return tipo === "CNPJ" ? `/loja/${userId}` : `/vendedor/${userId}`;
}
