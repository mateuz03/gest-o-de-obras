import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não está configurada");
    }

    const body = await req.json();

    // Adaptação: suporta tanto items quanto measurements.
    let items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      // Se não veio items, tenta transformar measurements para o padrão.
      const measurements = body.measurements;
      if (Array.isArray(measurements) && measurements.length > 0) {
        items = measurements.map((m, idx) => ({
          item: m.nome_busca || m.descricao || `medido_${idx+1}`,
          descricao: m.nome_busca || m.descricao || "",
        }));
      } else {
        return new Response(
          JSON.stringify({ error: "items ou measurements deve ser um array não vazio" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const results: Record<string, any> = {};

    for (const item of items) {
      try {
        // 1. Gera o embedding do termo gerado pela IA em tempo real
        const openAiResp = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: item.descricao,
          }),
        });

        if (!openAiResp.ok) {
          const errorText = await openAiResp.text();
          throw new Error(`Falha ao gerar embedding na OpenAI: ${openAiResp.status} - ${errorText}`);
        }
        
        const embeddingData = await openAiResp.json();
        
        if (!embeddingData.data || !embeddingData.data[0] || !embeddingData.data[0].embedding) {
          throw new Error("Resposta de embedding inválida da OpenAI");
        }

        const queryVector = embeddingData.data[0].embedding;

        // 2. Executa a busca semântica por proximidade cossena no banco
        const { data: matches, error: rpcError } = await supabase.rpc("buscar_insumo_semantico", {
          query_embedding: queryVector,
          match_threshold: 0.25,
          match_count: 3
        });

        if (rpcError) {
          throw new Error(`Erro na RPC buscar_insumo_semantico: ${rpcError.message}`);
        }

        if (matches && matches.length > 0) {
          results[item.item] = {
            matched: true,
            confidence: matches[0].similarity > 0.7 ? "alta" : "media",
            best_score: matches[0].similarity,
            matches: matches.map((m: any) => ({
              codigo: m.codigo,
              descricao: m.descricao,
              unidade: m.unidade,
              preco_material: m.preco_material,
              preco_mao_de_obra: m.preco_mao_de_obra
            }))
          };
        } else {
          results[item.item] = { matched: false, matches: [] };
        }
      } catch (itemError: any) {
        console.error(`Erro ao processar item ${item.item}:`, itemError.message);
        results[item.item] = {
          matched: false,
          matches: [],
          error: itemError.message
        };
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("🚨 ERRO FATAL NO MATCH-SINAPI:", err.message, err.stack);

    return new Response(
      JSON.stringify({
        error: err.message || "Erro desconhecido na função match-sinapi"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});