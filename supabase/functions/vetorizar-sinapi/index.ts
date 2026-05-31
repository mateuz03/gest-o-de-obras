import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  // Busca simples usando os nomes de coluna agora purificados
  const { data: linhas, error } = await supabase
    .from("tabela_sinapi")
    .select("codigo, descricao")
    .is("embedding", null)
    .limit(200);

  if (error) return new Response(`Erro no banco: ${error.message}`, { status: 500 });

  if (!linhas || linhas.length === 0) {
    return new Response("🎉 SUCESSO! Toda a base do SINAPI já foi vetorizada!", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  const descricoes = linhas.map(l => l.descricao);

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: descricoes
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(`Erro na API OpenAI: ${errorText}`, { status: 500 });
  }

  const openAiData = await response.json();
  const embeddings = openAiData.data;

  // Atualiza as linhas usando a correspondência direta da coluna codigo
  for (let i = 0; i < linhas.length; i++) {
    await supabase
      .from("tabela_sinapi")
      .update({ embedding: embeddings[i].embedding })
      .eq("codigo", linhas[i].codigo);
  }

  return new Response(`✅ ${linhas.length} itens vetorizados! Atualize a página (F5) para processar o próximo lote.`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
});