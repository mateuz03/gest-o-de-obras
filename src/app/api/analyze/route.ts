// app/api/analyze/route.ts
// Rota blindada para orquestrar a IA: Prevenção de IDOR, Validação Zod e Idempotência.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60; // Damos um tempo maior pois a IA pode demorar

// ── 1. Validação Zod (Anti Prompt Injection básico e Tipagem estrita) ─────
const analyzeRequestSchema = z.object({
  uploadId: z.string().uuid("ID do arquivo inválido."),
  nome_projeto: z.string().max(100).default("Análise sem título"),
  tipo_construcao: z.enum(["casa_terrea", "sobrado", "apartamento", "comercial"]),
  modo_precisao: z.enum(["ia_completa", "hibrido_sinapi"]),
  // Sanitização rigorosa nas observações (limite de 500 chars do checklist)
  instrucoes_adicionais: z
    .string()
    .max(500, "As instruções não podem passar de 500 caracteres.")
    .transform(str => str.replace(/[<>{}()]/g, "")) // Remove caracteres perigosos comuns em Prompt Injection
    .optional()
    .default(""),
  area_m2: z.number().positive().max(100000).optional().nullable(),
  bdi_percentual: z.number().min(0).max(100).default(25),
  regiao: z.string().max(100).optional().nullable(),
  sinapi_uf: z.string().length(2).default("SP")
});

export async function POST(req: NextRequest) {
  try {
    // ── 2. Autenticação ───────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // ── 3. Parse e Validação do Body com Zod ──────────────────────────────
    const body = await req.json();
    const parsedData = analyzeRequestSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", detalhes: parsedData.error.format() },
        { status: 400 }
      );
    }

    const payload = parsedData.data;

    // ── 4. Prevenção de IDOR (Insecure Direct Object Reference) ───────────
    // O usuário só pode analisar um arquivo que ele mesmo subiu
    const { data: uploadRecord, error: uploadError } = await supabase
      .from("uploads")
      .select("id, status, storage_path")
      .eq("id", payload.uploadId)
      .eq("user_id", user.id) // CHECAGEM CRÍTICA DE SEGURANÇA
      .single();

    if (uploadError || !uploadRecord) {
      return NextResponse.json({ error: "Arquivo não encontrado ou acesso negado." }, { status: 404 });
    }

    if (uploadRecord.status !== "pending" && uploadRecord.status !== "error") {
      return NextResponse.json({ error: "Este arquivo já está sendo processado ou já foi analisado." }, { status: 409 });
    }

    // ── 5. Controle de Estado (Idempotência) ──────────────────────────────
    // Evita que o usuário clique 2x rápido e gaste 2 chamadas da IA
    await supabase
      .from("uploads")
      .update({ status: "processing" })
      .eq("id", payload.uploadId);

    // Cria o rascunho da análise no banco para termos o ID
    const { data: analysisRecord, error: analysisError } = await supabase
      .from("analyses")
      .insert({
        user_id: user.id,
        upload_id: payload.uploadId,
        nome_projeto: payload.nome_projeto,
        tipo_construcao: payload.tipo_construcao,
        regiao: payload.regiao,
        sinapi_uf: payload.sinapi_uf,
        bdi_percentual: payload.bdi_percentual,
        status: "processing"
      })
      .select("id")
      .single();

    if (analysisError || !analysisRecord) {
      throw new Error("Falha ao criar registro de análise.");
    }

    // ── 6. O Pulo do Gato: Chama a Edge Function do Supabase ──────────────
    // A sua chave da OpenAI e a lógica pesada estão seguras lá na Edge Function
    
    // Obs: Em um fluxo completo você precisaria pegar a URL assinada ou o base64
    // da imagem baseada no uploadRecord.storage_path e enviar para a Edge Function.
    // Aqui estamos disparando o gatilho.
    
    const { data: edgeResult, error: edgeError } = await supabase.functions.invoke("analyze-blueprint", {
      body: {
        // Envie os dados validados pelo Zod
        tipo_construcao: payload.tipo_construcao,
        modo_precisao: payload.modo_precisao,
        instrucoes_adicionais: payload.instrucoes_adicionais,
        area_m2: payload.area_m2,
        bdi_percentual: payload.bdi_percentual,
        regiao: payload.regiao,
        sinapi_uf: payload.sinapi_uf,
        // (Você adicionaria o Base64 das imagens aqui, recuperadas do storage_path)
      },
    });

    if (edgeError) {
      // Rollback do status em caso de erro na IA
      await supabase.from("uploads").update({ status: "error" }).eq("id", payload.uploadId);
      await supabase.from("analyses").update({ status: "error" }).eq("id", analysisRecord.id);
      
      console.error("[IA Error]:", edgeError);
      return NextResponse.json({ error: "Falha na comunicação com o motor de Inteligência Artificial." }, { status: 502 });
    }

    // ── 7. Sucesso! Desconta a cota do usuário e salva o resultado ────────
    await supabase
      .from("analyses")
      .update({ 
        status: "completed",
        resultado_json: edgeResult, 
        total_estimado: edgeResult?.resumo_final?.total_geral || 0
      })
      .eq("id", analysisRecord.id);

    await supabase
      .from("uploads")
      .update({ status: "analyzed" })
      .eq("id", payload.uploadId);

    // Desconta a cota via RPC (Atômico)
    await supabase.rpc("increment_analyses_used", {
      p_user_id: user.id
    });

    return NextResponse.json(
      { success: true, analysisId: analysisRecord.id, orcamento: edgeResult },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Erro interno no /api/analyze:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}