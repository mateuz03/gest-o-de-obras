import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLUEPRINT_SYSTEM_PROMPT = `Você é um Engenheiro Civil e Orçamentista especializado em análise de plantas baixas e orçamentos de obras no padrão brasileiro.

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
   - Local de aplicação (cômodo ou área onde o material será usado)
   - Fornecedor (se souber; caso contrário "—")
   - Marca (se souber; caso contrário "—")
   - Quantidade com perdas incluídas
   - Unidade (m², m³, m, un, kg, saco, lata, etc.)
   - Preço unitário R$ (usar referência SINAPI quando disponível)
   - Preço total R$
   - Código SINAPI (quando aplicável; caso contrário "")
   - Origem do preço: "SINAPI" ou "Sem correspondência SINAPI — estimativa de mercado"
   - Taxa de perda aplicada (ex: "5% cerâmica", "10% argamassa")

5. PREÇOS DE REFERÊNCIA SINAPI:
   - Usar a UF/cidade do projeto quando informada
   - Informar mês/ano da referência SINAPI usada

6. QUANTITATIVO POR CÔMODO:
   - Gerar também um quantitativo separado por cômodo
   - Cada cômodo com seus itens e subtotal

7. RESUMO FINAL:
   - Total materiais
   - Total mão de obra (se aplicável)
   - Total geral
   - BDI (se não informado pelo usuário, usar 25% como padrão)

8. RECOMENDAÇÕES DE MARCAS:
   - Sugira 3 marcas brasileiras por custo-benefício para cada categoria principal

DETALHAMENTO OBRIGATÓRIO DE INSTALAÇÕES ELÉTRICAS:
- Pontos de luz, tomadas, interruptores por tipo
- Cabos por cor e bitola (azul/neutro, verde/terra, vermelho/fase, preto/fase)
- Disjuntores por amperagem, quadro de distribuição
- Eletrodutos e caixas

DETALHAMENTO OBRIGATÓRIO DE INSTALAÇÕES HIDRÁULICAS:
- Tubos PVC por diâmetro, CPVC/PPR para água quente
- Conexões, registros, caixas sifonadas, ralos, válvulas`;

const PHOTO_SYSTEM_PROMPT = `Você é um Engenheiro Civil e Orçamentista especializado em análise de ambientes reais a partir de fotos e orçamentos de obras/reformas no padrão brasileiro.

Ao receber fotos de um ambiente real (banheiro, cozinha, sala, quarto, etc.), você deve:

1. IDENTIFICAR O AMBIENTE:
   - Determine o tipo de cômodo/ambiente fotografado
   - Liste todos os elementos visíveis (piso, revestimento, louças, metais, iluminação, esquadrias, etc.)

2. ESTIMAR DIMENSÕES:
   - Use objetos de referência visíveis para estimar dimensões (portas padrão ~2,10m x 0,80m, tomadas a ~30cm do chão, azulejos padrão 30x60cm, etc.)
   - Se houver trena ou objeto de referência na foto, use como base principal
   - Informe SEMPRE a margem de erro estimada (ex: "±15%")
   - Calcule área estimada do piso, paredes, e perímetro

3. ANALISAR MATERIAIS EXISTENTES:
   - Identifique tipo de piso (cerâmica, porcelanato, vinílico, etc.) e formato estimado
   - Identifique revestimentos de parede (azulejo, pintura, pastilha, etc.)
   - Identifique louças e metais (marca se visível, tipo, estado de conservação)
   - Identifique iluminação (spots, plafons, luminárias)
   - Identifique esquadrias (portas, janelas, box)
   - Identifique instalações visíveis (torneiras, registros, ralos, tomadas, interruptores)

4. GERAR ORÇAMENTO DE REFORMA/SUBSTITUIÇÃO organizado por MACROETAPAS:
   - Demolição e remoção (se necessário)
   - Revestimentos e pisos
   - Instalações hidráulicas
   - Instalações elétricas
   - Louças e metais
   - Esquadrias
   - Pintura
   - Complementares / limpeza

5. PARA CADA ITEM do orçamento:
   - Código do item (estruturado por grupo)
   - Descrição detalhada
   - Local de aplicação (nome do ambiente)
   - Fornecedor (se souber; caso contrário "—")
   - Marca (se souber; caso contrário "—")
   - Quantidade com perdas incluídas
   - Unidade
   - Preço unitário R$
   - Preço total R$
   - Código SINAPI (quando aplicável; caso contrário "")
   - Origem do preço: "SINAPI" ou "Sem correspondência SINAPI — estimativa de mercado"
   - Taxa de perda aplicada

6. QUANTITATIVO POR CÔMODO:
   - Agrupar todos os materiais pelo ambiente identificado

7. RESUMO FINAL:
   - Total materiais, Total mão de obra, Total geral, BDI

8. RECOMENDAÇÕES DE MARCAS:
   - Sugira 3 marcas brasileiras por custo-benefício

IMPORTANTE: Sempre informe no resumo que as medidas são ESTIMATIVAS baseadas em análise visual e que uma medição in loco é recomendada para precisão.`;

