import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  GoogleGenerativeAI,
  SchemaType,
  type Content,
} from "npm:@google/generative-ai@^0.21.0";

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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

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

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const buildModel = (modelName: string) => genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt,
      tools: [
        {
          functionDeclarations: [
            {
              name: "propor_edicao_orcamento",
              description:
                "Propor uma alteração em um item específico do orçamento. A mudança só será aplicada após o usuário clicar em Aprovar.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  id_do_item: {
                    type: SchemaType.STRING,
                    description: "ID exato do item no orçamento (campo 'id' da lista de itens).",
                  },
                  novo_nome: {
                    type: SchemaType.STRING,
                    description: "Nova descrição do item. Use o atual se não mudar.",
                  },
                  nova_quantidade: {
                    type: SchemaType.NUMBER,
                    description: "Nova quantidade. Use a atual se não mudar.",
                  },
                  novo_preco_unitario: {
                    type: SchemaType.NUMBER,
                    description: "Novo preço unitário em R$. Use o atual se não mudar.",
                  },
                  justificativa_da_mudanca: {
                    type: SchemaType.STRING,
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
              },
            },
          ],
        },
      ],
    });

    // Map OpenAI-style messages to Gemini Content[]
    const contents: Content[] = messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    let result;
    try {
      result = await model.generateContent({ contents });
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error("Gemini error:", msg);
      if (/quota|rate|429/i.test(msg)) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições da API Gemini atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "Erro ao chamar Gemini." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = result.response;
    let text = "";
    try { text = response.text(); } catch { text = ""; }

    let proposal: any = null;
    const calls = response.functionCalls?.() || [];
    if (calls.length > 0) {
      const tc = calls.find((c: any) => c.name === "propor_edicao_orcamento") || calls[0];
      if (tc?.name === "propor_edicao_orcamento") {
        proposal = tc.args || null;
      }
    }

    return new Response(
      JSON.stringify({
        reply: text || (proposal ? "Tenho uma proposta de alteração para você revisar:" : ""),
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
