import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchRequest {
  items: { descricao: string; item: string }[];
  regiao?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { items, regiao }: MatchRequest = await req.json();

    if (!items?.length) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, any> = {};

    for (const item of items) {
      // Extract key terms from description for text search
      const terms = item.descricao
        .replace(/[^\w\sáéíóúãõâêîôûç]/gi, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2)
        .slice(0, 5)
        .join(" & ");

      // Try full-text search first
      let query = supabase
        .from("referencia_sinapi")
        .select("*")
        .textSearch("descricao", terms, { type: "plain", config: "portuguese" });

      if (regiao) {
        query = query.eq("regiao", regiao);
      }

      const { data: ftsResults } = await query.limit(5);

      if (ftsResults?.length) {
        results[item.item] = {
          matched: true,
          matches: ftsResults.map((r: any) => ({
            id: r.id,
            codigo: r.codigo,
            descricao: r.descricao,
            unidade: r.unidade,
            preco_material: r.preco_material,
            preco_mao_de_obra: r.preco_mao_de_obra,
            regiao: r.regiao,
            mes_ano: r.mes_ano,
          })),
        };
        continue;
      }

      // Fallback: ILIKE search with first 2 significant words
      const keywords = item.descricao
        .split(/\s+/)
        .filter((t) => t.length > 3)
        .slice(0, 2);

      if (keywords.length > 0) {
        let ilikeQuery = supabase.from("referencia_sinapi").select("*");
        for (const kw of keywords) {
          ilikeQuery = ilikeQuery.ilike("descricao", `%${kw}%`);
        }
        if (regiao) {
          ilikeQuery = ilikeQuery.eq("regiao", regiao);
        }
        const { data: ilikeResults } = await ilikeQuery.limit(5);

        if (ilikeResults?.length) {
          results[item.item] = {
            matched: true,
            matches: ilikeResults.map((r: any) => ({
              id: r.id,
              codigo: r.codigo,
              descricao: r.descricao,
              unidade: r.unidade,
              preco_material: r.preco_material,
              preco_mao_de_obra: r.preco_mao_de_obra,
              regiao: r.regiao,
              mes_ano: r.mes_ano,
            })),
          };
          continue;
        }
      }

      results[item.item] = { matched: false, matches: [] };
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("match-sinapi error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
