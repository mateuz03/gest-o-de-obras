import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export interface PlatformFlags {
  maintenance_mode: boolean;
  maintenance_message: string;
  seller_onboarding_open: boolean;
}

const DEFAULT_FLAGS: PlatformFlags = {
  maintenance_mode: false,
  maintenance_message: "A plataforma está temporariamente em manutenção. Tente novamente em instantes.",
  seller_onboarding_open: true,
};

export function usePlatformFlags() {
  const [flags, setFlags] = useState<PlatformFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFlags() {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_platform_flags");
        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        if (!cancelled && row) {
          setFlags({
            maintenance_mode: Boolean(row.maintenance_mode),
            maintenance_message:
              typeof row.maintenance_message === "string" && row.maintenance_message.trim()
                ? row.maintenance_message
                : DEFAULT_FLAGS.maintenance_message,
            seller_onboarding_open: row.seller_onboarding_open !== false,
          });
        }
      } catch {
        if (!cancelled) setFlags(DEFAULT_FLAGS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFlags();

    return () => {
      cancelled = true;
    };
  }, []);

  return { flags, loading };
}
