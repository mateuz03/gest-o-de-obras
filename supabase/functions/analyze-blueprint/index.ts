import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um Engenheiro Civil e Orçamentista especializado em análise de plantas baixas.

Ao receber uma imagem de planta baixa, você deve:

1. IDENTIFICAR A ESCALA:
   - Procure por indicadores de escala na planta (cotas numéricas, escala gráfica, legenda "Escala: 1:50")
   - Se houver cotas (dimensões escritas), use-as como referência principal
   - Se não houver escala explícita, use proporções típicas de cômodos residenciais brasileiros para estimar
   - Se o usuário informou a escala, use a escala informada

2. MEDIR DIMENSÕES:
   - Identifique cada cômodo, parede, porta e janela
   - Calcule comprimentos de paredes usando a escala detectada
   - Considere pé-direito padrão de 2,80m (residencial brasileiro)

3. CALCULAR MATERIAIS com base nas dimensões reais:

   ESTRUTURA:
   - Tijolos: considere 25 tijolos/m² de parede (tijolo cerâmico 9 furos)
   - Cimento: 1 saco de 50kg a cada 7m² de alvenaria
   - Areia: 0,04m³ por m² de alvenaria
   - Vergalhões: calcule baseado em vigas e pilares necessários

   ACABAMENTO:
   - Piso: área total dos cômodos + 10% de perda
   - Tinta: 1 lata de 18L cobre ~120m² (2 demãos) — calcule área de parede
   - Gesso: área do forro = área do piso

   INSTALAÇÕES ELÉTRICAS (detalhar CADA item separadamente):
   - Pontos de luz: contar cada ponto visível na planta (identificar se é lâmpada, spot, arandela)
   - Pontos de tomada: contar cada ponto (separar tomadas baixas 30cm e altas 1,10m/2,00m)
   - Interruptores: quantidade de módulos — especificar simples, paralelo (three-way) e intermediário
   - Cabo azul (neutro) 2,5mm²: calcular metragem total baseado no percurso real da planta
   - Cabo verde/amarelo (terra) 2,5mm²: calcular metragem total
   - Cabo vermelho (fase) 2,5mm²: calcular metragem total para circuitos de iluminação
   - Cabo preto (fase) 2,5mm²: calcular metragem total para circuitos de tomadas
   - Cabo 4mm² (chuveiro, ar-condicionado): metragem para circuitos dedicados
   - Cabo 6mm² (alimentação geral): metragem do quadro ao medidor
   - Disjuntores: quantidade e amperagem (10A iluminação, 20A tomadas, 25A chuveiro, 32A ar-condicionado)
   - Disjuntor geral (DR): especificar amperagem
   - Quadro de distribuição: tamanho baseado no número de circuitos
   - Eletrodutos corrugados amarelos 3/4": metragem para iluminação e tomadas
   - Eletrodutos corrugados amarelos 1": metragem para circuitos maiores
   - Caixas de passagem 4x2": quantidade (uma por ponto de tomada/interruptor)
   - Caixas de passagem 4x4" octogonais: quantidade (uma por ponto de luz)
   - Fita isolante, conectores de emenda, abraçadeiras: quantidade estimada

   INSTALAÇÕES HIDRÁULICAS (detalhar CADA item separadamente):
   - Tubos PVC soldável 25mm (água fria ramais): metragem baseada no percurso real da planta
   - Tubos PVC soldável 32mm (água fria alimentação): metragem
   - Tubos CPVC ou PPR 22mm (água quente): metragem se houver aquecedor
   - Tubos PVC esgoto 40mm: para lavatórios, pias e tanques
   - Tubos PVC esgoto 50mm: para ralos e máquina de lavar
   - Tubos PVC esgoto 100mm: para vasos sanitários
   - Conexões (joelhos 90°, tês, luvas, caps): estimar quantidade por ponto de consumo
   - Registros de gaveta 25mm: um por ambiente molhado
   - Registros de pressão 25mm: um por ponto de chuveiro/ducha
   - Caixas sifonadas 100x100x50mm: uma por ambiente molhado
   - Ralos secos 100mm: quantidade por ambiente
   - Válvula de descarga ou caixa acoplada: uma por vaso sanitário
   - Sifão para pia e lavatório: quantidade por ponto

4. RECOMENDAR MARCAS:
   - Sugira 3 marcas brasileiras por custo-benefício para cada categoria principal
   - Considere a região informada pelo usuário se disponível

Retorne APENAS um JSON válido (sem markdown, sem backticks) com esta estrutura exata:
{
  "resumo": "Descrição breve da planta analisada",
  "area_total_m2": 0,
  "escala_detectada": "1:50",
  "estrutura": [
    {"material": "Nome", "quantidade": "0", "unidade": "un/m³/kg", "observacao": "detalhes"}
  ],
  "acabamento": [
    {"material": "Nome", "quantidade": "0", "unidade": "m²/latas", "observacao": "detalhes"}
  ],
   "instalacoes_eletricas": [
     {"material": "Nome específico (ex: Cabo azul 2,5mm²)", "quantidade": "0", "unidade": "metros/un", "observacao": "detalhes do cálculo"}
   ],
   "instalacoes_hidraulicas": [
     {"material": "Nome específico (ex: Tubo PVC 25mm)", "quantidade": "0", "unidade": "metros/un", "observacao": "detalhes do cálculo"}
   ],
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

    const { image_base64, mime_type, escala, tipo_construcao, regiao, instrucoes_adicionais } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userPrompt = "Analise esta planta baixa e retorne a estimativa completa de materiais.";
    if (escala) userPrompt += ` A escala informada pelo usuário é ${escala}.`;
    if (tipo_construcao) userPrompt += ` Tipo de construção: ${tipo_construcao}.`;
    if (regiao) userPrompt += ` Região: ${regiao} (considere para recomendações de marcas).`;
    if (instrucoes_adicionais) userPrompt += `\n\nInstruções adicionais do usuário: ${instrucoes_adicionais}`;

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
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime_type || "image/jpeg"};base64,${image_base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in AI response");

    // Parse JSON from response (handle potential markdown wrapping)
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
