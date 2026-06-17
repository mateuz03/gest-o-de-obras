import { supabase } from "@/integrations/supabase/client";

export type MarketplaceEventType =
  | "feature_click"
  | "feature_conversion"
  | "item_impression"
  | "item_click";

export type ListingKind = "featured" | "organic";

interface TrackParams {
  eventType: MarketplaceEventType;
  targetType?: "produto" | "loja" | "plano";
  targetId?: string | null;
  isFeatured?: boolean;
  metadata?: Record<string, unknown>;
}

interface MarketplaceEventRow {
  event_type: MarketplaceEventType;
  user_id: string | null;
  target_type: string | null;
  target_id: string | null;
  is_featured: boolean;
  metadata: never;
}

/**
 * Registra um evento avulso de telemetria do marketplace. Falhas são silenciosas
 * para nunca quebrar a experiência do usuário.
 */
export async function trackMarketplaceEvent(params: TrackParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("marketplace_events").insert({
      event_type: params.eventType,
      user_id: user?.id ?? null,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      is_featured: params.isFeatured ?? false,
      metadata: (params.metadata ?? {}) as never,
    });
  } catch {
    /* telemetria nunca deve interromper o fluxo */
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Camada de buffer de IMPRESSÕES
//
// Para evitar sobrecarga no banco a cada paginação/scroll do usuário, as
// impressões são acumuladas em memória (deduplicadas por produto+tipo) e
// persistidas em LOTE — uma única chamada de insert. Numa arquitetura com
// Redis, esta mesma camada usaria INCR/HINCRBY como buffer distribuído; aqui
// o buffer é local ao cliente e é descarregado periodicamente, ao trocar de
// aba ou ao sair da página.
// ───────────────────────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 4000;
const MAX_BUFFER = 60;

interface PendingImpression {
  targetId: string;
  isFeatured: boolean;
}

const impressionBuffer = new Map<string, PendingImpression>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let unloadHookInstalled = false;

function installUnloadHook() {
  if (unloadHookInstalled || typeof window === "undefined") return;
  unloadHookInstalled = true;
  // Garante o descarregamento ao fechar/ocultar a aba.
  window.addEventListener("pagehide", () => void flushImpressions());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushImpressions();
  });
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushImpressions();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Enfileira a impressão de um item. Deduplicada por (item + tipo de listagem)
 * dentro da janela de buffer — uma rolagem repetida não inflaciona o número.
 */
export function queueImpression(targetId: string, kind: ListingKind): void {
  if (!targetId) return;
  installUnloadHook();
  const key = `${kind}:${targetId}`;
  impressionBuffer.set(key, { targetId, isFeatured: kind === "featured" });
  if (impressionBuffer.size >= MAX_BUFFER) {
    void flushImpressions();
  } else {
    scheduleFlush();
  }
}

/** Enfileira impressões de uma página inteira de itens de uma só vez. */
export function queueImpressions(items: { id: string }[], kind: ListingKind): void {
  for (const it of items) queueImpression(it.id, kind);
}

/** Descarrega o buffer de impressões para o banco numa única operação em lote. */
export async function flushImpressions(): Promise<void> {
  if (impressionBuffer.size === 0) return;
  const pending = Array.from(impressionBuffer.values());
  impressionBuffer.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const rows: MarketplaceEventRow[] = pending.map((p) => ({
      event_type: "item_impression",
      user_id: user?.id ?? null,
      target_type: "produto",
      target_id: p.targetId,
      is_featured: p.isFeatured,
      metadata: {} as never,
    }));
    await supabase.from("marketplace_events").insert(rows);
  } catch {
    /* telemetria nunca deve interromper o fluxo */
  }
}

/** Registra o clique em um item, separando destacado de orgânico. */
export function trackItemClick(targetId: string, kind: ListingKind): Promise<void> {
  return trackMarketplaceEvent({
    eventType: "item_click",
    targetType: "produto",
    targetId,
    isFeatured: kind === "featured",
  });
}