const JSON_STRUCTURE = `
Retorne APENAS um JSON válido (sem markdown, sem backticks) com esta estrutura:
{
  "resumo": "Descrição do ambiente/planta analisada",
  "area_total_m2": 0,
  "escala_detectada": "estimativa visual" ou "1:50",
  "referencia_sinapi": "SINAPI - UF/Mês/Ano",
  "macro_etapas": [
    {
      "nome": "Nome da Macroetapa",
      "itens": [
        {
          "item": "1.1",
          "descricao": "Descrição completa do item",
          "local_aplicacao": "Sala",
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
      "comodo": "Banheiro",
      "itens": [...],
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

    const { images, escala, tipo_construcao, regiao, bdi_percentual, instrucoes_adicionais, modo_analise,
      area_m2, pe_direito, num_pavimentos, padrao_acabamento, tipo_fundacao, tipo_cobertura,
      num_quartos, num_banheiros, num_vagas } = await req.json();

    if (!images || !images.length) {
      return new Response(JSON.stringify({ error: "At least one image is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPhotoMode = modo_analise === "foto_ambiente";
    const systemPrompt = (isPhotoMode ? PHOTO_SYSTEM_PROMPT : BLUEPRINT_SYSTEM_PROMPT) + JSON_STRUCTURE;

    let userPrompt = isPhotoMode
      ? "Analise esta(s) foto(s) do ambiente real e retorne o orçamento de reforma/substituição completo no formato JSON solicitado."
      : "Analise esta(s) planta(s) baixa(s) e retorne o orçamento completo no formato JSON solicitado.";
    if (!isPhotoMode && escala && escala !== "auto") userPrompt += ` A escala informada é ${escala}.`;
    if (tipo_construcao) userPrompt += ` Tipo de construção: ${tipo_construcao}.`;
    if (regiao) userPrompt += ` Região: ${regiao} (use SINAPI desta UF/cidade).`;
    if (bdi_percentual && bdi_percentual !== 25) userPrompt += ` Use BDI de ${bdi_percentual}% (em vez do padrão de 25%).`;

    // New detailed parameters
    if (area_m2) userPrompt += ` IMPORTANTE: A área total construída é ${area_m2} m². Use este valor como referência principal — NÃO tente estimar a metragem pela planta.`;
    if (pe_direito) userPrompt += ` Pé-direito: ${pe_direito}m.`;
    if (num_pavimentos) userPrompt += ` Número de pavimentos: ${num_pavimentos}.`;
    if (padrao_acabamento) {
      const padraoMap: Record<string, string> = { popular: "Popular (materiais econômicos)", medio: "Médio (custo-benefício)", alto: "Alto (marcas premium)", luxo: "Luxo (materiais importados/top de linha)" };
      userPrompt += ` Padrão de acabamento: ${padraoMap[padrao_acabamento] || padrao_acabamento}. Ajuste os preços e marcas de acordo com este padrão.`;
    }
    if (num_quartos) userPrompt += ` Quartos: ${num_quartos}.`;
    if (num_banheiros) userPrompt += ` Banheiros: ${num_banheiros}.`;
    if (num_vagas) userPrompt += ` Vagas de garagem: ${num_vagas}.`;
    if (tipo_fundacao && tipo_fundacao !== "nao_sei") userPrompt += ` Tipo de fundação definida: ${tipo_fundacao}.`;
    if (tipo_cobertura && tipo_cobertura !== "nao_sei") userPrompt += ` Tipo de cobertura/telhado: ${tipo_cobertura}.`;

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
          { role: "system", content: systemPrompt },
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
