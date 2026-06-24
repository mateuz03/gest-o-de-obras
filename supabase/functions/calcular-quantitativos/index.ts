import { assertAnalysisAccess, corsHeaders, getAuthenticatedContext, HttpError, json, toErrorResponse } from "../_shared/security.ts";

type ServicoPayload = {
  codigo_servico?: string;
  quantidade?: number;
  analysis_id?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ctx = await getAuthenticatedContext(req);
    const body = await req.json();
    const servicos = Array.isArray(body?.servicos) ? (body.servicos as ServicoPayload[]) : [];
    const analysisId = typeof body?.analysis_id === "string" ? body.analysis_id : null;

    if (analysisId) {
      await assertAnalysisAccess(ctx.adminClient, ctx.user.id, analysisId);
    }

    if (servicos.length === 0) {
      throw new HttpError(400, "O payload deve conter um array de serviços.", "INVALID_INPUT");
    }

    const listaMateriaisAgrupada: Record<string, any> = {};

    for (const item of servicos) {
      const codigoServico = String(item.codigo_servico || "").trim();
      const quantidade = Number(item.quantidade || 0);
      if (!codigoServico || quantidade <= 0) continue;

      const { data: composicao, error } = await ctx.adminClient
        .from("composicoes_padrao")
        .select("insumos, nome_servico")
        .eq("codigo_servico", codigoServico)
        .single();

      if (error || !composicao) {
        console.warn("[calcular-quantitativos] serviço não encontrado:", codigoServico);
        continue;
      }

      const insumos = Array.isArray(composicao.insumos) ? composicao.insumos : [];
      for (const insumo of insumos) {
        const nomeBusca = String(insumo?.nome_busca || "").trim();
        const fatorPerda = Number(insumo?.fator_perda || 1);
        const quantidadePorUnidade = Number(insumo?.quantidade_por_unidade || 0);
        if (!nomeBusca || quantidadePorUnidade <= 0) continue;

        const quantidadeFinal = quantidade * quantidadePorUnidade * Math.max(fatorPerda, 0);
        if (!listaMateriaisAgrupada[nomeBusca]) {
          listaMateriaisAgrupada[nomeBusca] = {
            nome_busca: nomeBusca,
            tipo: String(insumo?.tipo || ""),
            quantidade_total: 0,
            origem: [] as string[],
          };
        }

        listaMateriaisAgrupada[nomeBusca].quantidade_total += quantidadeFinal;
        listaMateriaisAgrupada[nomeBusca].origem.push(composicao.nome_servico);
      }
    }

    return json({
      materiais: Object.values(listaMateriaisAgrupada),
    });
  } catch (error) {
    return toErrorResponse(error, "Não foi possível calcular os quantitativos.");
  }
});
