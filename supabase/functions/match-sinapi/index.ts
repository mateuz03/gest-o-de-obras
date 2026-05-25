import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { items, regiao } = await req.json();
  const results: Record<string, any> = {};

  for (const item of items) {
    // Chama a função SQL que criamos (buscar_item_sinapi)
    const { data, error } = await supabase.rpc("buscar_item_sinapi", {
      descricao_busca: item.descricao,
      uf_busca: regiao || "SP"
    });

    if (error || !data || data.length === 0) {
      results[item.item] = { matched: false, matches: [] };
    } else {
      results[item.item] = {
        matched: true,
        confidence: data[0].score > 0.6 ? "alta" : "media",
        best_score: data[0].score,
        matches: data
      };
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});