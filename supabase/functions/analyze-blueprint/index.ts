import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um Engenheiro Civil e Orçamentista especializado em análise de plantas baixas e orçamentos de obras no padrão brasileiro.

Ao receber uma ou mais imagens de planta baixa, você deve:

1. IDENTIFICAR A ESCALA:
   - Procure por indicadores de escala na planta (cotas numéricas, escala gráfica, legenda)
   - Se houver cotas, use-as como referência principal
   - Se a escala for incerta, informe no resumo e use a mais provável

2. MEDIR DIMENSÕES E CALCULAR ÁREAS:
   - Identifique cada cômodo com nome, área e perímetro
   - Calcule áreas e perímetros a partir da escala
   - Considere pé-direito padrão de 2,80m (residencial brasileiro)

3. GERAR ORÇAMENTO COMPLETO organizado por MACROETAPAS:
   - Serviços preliminares / canteiro
   - Terraplenagem
   - Fundação
   - Estrutura
   - Alvenaria e vedação
   - Cobertura
   - Esquadrias
   - Instalações hidráulicas (detalhar cada tubo por diâmetro, conexões, registros, etc.)
   - Instalações elétricas (detalhar cada cabo por cor e bitola, interruptores por tipo, disjuntores por amperagem, eletrodutos, caixas, etc.)
   - Revestimentos e pisos
   - Pintura
   - Louças e metais
   - Complementares / limpeza / entrega

4. PARA CADA ITEM do orçamento:
   - Código do item (estruturado por grupo, ex: 1.1, 1.2, 2.1...)
   - Descrição detalhada
   - Local de aplicação (cômodo ou área onde o material será usado, ex: "Sala", "Cozinha", "Banheiro 1", "Área externa", "Geral" se for para toda a obra)
   - Fornecedor (se souber; caso contrário "—")
   - Marca (se souber; caso contrário "—")
   - Quantidade com perdas incluídas (indicar taxa de perda na observação)
   - Unidade (m², m³, m, un, kg, saco, lata, etc.)
   - Preço unitário R$ (usar referência SINAPI quando disponível)
   - Preço total R$
   - Código SINAPI (quando aplicável; caso contrário "")
   - Origem do preço: "SINAPI" ou "Sem correspondência SINAPI — estimativa de mercado"
   - Taxa de perda aplicada (ex: "5% cerâmica", "10% argamassa")

5. PREÇOS DE REFERÊNCIA SINAPI:
   - Usar a UF/cidade do projeto quando informada
   - Informar mês/ano da referência SINAPI usada
   - Para itens sem correspondência SINAPI, usar estimativa de mercado e indicar explicitamente

6. QUANTITATIVO POR CÔMODO:
   - Gerar também um quantitativo separado por cômodo (sala, cozinha, quartos, banheiros, área externa, etc.)
   - Cada cômodo com seus itens e subtotal

7. RESUMO FINAL:
   - Total materiais
   - Total mão de obra (se aplicável)
   - Total geral
   - BDI (se não informado pelo usuário, usar 25% como padrão e indicar a premissa)

8. RECOMENDAÇÕES DE MARCAS:
   - Sugira 3 marcas brasileiras por custo-benefício para cada categoria principal

DETALHAMENTO OBRIGATÓRIO DE INSTALAÇÕES ELÉTRICAS:
- Pontos de luz: contar cada ponto visível (lâmpada, spot, arandela)
- Pontos de tomada: contar cada ponto (separar baixas 30cm e altas 1,10m/2,00m)
- Interruptores: módulos — simples, paralelo (three-way), intermediário
- Cabo azul (neutro) 2,5mm²: metragem total
- Cabo verde/amarelo (terra) 2,5mm²: metragem total
- Cabo vermelho (fase) 2,5mm²: metragem para iluminação
- Cabo preto (fase) 2,5mm²: metragem para tomadas
- Cabo 4mm² (chuveiro, ar-condicionado): metragem
- Cabo 6mm² (alimentação geral): metragem
- Disjuntores: quantidade e amperagem (10A, 20A, 25A, 32A)
- Disjuntor geral (DR)
- Quadro de distribuição
- Eletrodutos corrugados 3/4" e 1": metragem
- Caixas 4x2" e 4x4" octogonais: quantidade

DETALHAMENTO OBRIGATÓRIO DE INSTALAÇÕES HIDRÁULICAS:
- Tubos PVC soldável 25mm, 32mm: metragem
- Tubos CPVC/PPR 22mm (água quente): metragem
- Tubos PVC esgoto 40mm, 50mm, 100mm: metragem
- Conexões (joelhos 90°, tês, luvas, caps): quantidade
- Registros de gaveta e pressão: quantidade
- Caixas sifonadas, ralos, válvulas, sifões: quantidade

Retorne APENAS um JSON válido (sem markdown, sem backticks) com esta estrutura:
{
  "resumo": "Descrição da planta analisada",
  "area_total_m2": 0,
  "escala_detectada": "1:50",
  "referencia_sinapi": "SINAPI - UF/Mês/Ano",
  "macro_etapas": [
    {
      "nome": "Nome da Macroetapa",
      "itens": [
        {
          "item": "1.1",
          "descricao": "Descrição completa do item",
          "fornecedor": "—",
          "marca": "—",
          "quantidade": 0,
          "unidade": "m²",
          "preco_unitario": 0.00,
          "preco_total": 0.00,
          "codigo_sinapi": "12345",
          "origem_preco": "SINAPI",
          "perda_aplicada": "5%"
        }
      ],
      "subtotal": 0.00
    }
  ],
  "quantitativo_por_comodo": [
    {
      "comodo": "Sala",
      "itens": [
        {
          "item": "1.1",
          "descricao": "Descrição",
          "fornecedor": "—",
          "marca": "—",
          "quantidade": 0,
          "unidade": "m²",
          "preco_unitario": 0.00,
          "preco_total": 0.00,
          "codigo_sinapi": "",
          "origem_preco": "SINAPI",
          "perda_aplicada": ""
        }
      ],
      "subtotal": 0.00
    }
  ],
  "resumo_final": {
    "total_materiais": 0.00,
    "total_mao_de_obra": 0.00,
    "total_geral": 0.00,
    "bdi_percentual": 25,
    "bdi_valor": 0.00,
    "premissas_bdi": "BDI padrão de 25% aplicado"
  },
  "recomendacoes": [
    {
      "material": "Categoria",
      "marcas": [
        {"nome": "Marca", "justificativa": "Por que recomendada"}
      ]
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

    const { images, escala, tipo_construcao, regiao, instrucoes_adicionais } = await req.json();

    if (!images || !images.length) {
      return new Response(JSON.stringify({ error: "At least one image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userPrompt = "Analise esta(s) planta(s) baixa(s) e retorne o orçamento completo no formato solicitado.";
    if (escala && escala !== "auto") userPrompt += ` A escala informada é ${escala}.`;
    if (tipo_construcao) userPrompt += ` Tipo de construção: ${tipo_construcao}.`;
    if (regiao) userPrompt += ` Região: ${regiao} (use SINAPI desta UF/cidade).`;
    if (instrucoes_adicionais) userPrompt += `\n\nInstruções adicionais: ${instrucoes_adicionais}`;

    const contentParts: any[] = [{ type: "text", text: userPrompt }];
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
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-blueprint error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
