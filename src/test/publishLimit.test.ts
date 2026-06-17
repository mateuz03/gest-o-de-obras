import { describe, it, expect } from "vitest";
import {
  countActive,
  computePublishStatus,
  canUserPublish,
  assertCanPublish,
  PaywallError,
} from "@/lib/publishLimit";
import { LIMITE_GRATIS } from "@/config/marketplacePlans";

// Helpers de fábrica de anúncios para os cenários de negócio.
const ativos = (n: number) => Array.from({ length: n }, (_, i) => ({ status: "ativo" as const, id: `a${i}` }));
const mistos = (ativosN: number, rascunhos: number, arquivados: number) => [
  ...Array.from({ length: ativosN }, () => ({ status: "ativo" })),
  ...Array.from({ length: rascunhos }, () => ({ status: "rascunho" })),
  ...Array.from({ length: arquivados }, () => ({ status: "arquivado" })),
];

describe("Paywall — limite de 10 publicações gratuitas", () => {
  it("conta apenas anúncios com status 'ativo' (ignora rascunho e arquivado)", () => {
    expect(countActive(mistos(7, 5, 4))).toBe(7);
    const st = computePublishStatus(mistos(7, 5, 4), false);
    expect(st.active_count).toBe(7);
    expect(st.can_publish).toBe(true);
    expect(st.restantes).toBe(LIMITE_GRATIS - 7);
  });

  it("permite publicar com 9 ativos (abaixo do limite)", () => {
    expect(canUserPublish(ativos(9), false)).toBe(true);
    expect(() => assertCanPublish(ativos(9), false)).not.toThrow();
  });

  it("BLOQUEIA a criação do 11º anúncio: com 10 ativos o paywall barra", () => {
    const status = computePublishStatus(ativos(10), false);
    expect(status.active_count).toBe(10);
    expect(status.can_publish).toBe(false);
    expect(status.restantes).toBe(0);
    // Tentar criar o 11º dispara PaywallError (gatilho do componente de paywall)
    expect(() => assertCanPublish(ativos(10), false)).toThrow(PaywallError);
  });

  it("LIBERAÇÃO DINÂMICA: deletar 1 (10 → 9) decrementa o contador e libera publicação", () => {
    let lista = ativos(10);
    expect(canUserPublish(lista, false)).toBe(false);

    // Usuário deleta um anúncio antigo
    lista = lista.slice(1); // agora 9 ativos
    const status = computePublishStatus(lista, false);
    expect(status.active_count).toBe(9);
    expect(status.can_publish).toBe(true);
    expect(() => assertCanPublish(lista, false)).not.toThrow();
  });

  it("usuário PRO tem publicações ilimitadas mesmo acima do limite gratuito", () => {
    const status = computePublishStatus(ativos(25), true);
    expect(status.is_pro).toBe(true);
    expect(status.can_publish).toBe(true);
    expect(() => assertCanPublish(ativos(25), true)).not.toThrow();
  });

  it("PaywallError carrega o nome e a mensagem padrão", () => {
    try {
      assertCanPublish(ativos(LIMITE_GRATIS), false);
      throw new Error("deveria ter lançado");
    } catch (e) {
      expect(e).toBeInstanceOf(PaywallError);
      expect((e as PaywallError).name).toBe("PaywallError");
    }
  });
});
