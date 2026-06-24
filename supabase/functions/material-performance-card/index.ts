import { corsHeaders, getAuthenticatedContext, HttpError, json, toErrorResponse } from "../_shared/security.ts";

const SYSTEM_PROMPT = `Você é um Engenheiro Civil sênior especialista em especificação de materiais.
Para o material informado, retorne 3 alternativas comparáveis: PREMIUM, PADRÃO e ECONÔMICA.
Cada alternativa deve incluir:
- nome comercial típico
- preço unitário estimado (R$) realista no Brasil para a unidade do item
- durabilidade estimada em anos
- prós (1 frase curta)
- contras (1 frase curta)

Responda APENAS com JSON válido neste formato exato:
{
  "categoria_inferida": "string",
  "termo_busca_manual": "string curta para Google",
  "opcoes": [
    {"tier":"premium","nome":"...","preco_unitario":0,"durabilidade_anos":0,"pros":"...","contras":"..."},
    {"tier":"padrao","nome":"...","preco_unitario":0,"durabilidade_anos":0,"pros":"...","contras":"..."},
    {"tier":"economica","nome":"...","preco_unitario":0,"durabilidade_anos":0,"pros":"...","contras":"..."}
  ]
}`;

function safeJsonParse(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function extractKeywords(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .slice(0, 4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ctx = await getAuthenticatedContext(req);
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new HttpError(500, "Configuração de IA ausente.", "CONFIG_ERROR", false);
    }

    const body = await req.json();
    const itemDescricao = String(body?.item_descricao || "").trim();
    const unidade = String(body?.unidade || "un").trim();
    const quantidade = Number(body?.quantidade || 0);
    const precoAtualUnit = Number(body?.preco_atual_unit || 0);
    const totalObra = Number(body?.total_obra || 0);
    const bdiPercent = Number(body?.bdi_percent || 0);

    if (!itemDescricao) {
      throw new HttpError(400, "item_descricao é obrigatório", "INVALID_INPUT");
    }

    const userPrompt = `Material atual: "${itemDescricao}"
Unidade: ${unidade}
Quantidade na obra: ${quantidade}
Preço unitário atual estimado: R$ ${precoAtualUnit.toFixed(2)}

Gere as 3 alternativas compatíveis com esse material.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return json({ error: "Limite de uso da IA atingido. Tente novamente em alguns minutos." }, 429);
      }
      if (aiResponse.status === 402) {
        return json({ error: "Créditos de IA esgotados." }, 402);
      }
      throw new HttpError(502, "Falha temporária no provedor de IA.", "AI_UPSTREAM_ERROR", false);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(content);

    if (!parsed || !Array.isArray(parsed.opcoes)) {
      throw new HttpError(502, "Não foi possível interpretar a resposta da IA.", "AI_PARSE_ERROR");
    }

    const keywords = extractKeywords(itemDescricao);
    let sinapiMatches: any[] = [];

    if (keywords.length > 0) {
      const primaryKeyword = keywords[0];
      const { data: candidates, error } = await ctx.adminClient
        .from("referencia_sinapi")
        .select("codigo, descricao, unidade, preco_material, preco_mao_de_obra")
        .ilike("descricao", `%${primaryKeyword}%`)
        .limit(40);

      if (error) throw error;

      sinapiMatches = (candidates || [])
        .filter((row) => {
          const descricao = String(row.descricao || "").toLowerCase();
          return keywords.every((keyword) => descricao.includes(keyword));
        })
        .slice(0, 10);
    }

    const enriched = parsed.opcoes.map((opt: any, idx: number) => {
      const precoUnit = Number(opt.preco_unitario) || 0;
      const subtotalNovo = precoUnit * quantidade;
      const subtotalAtual = precoAtualUnit * quantidade;
      const diffMaterial = subtotalNovo - subtotalAtual;
      const diffComBdi = diffMaterial * (1 + bdiPercent / 100);
      const novoTotalObra = totalObra + diffComBdi;
      const pctImpacto = totalObra > 0 ? (diffComBdi / totalObra) * 100 : 0;
      const sinapiRef = sinapiMatches[idx] || null;

      return {
        ...opt,
        preco_unitario: precoUnit,
        subtotal_novo: subtotalNovo,
        subtotal_atual: subtotalAtual,
        diferenca_material: diffMaterial,
        diferenca_com_bdi: diffComBdi,
        novo_total_obra: novoTotalObra,
        pct_impacto_total: pctImpacto,
        sinapi_ref: sinapiRef
          ? {
              codigo: sinapiRef.codigo,
              descricao: sinapiRef.descricao,
              unidade: sinapiRef.unidade,
              preco_total:
                (Number(sinapiRef.preco_material) || 0) + (Number(sinapiRef.preco_mao_de_obra) || 0),
            }
          : null,
      };
    });

    return json({
      item_descricao: itemDescricao,
      unidade,
      quantidade,
      preco_atual_unit: precoAtualUnit,
      categoria_inferida: parsed.categoria_inferida || "",
      termo_busca_manual: parsed.termo_busca_manual || itemDescricao,
      opcoes: enriched,
      requested_by: ctx.user.id,
    });
  } catch (error) {
    return toErrorResponse(error, "Não foi possível gerar o comparativo de materiais.");
  }
});
