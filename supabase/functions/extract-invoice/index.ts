import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em visão computacional e contabilidade para construção civil.
Sua tarefa é analisar a imagem/texto de uma Nota Fiscal de materiais de construção.

Extraia os seguintes campos em formato JSON:

1. fornecedor_nome (Nome da empresa)
2. fornecedor_cnpj (CNPJ formatado)
3. numero_nota (Número da NF)
4. valor_total (valor total da nota)
5. data_emissao (formato YYYY-MM-DD)
6. impostos_retidos (valor de impostos retidos, 0 se não houver)
7. forma_pagamento (se identificável)
8. itens (lista contendo):
   - nome_produto: nome completo do produto
   - quantidade: número
   - unidade_medida: un, kg, m, m², saco, lata, etc.
   - valor_unitario: preço unitário
   - valor_total: preço total do item
   - categoria: classifique em uma das categorias:
     * "Materiais Básicos" (cimento, areia, brita, cal, argamassa)
     * "Estrutura" (aço, ferro, vergalhão, tela, forma)
     * "Alvenaria" (tijolo, bloco, canaleta)
     * "Hidráulica" (tubos PVC, conexões, registros, torneiras, caixas d'água)
     * "Elétrica" (cabos, fios, disjuntores, tomadas, interruptores, eletrodutos)
     * "Acabamento" (piso, azulejo, porcelanato, rejunte, pastilha)
     * "Pintura" (tinta, massa corrida, selador, lixa, rolo, pincel)
     * "Cobertura" (telha, cumeeira, rufo, calha)
     * "Esquadrias" (porta, janela, fechadura, dobradiça)
     * "Impermeabilização" (manta, impermeabilizante)
     * "Louças e Metais" (vaso, pia, lavatório, torneira, chuveiro)
     * "Ferramentas" (se for ferramenta)
     * "Outros" (se não se encaixar)

REGRAS:
- Se um campo não for legível, use null
- Valores monetários devem ser números (sem R$)
- Se a imagem estiver de cabeça para baixo ou torta, tente ler mesmo assim
- Identifique impostos retidos (ICMS, ISS, etc.) separadamente
- Retorne APENAS o JSON válido, sem markdown, sem backticks`;

const JSON_STRUCTURE = `
Retorne APENAS um JSON válido com esta estrutura:
{
  "fornecedor_nome": "Nome da Empresa",
  "fornecedor_cnpj": "00.000.000/0000-00",
  "numero_nota": "12345",
  "valor_total": 1500.00,
  "data_emissao": "2025-01-15",
  "impostos_retidos": 0,
  "forma_pagamento": "Boleto 30 dias",
  "itens": [
    {
      "nome_produto": "Cimento CP II 50kg",
      "quantidade": 10,
      "unidade_medida": "saco",
      "valor_unitario": 35.90,
      "valor_total": 359.00,
      "categoria": "Materiais Básicos"
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { images } = await req.json();

    if (!images || !images.length) {
      return new Response(JSON.stringify({ error: "Envie pelo menos uma imagem da nota fiscal" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentParts: any[] = [
      { type: "text", text: "Analise esta(s) imagem(ns) de Nota Fiscal e extraia todos os dados no formato JSON solicitado." },
    ];

    for (const img of images) {
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:${img.mime_type || "image/jpeg"};base64,${img.base64}` },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + JSON_STRUCTURE },
          { role: "user", content: contentParts },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Não foi possível interpretar a nota fiscal. Tente com uma imagem mais nítida.");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("extract-invoice error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
