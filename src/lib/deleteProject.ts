import { supabase } from "@/integrations/supabase/client";

// Child tables referencing analyses via analysis_id (no FK CASCADE configured)
const CHILD_TABLES = [
  "project_chats",
  "clash_conflicts",
  "diario_obra",
  "project_schedule",
  "alertas_preditivos",
  "compras_cotacao",
  "contas_a_pagar",
  "cronograma_marcos",
  "estoque_obra",
  "financeiro_fluxo",
] as const;

async function deleteStorageFolder(bucket: string, prefix: string) {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !data?.length) return;
    const paths = data.map((f) => `${prefix}/${f.name}`);
    await supabase.storage.from(bucket).remove(paths);
  } catch (e) {
    console.warn(`Storage cleanup failed for ${bucket}/${prefix}`, e);
  }
}

export async function deleteAnalysisCompletely(analysisId: string, userId?: string) {
  // 1) Storage cleanup (best-effort)
  await deleteStorageFolder("blueprints", analysisId);
  if (userId) {
    await deleteStorageFolder("blueprints", `${userId}/${analysisId}`);
    await deleteStorageFolder("diary-photos", `${userId}/${analysisId}`);
  }

  // 2) Delete child rows (best-effort, ignore errors per table)
  await Promise.all(
    CHILD_TABLES.map((t) =>
      supabase
        .from(t as any)
        .delete()
        .eq("analysis_id", analysisId)
        .then(({ error }) => {
          if (error) console.warn(`Delete from ${t} failed:`, error.message);
        }),
    ),
  );

  // 3) Delete the parent analysis
  const { error } = await supabase.from("analyses").delete().eq("id", analysisId);
  if (error) throw error;
}
