import { corsHeaders, requireAdminContext, HttpError, json, toErrorResponse } from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ctx = await requireAdminContext(req);
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      throw new HttpError(500, "OPENAI_API_KEY não configurada.", "CONFIG_ERROR", false);
    }

    const { data: linhas, error } = await ctx.adminClient
      .from("tabela_sinapi")
      .select("codigo, descricao")
      .is("embedding", null)
      .limit(200);

    if (error) throw error;

    if (!linhas || linhas.length === 0) {
      return json({ ok: true, processed: 0, message: "Toda a base já foi vetorizada." });
    }

    const descricoes = linhas.map((linha) => linha.descricao);
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: descricoes,
      }),
    });

    if (!response.ok) {
      throw new HttpError(502, "Falha ao gerar embeddings.", "OPENAI_UPSTREAM_ERROR", false);
    }

    const openAiData = await response.json();
    const embeddings = Array.isArray(openAiData?.data) ? openAiData.data : [];

    for (let i = 0; i < linhas.length; i++) {
      await ctx.adminClient
        .from("tabela_sinapi")
        .update({ embedding: embeddings[i]?.embedding ?? null })
        .eq("codigo", linhas[i].codigo);
    }

    return json({ ok: true, processed: linhas.length });
  } catch (error) {
    return toErrorResponse(error, "Não foi possível vetorizar a base SINAPI.");
  }
});
