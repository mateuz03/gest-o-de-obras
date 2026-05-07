import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BudgetItemCtx {
  id: string;
  descricao: string;
  quantidade: number | string;
  unidade?: string;
  preco_unitario: number | string;
  etapa?: string;
}

const SYSTEM_BASE = `Você é o "Copiloto de Obra" da plataforma AI Construct, um agente especialista em orçamentos de construção civil no Brasil (referência SINAPI).

REGRAS:
1. Responda em português, de forma objetiva e técnica.
2. Você pode propor edições em itens do orçamento usando a tool "propor_edicao_orcamento".
3. NUNCA edite diretamente — apenas PROPOR. O usuário precisa aprovar.
4. Use SEMPRE o "id_do_item" exato do orçamento abaixo. Não invente IDs.
5. Se o usuário só quer conversar/tirar dúvida, responda em texto normal sem chamar a tool.
6. Ao propor uma alteração, preencha apenas os campos que mudam (deixe os demais iguais ao atual) e SEMPRE inclua a justificativa.
7. Use markdown quando útil (listas, negrito).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { messages, budget_items } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items: BudgetItemCtx[] = Array.isArray(budget_items) ? budget_items : [];
    const budgetCtx = items.length
      ? items
          .slice(0, 200)
          .map(
            (i) =>
              `- id="${i.id}" | ${i.etapa ? `[${i.etapa}] ` : ""}${i.descricao} | qtd=${i.quantidade} ${i.unidade || ""} | R$ unit=${i.preco_unitario}`,
          )
          .join("\n")
      : "(nenhum item no orçamento ainda)";

    const systemPrompt = `${SYSTEM_BASE}

ITENS ATUAIS DO ORÇAMENTO:
${budgetCtx}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "propor_edicao_orcamento",
          description:
            "Propor uma alteração em um item específico do orçamento. A mudança só será aplicada após o usuário clicar em Aprovar.",
          parameters: {
            type: "object",
            properties: {
              id_do_item: {
                type: "string",
                description: "ID exato do item no orçamento (campo 'id' da lista de itens).",
              },
              novo_nome: {
                type: "string",
                description: "Nova descrição do item. Use o atual se não mudar.",
              },
              nova_quantidade: {
                type: "number",
                description: "Nova quantidade. Use a atual se não mudar.",
              },
              novo_preco_unitario: {
                type: "number",
                description: "Novo preço unitário em R$. Use o atual se não mudar.",
              },
              justificativa_da_mudanca: {
                type: "string",
                description: "Explicação curta e técnica do motivo da alteração.",
              },
            },
            required: [
              "id_do_item",
              "novo_nome",
              "nova_quantidade",
              "novo_preco_unitario",
              "justificativa_da_mudanca",
            ],
            additionalProperties: false,
          },
        },
      },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados na Lovable AI. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const choice = data.choices?.[0]?.message;
    const content: string = choice?.content || "";
    const toolCalls = choice?.tool_calls || [];

    let proposal: any = null;
    if (toolCalls.length > 0) {
      const tc = toolCalls[0];
      if (tc.function?.name === "propor_edicao_orcamento") {
        try {
          proposal = JSON.parse(tc.function.arguments || "{}");
        } catch (e) {
          console.error("Failed to parse tool args:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        reply: content || (proposal ? "Tenho uma proposta de alteração para você revisar:" : ""),
        proposal,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("project-copilot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
