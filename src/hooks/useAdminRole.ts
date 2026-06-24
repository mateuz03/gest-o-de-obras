import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface UseAdminRoleResult {
  isAdmin: boolean;
  isAdminLoading: boolean;
}

export function useAdminRole(userId?: string | null): UseAdminRoleResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(Boolean(userId));

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      if (!userId) {
        if (!cancelled) {
          setIsAdmin(false);
          setIsAdminLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsAdmin(false);
        setIsAdminLoading(true);
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (!cancelled) {
        setIsAdmin(!error && !!data);
        setIsAdminLoading(false);
      }
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { isAdmin, isAdminLoading };
}
