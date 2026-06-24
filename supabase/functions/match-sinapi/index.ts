import { corsHeaders, getAuthenticatedContext, HttpError, json, toErrorResponse } from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await getAuthenticatedContext(req);
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      throw new HttpError(500, "OPENAI_API_KEY não está configurada", "CONFIG_ERROR", false);
    }

    const body = await req.json();
    let items = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      const measurements = body?.measurements;
      if (Array.isArray(measurements) && measurements.length > 0) {
        items = measurements.map((measurement, index) => ({
          item: measurement.nome_busca || measurement.descricao || `medido_${index + 1}`,
          descricao: measurement.nome_busca || measurement.descricao || "",
        }));
      } else {
        throw new HttpError(400, "items ou measurements deve ser um array não vazio", "INVALID_INPUT");
      }
    }

    const trimmedItems = items
      .slice(0, 100)
      .map((item: any, index: number) => ({
        item: String(item?.item || `item_${index + 1}`).slice(0, 80),
        descricao: String(item?.descricao || "").trim().slice(0, 500),
      }))
      .filter((item: any) => item.descricao.length > 0);

    const results: Record<string, any> = {};

    for (const item of trimmedItems) {
      try {
        const openAiResp = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: item.descricao,
          }),
        });

        if (!openAiResp.ok) {
          throw new HttpError(502, "Falha ao gerar embedding.", "OPENAI_UPSTREAM_ERROR", false);
        }

        const embeddingData = await openAiResp.json();
        const queryVector = embeddingData?.data?.[0]?.embedding;
        if (!Array.isArray(queryVector)) {
          throw new HttpError(502, "Embedding inválido retornado pela IA.", "EMBEDDING_ERROR", false);
        }

        const { data: matches, error: rpcError } = await ctx.adminClient.rpc("buscar_insumo_semantico", {
          query_embedding: queryVector,
          match_threshold: 0.25,
          match_count: 3,
        });

        if (rpcError) throw rpcError;

        if (matches && matches.length > 0) {
          results[item.item] = {
            matched: true,
            confidence: matches[0].similarity > 0.7 ? "alta" : "media",
            best_score: matches[0].similarity,
            matches: matches.map((match: any) => ({
              codigo: match.codigo,
              descricao: match.descricao,
              unidade: match.unidade,
              preco_material: match.preco_material,
              preco_mao_de_obra: match.preco_mao_de_obra,
            })),
          };
        } else {
          results[item.item] = { matched: false, matches: [] };
        }
      } catch (itemError: any) {
        console.warn(`[match-sinapi] item sem conciliação: ${item.item}`, itemError?.message || itemError);
        results[item.item] = { matched: false, matches: [] };
      }
    }

    return json({ results, requested_by: ctx.user.id });
  } catch (error) {
    return toErrorResponse(error, "Não foi possível conciliar os itens com a base SINAPI.");
  }
});
