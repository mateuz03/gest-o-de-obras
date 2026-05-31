import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";

// Configuração de CORS para permitir que seu front-end acesse a função sem bloqueios
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Lida com a requisição inicial (preflight) do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // O front-end (ou a IA) vai enviar algo como:
    // { servicos: [{ codigo_servico: "piso_porcelanato", quantidade: 50 }, { codigo_servico: "reboco_massa_unica", quantidade: 30 }] }
    const { servicos } = await req.json();

    if (!servicos || !Array.isArray(servicos)) {
      throw new Error("O payload deve conter um array de 'servicos'.");
    }

    // Dicionário para agrupar materiais iguais de serviços diferentes
    const listaMateriaisAgrupada: Record<string, any> = {};

    for (const item of servicos) {
      const { codigo_servico, quantidade } = item;

      // Busca a receita de bolo do serviço no banco
      const { data: composicao, error } = await supabase
        .from("composicoes_padrao")
        .select("insumos, nome_servico")
        .eq("codigo_servico", codigo_servico)
        .single();

      if (error || !composicao) {
        console.warn(`⚠️ Serviço '${codigo_servico}' não encontrado na base. Pulando...`);
        continue;
      }

      // Calcula a quantidade final de cada material
      const insumos = composicao.insumos as any[];
      
      for (const insumo of insumos) {
        const quantidadeFinal = quantidade * insumo.quantidade_por_unidade * insumo.fator_perda;

        // Se o material já existe na nossa lista (ex: Cimento), nós apenas somamos
        if (listaMateriaisAgrupada[insumo.nome_busca]) {
          listaMateriaisAgrupada[insumo.nome_busca].quantidade_total += quantidadeFinal;
          listaMateriaisAgrupada[insumo.nome_busca].origem.push(composicao.nome_servico);
        } else {
          // Se não existe, criamos a entrada do material
          listaMateriaisAgrupada[insumo.nome_busca] = {
            nome_busca: insumo.nome_busca,
            tipo: insumo.tipo,
            quantidade_total: quantidadeFinal,
            origem: [composicao.nome_servico] // Rastreabilidade: guarda de qual serviço esse material veio
          };
        }
      }
    }

    // Transforma o dicionário agrupado em um array limpo para devolver ao front-end
    const materiaisFinais = Object.values(listaMateriaisAgrupada);

    return new Response(JSON.stringify({ materiais: materiaisFinais }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("🚨 ERRO NO MOTOR PARAMÉTRICO:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});