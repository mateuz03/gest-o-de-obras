import { supabase } from "@/integrations/supabase/client";

export type MarketplaceEventType =
  | "feature_click"
  | "feature_conversion"
  | "item_impression"
  | "item_click";

interface TrackParams {
  eventType: MarketplaceEventType;
  targetType?: "produto" | "loja" | "plano";
  targetId?: string | null;
  isFeatured?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Registra um evento de telemetria do marketplace. Falhas são silenciosas
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
