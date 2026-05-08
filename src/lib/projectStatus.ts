import { Analysis } from "./types";

/**
 * A project is considered incomplete (rascunho ou com erro) when
 * the AI hasn't produced a usable result yet, or the run failed.
 * In these cases the UI should route the user back to the form
 * (NovaAnalise) instead of the results page.
 */
export function isAnalysisIncomplete(a: Pick<Analysis, "status" | "resultado_json">): boolean {
  if (!a) return false;
  if (a.status === "error" || a.status === "pending") return true;
  if (!a.resultado_json) return true;
  return false;
}

export function getProjectRoute(a: Analysis): string {
  return isAnalysisIncomplete(a) ? `/nova-analise?id=${a.id}` : `/analise/${a.id}`;
}
