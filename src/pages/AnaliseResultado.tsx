import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Analysis, AnalysisResult, MacroEtapa, BudgetItem, BrandRecommendation, ResumoFinal, SinapiMatch } from "@/lib/types";
import { ArrowLeft, Box, Download, FileSpreadsheet, FileText, DollarSign, Link2, Loader2, RefreshCw, Search, Home, Share2, CalendarDays, ScrollText, ClipboardList, ShieldCheck, FolderOpen, Trash2 } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/export";
import { exportOrcaLinkPDF } from "@/lib/exportOrcaLink";
import { SinapiLinkModal } from "@/components/SinapiLinkModal";
import { ExecutiveDashboard } from "@/components/ExecutiveDashboard";
import { GanttChart } from "@/components/GanttChart";
import { MemorialDescritivo } from "@/components/MemorialDescritivo";
import { PredictiveDelayAlert } from "@/components/PredictiveDelayAlert";
import { ConstructionDiaryPanel } from "@/components/ConstructionDiaryPanel";
import { ClashDetectionPanel } from "@/components/ClashDetectionPanel";
import { SourceFilesPanel } from "@/components/SourceFilesPanel";
import { ProjectCopilotChat, type ProposalPayload, type CopilotBudgetItem } from "@/components/ProjectCopilotChat";
import { EditableBudgetTable } from "@/components/EditableBudgetTable";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toText(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeBudgetItem(raw: any, index = 0): BudgetItem {
  const quantidade = toNumber(raw?.quantidade, 0);
  const precoUnitario = toNumber(raw?.preco_unitario, 0);
  const precoTotal =
    raw?.preco_total !== undefined && raw?.preco_total !== null
      ? toNumber(raw.preco_total, quantidade * precoUnitario)
      : quantidade * precoUnitario;

  return {
    ...raw,
    item: typeof raw?.item === "string" && raw.item.trim() ? raw.item : `item-${index + 1}`,
    descricao: typeof raw?.descricao === "string" && raw.descricao.trim() ? raw.descricao : "Item sem descrição",
    local_aplicacao: typeof raw?.local_aplicacao === "string" ? raw.local_aplicacao : "Geral",
    fornecedor: typeof raw?.fornecedor === "string" ? raw.fornecedor : "—",
    marca: typeof raw?.marca === "string" ? raw.marca : "—",
    marca_sugerida: typeof raw?.marca_sugerida === "string" ? raw.marca_sugerida : "—",
    quantidade,
    unidade: typeof raw?.unidade === "string" && raw.unidade.trim() ? raw.unidade : "un",
    preco_unitario: precoUnitario,
    preco_total: precoTotal,
    codigo_sinapi: typeof raw?.codigo_sinapi === "string" ? raw.codigo_sinapi : "",
    origem_preco: typeof raw?.origem_preco === "string" ? raw.origem_preco : "",
    perda_aplicada: typeof raw?.perda_aplicada === "string" ? raw.perda_aplicada : "",
    preco_sinapi_unitario:
      raw?.preco_sinapi_unitario !== undefined && raw?.preco_sinapi_unitario !== null
        ? toNumber(raw.preco_sinapi_unitario, 0)
        : undefined,
    preco_conciliado: !!raw?.preco_conciliado,
    sem_preco_sinapi: !!raw?.sem_preco_sinapi,
    estimado_ia: !!raw?.estimado_ia,
    alerta_revisao: !!raw?.alerta_revisao,
    sinapi_match: raw?.sinapi_match ?? undefined,
  } as BudgetItem;
}

function normalizeMacroEtapa(raw: any, index = 0): MacroEtapa {
  const itens = Array.isArray(raw?.itens) ? raw.itens.map((it: any, i: number) => normalizeBudgetItem(it, i)) : [];
  const subtotal =
    raw?.subtotal !== undefined && raw?.subtotal !== null
      ? toNumber(raw.subtotal, 0)
      : itens.reduce((sum, it) => sum + toNumber(it.preco_total, 0), 0);

  return {
    ...raw,
    nome: typeof raw?.nome === "string" && raw.nome.trim() ? raw.nome : `Etapa ${index + 1}`,
    itens,
    subtotal,
    duracao_dias_estimada: toNumber(raw?.duracao_dias_estimada, 0),
  } as MacroEtapa;
}

function normalizeResumoFinal(raw: any): ResumoFinal {
  return {
    total_materiais: toNumber(raw?.total_materiais, 0),
    total_mao_de_obra: toNumber(raw?.total_mao_de_obra, 0),
    total_geral: toNumber(raw?.total_geral, 0),
    bdi_percentual: toNumber(raw?.bdi_percentual, 25),
    bdi_valor: toNumber(raw?.bdi_valor, 0),
    premissas_bdi: typeof raw?.premissas_bdi === "string" ? raw.premissas_bdi : "",
  };
}

function normalizeAnalysisResult(raw: any): AnalysisResult {
  const macroEtapas = Array.isArray(raw?.macro_etapas)
    ? raw.macro_etapas.map((etapa: any, i: number) => normalizeMacroEtapa(etapa, i))
    : [];

  return {
    ...raw,
    resumo: typeof raw?.resumo === "string" ? raw.resumo : "",
    area_total_m2: toNumber(raw?.area_total_m2, 0),
    escala_detectada: typeof raw?.escala_detectada === "string" ? raw.escala_detectada : "",
    referencia_sinapi: typeof raw?.referencia_sinapi === "string" ? raw.referencia_sinapi : "",
    macro_etapas: macroEtapas,
    quantitativo_por_comodo: Array.isArray(raw?.quantitativo_por_comodo) ? raw.quantitativo_por_comodo : [],
    recomendacoes: Array.isArray(raw?.recomendacoes) ? raw.recomendacoes : [],
    resumo_final: normalizeResumoFinal(raw?.resumo_final),
  } as AnalysisResult;
}

function recalculateTotals(result: AnalysisResult, bdiPercent: number): ResumoFinal {
  let totalMateriais = 0;
  let totalMaoDeObra = 0;

  const etapasSeguras = Array.isArray(result?.macro_etapas) ? result.macro_etapas : [];
  for (const etapa of etapasSeguras) {
    const itensSeguros = Array.isArray(etapa?.itens) ? etapa.itens : [];
    for (const item of itensSeguros) {
      totalMateriais += toNumber(item?.preco_total, 0);
    }
  }

  totalMaoDeObra = toNumber(result?.resumo_final?.total_mao_de_obra, 0);

  const subtotal = totalMateriais + totalMaoDeObra;
  const bdiValor = subtotal * (toNumber(bdiPercent, 25) / 100);
  const totalGeral = subtotal + bdiValor;

  return {
    total_materiais: totalMateriais,
    total_mao_de_obra: totalMaoDeObra,
    total_geral: totalGeral,
    bdi_percentual: toNumber(bdiPercent, 25),
    bdi_valor: bdiValor,
    premissas_bdi: result?.resumo_final?.premissas_bdi || `BDI de ${bdiPercent}% aplicado`,
  };
}

interface BudgetTableProps {
  items: BudgetItem[];
  title: string;
  sinapiMatches: Record<string, { matched: boolean; matches: SinapiMatch[] }>;
  onLinkClick: (item: BudgetItem, suggestions: SinapiMatch[]) => void;
}

function BudgetTable({ items, title, sinapiMatches, onLinkClick }: BudgetTableProps) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      {title && <h4 className="text-sm font-semibold mb-2 text-foreground">{title}</h4>}
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-16">Item</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Fornec.</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead className="text-right">Quant</TableHead>
            <TableHead>Unid</TableHead>
            <TableHead className="text-right">R$ Unit.</TableHead>
            <TableHead className="text-right">R$ Total</TableHead>
            <TableHead>SINAPI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => {
            const itemKey = item?.item || `idx-${i}`;
            const match = item?.item ? sinapiMatches[item.item] : undefined;
            const isConciliado = !!item?.preco_conciliado;
            const hasSinapiCode = !!item?.codigo_sinapi;
            const zebra = items.length > 5 && i % 2 === 1 ? "bg-slate-50/60" : "";

            return (
              <TableRow
                key={itemKey}
                className={
                  item?.alerta_revisao
                    ? "bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500"
                    : isConciliado
                    ? "bg-green-50/50 dark:bg-green-950/20"
                    : zebra
                }
              >
                <TableCell className="font-mono text-xs">{itemKey}</TableCell>
                <TableCell className="text-sm">
                  {toText(item?.descricao, "Item sem descrição")}
                  {item?.perda_aplicada && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (perda: {item.perda_aplicada})
                    </span>
                  )}
                  {item?.alerta_revisao && (
                    <Badge variant="destructive" className="ml-2 text-[10px]">
                      ⚠ Revisar — preço unitário alto
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {item?.local_aplicacao ? (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {item.local_aplicacao}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{toText(item?.fornecedor)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{toText(item?.marca)}</TableCell>
                <TableCell className="text-right tabular-nums">{toNumber(item?.quantidade, 0)}</TableCell>
                <TableCell>{toText(item?.unidade, "un")}</TableCell>
                <TableCell className={`text-right tabular-nums ${item?.alerta_revisao ? "text-red-600 font-semibold" : ""}`}>
                  {formatCurrency(toNumber(item?.preco_unitario, 0))}
                  {item?.preco_sinapi_unitario != null && (
                    <div className="text-xs text-green-600">
                      SINAPI: {formatCurrency(toNumber(item.preco_sinapi_unitario, 0))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {item?.sem_preco_sinapi ? (
                    <Badge variant="destructive" className="text-xs">
                      Sem preço SINAPI
                    </Badge>
                  ) : item?.estimado_ia ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span>{formatCurrency(toNumber(item?.preco_total, 0))}</span>
                      <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
                        ✨ Estimativa IA
                      </Badge>
                    </div>
                  ) : (
                    formatCurrency(toNumber(item?.preco_total, 0))
                  )}
                </TableCell>
                <TableCell>
                  {isConciliado ? (
                    <Badge
                      className="text-xs bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                      onClick={() => onLinkClick(item, match?.matches || [])}
                    >
                      ✓ {item?.codigo_sinapi || "SINAPI"}
                    </Badge>
                  ) : hasSinapiCode ? (
                    <Badge variant="outline" className="text-xs">
                      {item?.codigo_sinapi}
                    </Badge>
                  ) : match && !match.matched ? (
                    <Badge
                      variant="destructive"
                      className="text-xs cursor-pointer"
                      onClick={() => onLinkClick(item, [])}
                    >
                      <Link2 className="h-3 w-3 mr-1" /> Vincular
                    </Badge>
                  ) : match && match.matched ? (
                    <Badge
                      className="text-xs bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                      onClick={() => onLinkClick(item, match.matches || [])}
                    >
                      <Link2 className="h-3 w-3 mr-1" /> Vincular ({Array.isArray(match.matches) ? match.matches.length : 0})
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {item?.origem_preco?.includes?.("Sem") ? "Est." : "—"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SummaryCard({ resumo }: { resumo: ResumoFinal }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-primary" /> Resumo Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Total Materiais</p>
            <p className="text-xl font-bold">{formatCurrency(resumo?.total_materiais ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Total Mão de Obra</p>
            <p className="text-xl font-bold">{formatCurrency(resumo?.total_mao_de_obra ?? 0)}</p>
          </div>
          {resumo?.bdi_valor ? (
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">BDI ({resumo.bdi_percentual}%)</p>
              <p className="text-xl font-bold">{formatCurrency(resumo.bdi_valor)}</p>
              {resumo.premissas_bdi && (
                <p className="text-xs text-muted-foreground mt-1">{resumo.premissas_bdi}</p>
              )}
            </div>
          ) : null}
          <div className="rounded-lg border bg-primary/10 p-4">
            <p className="text-xs text-muted-foreground">Total Geral</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(resumo?.total_geral ?? 0)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsSection({ items, macroEtapas }: { items?: BrandRecommendation[]; macroEtapas?: MacroEtapa[] }) {
  const sugeridasPorEtapa = useMemo(() => {
    if (!Array.isArray(macroEtapas) || macroEtapas.length === 0) return [];

    return macroEtapas
      .map((etapa) => {
        const map = new Map<string, Set<string>>();
        const itensSeguros = Array.isArray(etapa?.itens) ? etapa.itens : [];

        for (const it of itensSeguros) {
          const marca = (it?.marca_sugerida || "").trim();
          if (
            !marca ||
            marca === "—" ||
            marca.toLowerCase() === "generico" ||
            marca.toLowerCase() === "genérico"
          ) {
            continue;
          }

          if (!map.has(marca)) map.set(marca, new Set());
          map.get(marca)!.add(it?.descricao || "Item");
        }

        const marcas = Array.from(map.entries())
          .map(([nome, itensSet]) => ({ nome, itens: Array.from(itensSet) }))
          .sort((a, b) => b.itens.length - a.itens.length);

        return { etapa: etapa?.nome || "Etapa sem nome", marcas };
      })
      .filter((g) => Array.isArray(g.marcas) && g.marcas.length > 0);
  }, [macroEtapas]);

  if (!sugeridasPorEtapa.length && (!Array.isArray(items) || items.length === 0)) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground text-center">
          Nenhuma marca sugerida foi retornada pela IA para este orçamento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sugeridasPorEtapa.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" /> Marcas Sugeridas pela IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {sugeridasPorEtapa.map((grupo, gi) => (
              <div key={`${grupo.etapa}-${gi}`}>
                <h4 className="mb-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {grupo.etapa}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {grupo.marcas.map((m, mi) => (
                    <div key={`${m.nome}-${mi}`} className="rounded-lg border bg-muted/30 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {Array.isArray(m.itens) ? m.itens.length : 0} itens
                        </Badge>
                        <span className="font-medium">{m.nome}</span>
                      </div>
                      <p
                        className="mt-1 text-xs text-muted-foreground line-clamp-1 max-w-[260px]"
                        title={Array.isArray(m.itens) ? m.itens.join(" · ") : ""}
                      >
                        {Array.isArray(m.itens) ? m.itens.slice(0, 3).join(" · ") : ""}
                        {Array.isArray(m.itens) && m.itens.length > 3 ? "…" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {Array.isArray(items) && items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" /> Recomendações por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((rec, i) => (
              <div key={`${rec?.material || "material"}-${i}`}>
                <h4 className="mb-2 font-semibold">{rec?.material || "Material"}</h4>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Array.isArray(rec?.marcas) ? rec.marcas : []).map((m, j) => (
                    <div key={`${m?.nome || "marca"}-${j}`} className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          #{j + 1}
                        </Badge>
                        <span className="font-medium">{m?.nome || "Marca"}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{m?.justificativa || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AnaliseResultado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchingPrices, setMatchingPrices] = useState(false);
  const [sinapiMatches, setSinapiMatches] = useState<Record<string, { matched: boolean; matches: SinapiMatch[] }>>({});
  const [linkModal, setLinkModal] = useState<{ open: boolean; item: BudgetItem | null; suggestions: SinapiMatch[] }>({
    open: false,
    item: null,
    suggestions: [],
  });
  const [localResult, setLocalResult] = useState<AnalysisResult | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [diarioRefreshKey, setDiarioRefreshKey] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const roomGroups = useMemo(() => {
    if (!Array.isArray(localResult?.macro_etapas) || localResult.macro_etapas.length === 0) return [];

    const groups: Record<string, BudgetItem[]> = {};

    for (const etapa of localResult.macro_etapas) {
      const itensSeguros = Array.isArray(etapa?.itens) ? etapa.itens : [];
      for (const item of itensSeguros) {
        const room = item?.local_aplicacao || "Geral";
        if (!groups[room]) groups[room] = [];
        groups[room].push(item);
      }
    }

    return Object.entries(groups).map(([comodo, itens]) => ({
      comodo,
      itens,
      subtotal: itens.reduce((sum, it) => sum + toNumber(it?.preco_total, 0), 0),
    }));
  }, [localResult]);

  const filterItems = useCallback(
    (items: BudgetItem[]) => {
      if (!Array.isArray(items)) return [];
      if (!searchFilter.trim()) return items;

      const term = searchFilter.toLowerCase();
      return items.filter(
        (it) =>
          (it?.descricao || "").toLowerCase().includes(term) ||
          (it?.item || "").toLowerCase().includes(term) ||
          (it?.local_aplicacao || "").toLowerCase().includes(term) ||
          (it?.marca || "").toLowerCase().includes(term)
      );
    },
    [searchFilter]
  );

  useEffect(() => {
    async function load() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.from("analyses").select("*").eq("id", id).single();
        if (error) throw error;

        setAnalysis(data as any);

        if (data?.resultado_json) {
          setLocalResult(normalizeAnalysisResult(data.resultado_json));
        } else {
          setLocalResult(null);
        }
      } catch (err) {
        console.error("Erro ao carregar análise:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const runMatching = useCallback(async () => {
    if (!Array.isArray(localResult?.macro_etapas) || localResult.macro_etapas.length === 0) return;

    setMatchingPrices(true);

    const allItems = localResult.macro_etapas.flatMap((e) =>
      (Array.isArray(e?.itens) ? e.itens : [])
        .filter((i) => !i?.preco_conciliado)
        .map((i) => ({ descricao: i?.descricao || "", item: i?.item || "" }))
        .filter((i) => i.descricao && i.item)
    );

    if (!allItems.length) {
      toast.info("Todos os itens já estão conciliados.");
      setMatchingPrices(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("match-sinapi", {
        body: { items: allItems, regiao: analysis?.regiao },
      });

      if (error) throw error;

      setSinapiMatches(data?.results || {});
      const foundCount = Object.values(data?.results || {}).filter((r: any) => r?.matched).length;

      toast.success(`Busca concluída: ${foundCount} itens encontrados na base SINAPI.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao buscar preços SINAPI.");
    } finally {
      setMatchingPrices(false);
    }
  }, [localResult, analysis]);

  const handleLinkPrice = useCallback(
    (selectedMatch: SinapiMatch) => {
      if (!linkModal.item || !localResult) return;

      const itemCode = linkModal.item.item;
      const precoUnit = toNumber(selectedMatch?.preco_material, 0) + toNumber(selectedMatch?.preco_mao_de_obra, 0);

      const updatedResult = normalizeAnalysisResult({
        ...localResult,
        macro_etapas: (localResult.macro_etapas || []).map((etapa) => ({
          ...etapa,
          itens: (Array.isArray(etapa?.itens) ? etapa.itens : []).map((it) => {
            if (it.item !== itemCode) return it;

            const qty = toNumber(it?.quantidade, 1);
            const newTotal = precoUnit * qty;

            return {
              ...it,
              preco_unitario: precoUnit,
              preco_total: newTotal,
              codigo_sinapi: selectedMatch?.codigo || "",
              origem_preco: "SINAPI",
              preco_sinapi_unitario: precoUnit,
              preco_conciliado: true,
              sinapi_match: selectedMatch,
            };
          }),
        })),
      });

      const bdi = toNumber((analysis as any)?.bdi_percentual, 25);
      updatedResult.resumo_final = recalculateTotals(updatedResult, bdi);

      setLocalResult(updatedResult);

      const totalGeral = toNumber(updatedResult?.resumo_final?.total_geral, 0);

      supabase
        .from("analyses")
        .update({
          resultado_json: updatedResult as any,
          total_estimado: Number.isFinite(totalGeral) ? totalGeral : null,
        } as any)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Failed to persist:", error);
        });

      toast.success(`Preço SINAPI vinculado ao item ${itemCode}`);
    },
    [linkModal.item, localResult, analysis, id]
  );

  const copilotBudgetItems: CopilotBudgetItem[] = useMemo(() => {
    if (!Array.isArray(localResult?.macro_etapas)) return [];

    const out: CopilotBudgetItem[] = [];
    for (const etapa of localResult.macro_etapas) {
      const itensSeguros = Array.isArray(etapa?.itens) ? etapa.itens : [];
      for (const it of itensSeguros) {
        out.push({
          id: it?.item || "",
          descricao: it?.descricao || "",
          quantidade: it?.quantidade || 0,
          unidade: it?.unidade || "un",
          preco_unitario: it?.preco_unitario || 0,
          etapa: etapa?.nome || "Etapa",
        });
      }
    }
    return out;
  }, [localResult]);

  const handleApplyProposal = useCallback(
    async (p: ProposalPayload): Promise<boolean> => {
      if (!localResult || !id) return false;

      let found = false;

      const updated: AnalysisResult = normalizeAnalysisResult({
        ...localResult,
        macro_etapas: (localResult.macro_etapas || []).map((etapa) => ({
          ...etapa,
          itens: (Array.isArray(etapa?.itens) ? etapa.itens : []).map((it) => {
            if (it.item !== p.id_do_item) return it;

            found = true;

            const qty = Number(p.nova_quantidade);
            const unit = Number(p.novo_preco_unitario);
            const finalQty = isNaN(qty) ? toNumber(it.quantidade, 0) : qty;
            const finalUnit = isNaN(unit) ? toNumber(it.preco_unitario, 0) : unit;

            return {
              ...it,
              descricao: p.novo_nome || it.descricao,
              quantidade: finalQty,
              preco_unitario: finalUnit,
              preco_total: finalQty * finalUnit,
            };
          }),
        })),
      });

      if (!found) {
        toast.error(`Item ${p.id_do_item} não encontrado no orçamento.`);
        return false;
      }

      const bdi = toNumber((analysis as any)?.bdi_percentual, 25);
      updated.resumo_final = recalculateTotals(updated, bdi);

      setLocalResult(updated);

      const totalGeral = toNumber(updated?.resumo_final?.total_geral, 0);

      const { error } = await supabase
        .from("analyses")
        .update({
          resultado_json: updated as any,
          total_estimado: Number.isFinite(totalGeral) ? totalGeral : null,
        } as any)
        .eq("id", id);

      if (error) {
        toast.error("Erro ao salvar alteração: " + error.message);
        return false;
      }

      return true;
    },
    [localResult, analysis, id]
  );

  const mutateAndPersist = useCallback(
    async (transform: (etapas: MacroEtapa[]) => MacroEtapa[]) => {
      if (!localResult || !id) return;

      const etapasBase = Array.isArray(localResult?.macro_etapas) ? localResult.macro_etapas : [];
      const transformed = transform(etapasBase);

      const newEtapas = transformed.map((etapa, etapaIndex) =>
        normalizeMacroEtapa(
          {
            ...etapa,
            subtotal: (Array.isArray(etapa?.itens) ? etapa.itens : []).reduce(
              (s, it) => s + toNumber(it?.preco_total, 0),
              0
            ),
          },
          etapaIndex
        )
      );

      const updated: AnalysisResult = normalizeAnalysisResult({
        ...localResult,
        macro_etapas: newEtapas,
      });

      const bdi = toNumber((analysis as any)?.bdi_percentual, 25);
      updated.resumo_final = recalculateTotals(updated, bdi);

      setLocalResult(updated);

      const totalGeral = toNumber(updated?.resumo_final?.total_geral, 0);

      const { error } = await supabase
        .from("analyses")
        .update({
          resultado_json: updated as any,
          total_estimado: Number.isFinite(totalGeral) ? totalGeral : null,
        } as any)
        .eq("id", id);

      if (error) {
        toast.error("Erro ao salvar: " + error.message);
      } else {
        toast.success("Orçamento atualizado.");
      }
    },
    [localResult, analysis, id]
  );

  const handleUpdateItem = useCallback(
    async (originalItemId: string, updated: BudgetItem) => {
      await mutateAndPersist((etapas) =>
        etapas.map((etapa) => ({
          ...etapa,
          itens: (Array.isArray(etapa?.itens) ? etapa.itens : []).map((it) =>
            it.item === originalItemId ? normalizeBudgetItem({ ...it, ...updated }) : it
          ),
        }))
      );
    },
    [mutateAndPersist]
  );

  const handleAddItemToEtapa = useCallback(
    async (etapaIndex: number, newItem: BudgetItem) => {
      await mutateAndPersist((etapas) =>
        etapas.map((etapa, i) =>
          i === etapaIndex
            ? {
                ...etapa,
                itens: [...(Array.isArray(etapa?.itens) ? etapa.itens : []), normalizeBudgetItem(newItem)],
              }
            : etapa
        )
      );
    },
    [mutateAndPersist]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button asChild>
          <Link to="/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </div>
    );
  }

  const hasMacroEtapas =
    Array.isArray(localResult?.macro_etapas) && localResult.macro_etapas.length > 0;

  if (!localResult || analysis.status === "pending" || analysis.status === "error") {
    const isError = analysis.status === "error";

    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-primary text-primary-foreground">
          <div className="container flex h-16 items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/dashboard">
                <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-2 font-bold">
              <Box className="h-5 w-5" />
              {analysis.nome_projeto}
            </div>
          </div>
        </nav>

        <div className="container max-w-xl py-16">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full ${
                  isError ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                }`}
              >
                <FolderOpen className="h-8 w-8" />
              </div>

              <h2 className="text-xl font-semibold text-foreground">
                {isError
                  ? "A análise anterior falhou"
                  : "Este projeto ainda é um rascunho ou aguarda processamento."}
              </h2>

              <p className="max-w-md text-sm text-muted-foreground">
                {isError
                  ? "Algo deu errado durante a geração do orçamento. Você pode revisar os dados e tentar novamente sem precisar reenviar tudo."
                  : "Os dados básicos foram salvos, mas o orçamento ainda não foi gerado. Continue de onde parou para gerar o orçamento com IA."}
              </p>

              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <Button asChild>
                  <Link to={`/nova-analise?id=${analysis.id}`}>Continuar Edição</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Voltar ao Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const result = normalizeAnalysisResult(localResult);
  const computedSummary = recalculateTotals(result, toNumber((analysis as any)?.bdi_percentual, 25));

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-primary text-primary-foreground">
        <div className="container flex h-14 items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link to="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
            </Link>
          </Button>

          <div className="flex items-center gap-2 font-semibold text-sm opacity-90">
            <Box className="h-4 w-4" />
            OrçaLink
          </div>
        </div>
      </nav>

      <div className="container pt-8 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight truncate">
              {analysis.nome_projeto}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Detalhes do Projeto · {analysis.tipo_construcao || "Obra"}
              {result.area_total_m2 ? ` · ${result.area_total_m2} m²` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const shareUrl = `${window.location.origin}/share/${id}`;
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copiado! Envie para o cliente.");
              }}
            >
              <Share2 className="mr-1 h-4 w-4" /> Compartilhar
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={runMatching}
              disabled={matchingPrices}
            >
              {matchingPrices ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              Conciliar SINAPI
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() => exportToPDF(analysis.nome_projeto, result)}
            >
              <FileText className="mr-1 h-4 w-4" /> PDF Completo
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() => exportToExcel(analysis.nome_projeto, result)}
            >
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
            </Button>

            <Button
              size="sm"
              onClick={async () => {
                setDownloadingPdf(true);
                try {
                  await new Promise((r) => setTimeout(r, 50));
                  exportOrcaLinkPDF(analysis.nome_projeto, result, computedSummary);
                  toast.success("PDF gerado com sucesso!");
                } catch (e) {
                  console.error(e);
                  toast.error("Erro ao gerar PDF.");
                } finally {
                  setDownloadingPdf(false);
                }
              }}
              disabled={downloadingPdf}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {downloadingPdf ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              Baixar PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => setDeleteOpen(true)}
              title="Excluir projeto"
            >
              <Trash2 className="mr-1 h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>
      </div>

      <div className="container pb-8 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Área Total</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                  {result?.area_total_m2 || "—"} m²
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Escala</p>
                <p className="text-2xl font-bold text-slate-900">{result?.escala_detectada || "—"}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Tipo</p>
                <p className="text-2xl font-bold text-slate-900">{analysis.tipo_construcao || "—"}</p>
              </div>

              {result?.referencia_sinapi && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Ref. SINAPI</p>
                  <p className="text-lg font-bold text-slate-900">{result.referencia_sinapi}</p>
                </div>
              )}
            </div>

            {result?.resumo && <p className="mt-4 text-sm text-slate-600">{result.resumo}</p>}
          </CardContent>
        </Card>

        <ExecutiveDashboard result={result} resumo={computedSummary} analysisId={id} />
        <PredictiveDelayAlert analysisId={id!} refreshKey={diarioRefreshKey} />
        <SummaryCard resumo={computedSummary} />

        {hasMacroEtapas ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar materiais (ex: piso, cimento, cabo...)"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs defaultValue="orcamento" className="space-y-4">
              <TabsList className="flex-wrap h-auto gap-0 bg-transparent p-0 border-b border-slate-200 rounded-none w-full justify-start">
                {[
                  { v: "orcamento", icon: null, label: "Visão Geral (Categorias)" },
                  { v: "comodos", icon: Home, label: "Visão por Cômodo" },
                  { v: "recomendacoes", icon: null, label: "Marcas" },
                  { v: "cronograma", icon: CalendarDays, label: "Cronograma (Gantt)" },
                  { v: "diario", icon: ClipboardList, label: "Diário de Obra" },
                  { v: "memorial", icon: ScrollText, label: "Memorial Descritivo" },
                  { v: "conflitos", icon: ShieldCheck, label: "Conflitos" },
                  { v: "arquivos", icon: FolderOpen, label: "Arquivos Base" },
                ].map(({ v, icon: Icon, label }) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm text-slate-500 shadow-none data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:font-bold data-[state=active]:shadow-none hover:text-slate-700"
                  >
                    {Icon && <Icon className="h-3.5 w-3.5 mr-1" />} {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="orcamento" className="space-y-6">
                {(Array.isArray(result.macro_etapas) ? result.macro_etapas : []).map((etapa, i) => {
                  const filtered = filterItems(Array.isArray(etapa?.itens) ? etapa.itens : []);
                  if (!filtered.length && searchFilter) return null;

                  const subtotal = filtered.reduce((s, it) => s + toNumber(it?.preco_total, 0), 0);

                  return (
                    <Card key={`${etapa?.nome || "etapa"}-${i}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{etapa?.nome || "Etapa"}</CardTitle>
                          <Badge variant="outline" className="font-mono">
                            {formatCurrency(searchFilter ? subtotal : toNumber(etapa?.subtotal, 0))}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <EditableBudgetTable
                          items={filtered}
                          sinapiMatches={sinapiMatches}
                          onLinkClick={(item, suggestions) =>
                            setLinkModal({
                              open: true,
                              item,
                              suggestions: Array.isArray(suggestions) ? suggestions : [],
                            })
                          }
                          onUpdateItem={handleUpdateItem}
                          onAddItem={(newItem) => handleAddItemToEtapa(i, newItem)}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="comodos" className="space-y-6">
                {roomGroups.map((group, i) => {
                  const filtered = filterItems(Array.isArray(group?.itens) ? group.itens : []);
                  if (!filtered.length && searchFilter) return null;

                  const subtotal = filtered.reduce((s, it) => s + toNumber(it?.preco_total, 0), 0);

                  return (
                    <Card key={`${group.comodo}-${i}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">{group.comodo}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {filtered.length} itens
                            </Badge>
                            <Badge variant="outline" className="font-mono">
                              {formatCurrency(searchFilter ? subtotal : toNumber(group.subtotal, 0))}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <EditableBudgetTable
                          items={filtered}
                          sinapiMatches={sinapiMatches}
                          onLinkClick={(item, suggestions) =>
                            setLinkModal({
                              open: true,
                              item,
                              suggestions: Array.isArray(suggestions) ? suggestions : [],
                            })
                          }
                          onUpdateItem={handleUpdateItem}
                        />
                      </CardContent>
                    </Card>
                  );
                })}

                {roomGroups.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      Nenhum dado de ambiente disponível. Verifique se a IA identificou os cômodos na planta.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="recomendacoes">
                <RecommendationsSection
                  items={Array.isArray(result?.recomendacoes) ? result.recomendacoes : []}
                  macroEtapas={Array.isArray(result?.macro_etapas) ? result.macro_etapas : []}
                />
              </TabsContent>

              <TabsContent value="cronograma">
                <GanttChart
                  analysisId={id!}
                  macroEtapas={Array.isArray(result?.macro_etapas) ? result.macro_etapas : []}
                  areaM2={toNumber(result?.area_total_m2, 100)}
                  onSaved={() => setDiarioRefreshKey((value) => value + 1)}
                />
              </TabsContent>

              <TabsContent value="diario">
                <ConstructionDiaryPanel
                  analysisId={id!}
                  onSaved={() => setDiarioRefreshKey((value) => value + 1)}
                />
              </TabsContent>

              <TabsContent value="memorial">
                <MemorialDescritivo
                  analysisResult={result}
                  nomeProjeto={analysis.nome_projeto}
                  tipoConstrucao={analysis.tipo_construcao || undefined}
                  totalObra={toNumber(computedSummary?.total_geral, 0)}
                  bdiPercent={toNumber((analysis as any)?.bdi_percentual, 25)}
                />
              </TabsContent>

              <TabsContent value="conflitos">
                <ClashDetectionPanel analysisId={id!} />
              </TabsContent>

              <TabsContent value="arquivos">
                <SourceFilesPanel analysisId={id!} userId={(analysis as any)?.user_id} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Formato de resultado legado ou incompleto. Refaça a análise para obter o novo formato.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {linkModal.item && (
        <SinapiLinkModal
          open={linkModal.open}
          onClose={() => setLinkModal({ open: false, item: null, suggestions: [] })}
          itemDescricao={linkModal.item?.descricao || "Item"}
          itemCode={linkModal.item?.item || ""}
          suggestions={Array.isArray(linkModal.suggestions) ? linkModal.suggestions : []}
          onSelect={handleLinkPrice}
        />
      )}

      {id && (
        <ProjectCopilotChat
          projectId={id}
          budgetItems={Array.isArray(copilotBudgetItems) ? copilotBudgetItems : []}
          onApplyProposal={handleApplyProposal}
        />
      )}

      {id && (
        <DeleteProjectDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          analysisId={id}
          projectName={analysis.nome_projeto}
          userId={user?.id}
          onDeleted={() => navigate("/dashboard")}
        />
      )}
    </div>
  );
}