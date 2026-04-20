import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Analysis, AnalysisResult, MacroEtapa, BudgetItem, BrandRecommendation, ResumoFinal, SinapiMatch } from "@/lib/types";
import { ArrowLeft, Box, Download, FileSpreadsheet, FileText, DollarSign, Link2, Loader2, RefreshCw, Search, Home, Share2, CalendarDays, ScrollText, ClipboardList, ShieldCheck } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/export";
import { SinapiLinkModal } from "@/components/SinapiLinkModal";
import { ExecutiveDashboard } from "@/components/ExecutiveDashboard";
import { GanttChart } from "@/components/GanttChart";
import { MemorialDescritivo } from "@/components/MemorialDescritivo";
import { PredictiveDelayAlert } from "@/components/PredictiveDelayAlert";
import { ConstructionDiaryPanel } from "@/components/ConstructionDiaryPanel";
import { AlertHistoryTimeline } from "@/components/AlertHistoryTimeline";
import { ClashDetectionPanel } from "@/components/ClashDetectionPanel";
import { toast } from "sonner";

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Recalculate totals with BDI
function recalculateTotals(result: AnalysisResult, bdiPercent: number): ResumoFinal {
  let totalMateriais = 0;
  let totalMaoDeObra = 0;

  for (const etapa of result.macro_etapas || []) {
    for (const item of etapa.itens || []) {
      const total = typeof item.preco_total === "string" ? parseFloat(item.preco_total) : item.preco_total;
      if (!isNaN(total)) totalMateriais += total;
    }
  }

  totalMaoDeObra = typeof result.resumo_final?.total_mao_de_obra === "string"
    ? parseFloat(result.resumo_final.total_mao_de_obra)
    : (result.resumo_final?.total_mao_de_obra || 0);

  const subtotal = totalMateriais + totalMaoDeObra;
  const bdiValor = subtotal * (bdiPercent / 100);
  const totalGeral = subtotal + bdiValor;

  return {
    total_materiais: totalMateriais,
    total_mao_de_obra: totalMaoDeObra,
    total_geral: totalGeral,
    bdi_percentual: bdiPercent,
    bdi_valor: bdiValor,
    premissas_bdi: result.resumo_final?.premissas_bdi || `BDI de ${bdiPercent}% aplicado`,
  };
}

interface BudgetTableProps {
  items: BudgetItem[];
  title: string;
  sinapiMatches: Record<string, { matched: boolean; matches: SinapiMatch[] }>;
  onLinkClick: (item: BudgetItem, suggestions: SinapiMatch[]) => void;
}

function BudgetTable({ items, title, sinapiMatches, onLinkClick }: BudgetTableProps) {
  if (!items?.length) return null;
  return (
    <div className="overflow-x-auto">
      {title && <h4 className="text-sm font-semibold mb-2 text-foreground">{title}</h4>}
      <Table>
        <TableHeader>
          <TableRow>
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
            const match = sinapiMatches[item.item];
            const isConciliado = item.preco_conciliado;
            const hasSinapiCode = !!item.codigo_sinapi;

            return (
              <TableRow key={i} className={isConciliado ? "bg-green-50/50 dark:bg-green-950/20" : ""}>
                <TableCell className="font-mono text-xs">{item.item}</TableCell>
                <TableCell className="text-sm">
                  {item.descricao}
                  {item.perda_aplicada && <span className="ml-1 text-xs text-muted-foreground">(perda: {item.perda_aplicada})</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {item.local_aplicacao ? (
                    <Badge variant="secondary" className="text-xs font-normal">{item.local_aplicacao}</Badge>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.fornecedor}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.marca}</TableCell>
                <TableCell className="text-right">{item.quantidade}</TableCell>
                <TableCell>{item.unidade}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.preco_unitario)}
                  {item.preco_sinapi_unitario != null && (
                    <div className="text-xs text-green-600">SINAPI: {formatCurrency(item.preco_sinapi_unitario)}</div>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {item.sem_preco_sinapi ? (
                    <Badge variant="destructive" className="text-xs">Sem preço SINAPI</Badge>
                  ) : (
                    formatCurrency(item.preco_total)
                  )}
                </TableCell>
                <TableCell>
                  {isConciliado ? (
                    <Badge className="text-xs bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                      onClick={() => onLinkClick(item, match?.matches || [])}>
                      ✓ {item.codigo_sinapi}
                    </Badge>
                  ) : hasSinapiCode ? (
                    <Badge variant="outline" className="text-xs">{item.codigo_sinapi}</Badge>
                  ) : match && !match.matched ? (
                    <Badge variant="destructive" className="text-xs cursor-pointer"
                      onClick={() => onLinkClick(item, [])}>
                      <Link2 className="h-3 w-3 mr-1" /> Vincular
                    </Badge>
                  ) : match && match.matched ? (
                    <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                      onClick={() => onLinkClick(item, match.matches)}>
                      <Link2 className="h-3 w-3 mr-1" /> Vincular ({match.matches.length})
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {item.origem_preco?.includes("Sem") ? "Est." : "—"}
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
            <p className="text-xl font-bold">{formatCurrency(resumo.total_materiais)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Total Mão de Obra</p>
            <p className="text-xl font-bold">{formatCurrency(resumo.total_mao_de_obra)}</p>
          </div>
          {resumo.bdi_valor && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">BDI ({resumo.bdi_percentual}%)</p>
              <p className="text-xl font-bold">{formatCurrency(resumo.bdi_valor)}</p>
              {resumo.premissas_bdi && <p className="text-xs text-muted-foreground mt-1">{resumo.premissas_bdi}</p>}
            </div>
          )}
          <div className="rounded-lg border bg-primary/10 p-4">
            <p className="text-xs text-muted-foreground">Total Geral</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(resumo.total_geral)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsSection({ items }: { items: BrandRecommendation[] }) {
  if (!items?.length) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" /> Recomendações de Marcas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((rec, i) => (
          <div key={i}>
            <h4 className="mb-2 font-semibold">{rec.material}</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {rec.marcas.map((m, j) => (
                <div key={j} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">#{j + 1}</Badge>
                    <span className="font-medium">{m.nome}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.justificativa}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AnaliseResultado() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchingPrices, setMatchingPrices] = useState(false);
  const [sinapiMatches, setSinapiMatches] = useState<Record<string, { matched: boolean; matches: SinapiMatch[] }>>({});
  const [linkModal, setLinkModal] = useState<{ open: boolean; item: BudgetItem | null; suggestions: SinapiMatch[] }>({
    open: false, item: null, suggestions: [],
  });
  const [localResult, setLocalResult] = useState<AnalysisResult | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [diarioRefreshKey, setDiarioRefreshKey] = useState(0);

  // Build dynamic room grouping from all macro_etapas items
  const roomGroups = useMemo(() => {
    if (!localResult?.macro_etapas?.length) return [];
    const groups: Record<string, BudgetItem[]> = {};
    for (const etapa of localResult.macro_etapas) {
      for (const item of etapa.itens || []) {
        const room = item.local_aplicacao || "Geral";
        if (!groups[room]) groups[room] = [];
        groups[room].push(item);
      }
    }
    return Object.entries(groups).map(([comodo, itens]) => ({
      comodo,
      itens,
      subtotal: itens.reduce((sum, it) => {
        const t = typeof it.preco_total === "string" ? parseFloat(it.preco_total) : it.preco_total;
        return sum + (isNaN(t) ? 0 : t);
      }, 0),
    }));
  }, [localResult]);

  // Filter items by search term
  const filterItems = useCallback((items: BudgetItem[]) => {
    if (!searchFilter.trim()) return items;
    const term = searchFilter.toLowerCase();
    return items.filter(
      (it) =>
        it.descricao.toLowerCase().includes(term) ||
        it.item.toLowerCase().includes(term) ||
        (it.local_aplicacao || "").toLowerCase().includes(term) ||
        (it.marca || "").toLowerCase().includes(term)
    );
  }, [searchFilter]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("analyses").select("*").eq("id", id).single();
      setAnalysis(data as any);
      if (data?.resultado_json) {
        setLocalResult(data.resultado_json as any);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Run SINAPI matching
  const runMatching = useCallback(async () => {
    if (!localResult?.macro_etapas?.length) return;
    setMatchingPrices(true);

    const allItems = localResult.macro_etapas.flatMap((e) =>
      e.itens.filter((i) => !i.preco_conciliado).map((i) => ({ descricao: i.descricao, item: i.item }))
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
      setSinapiMatches(data.results || {});
      toast.success(`Busca concluída: ${Object.values(data.results || {}).filter((r: any) => r.matched).length} itens encontrados na base SINAPI.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao buscar preços SINAPI.");
    }
    setMatchingPrices(false);
  }, [localResult, analysis]);

  // Handle linking a SINAPI price to an item
  const handleLinkPrice = useCallback((selectedMatch: SinapiMatch) => {
    if (!linkModal.item || !localResult) return;

    const itemCode = linkModal.item.item;
    const precoUnit = (selectedMatch.preco_material || 0) + (selectedMatch.preco_mao_de_obra || 0);

    const updatedResult = { ...localResult };
    updatedResult.macro_etapas = updatedResult.macro_etapas.map((etapa) => ({
      ...etapa,
      itens: etapa.itens.map((it) => {
        if (it.item !== itemCode) return it;
        const qty = typeof it.quantidade === "string" ? parseFloat(it.quantidade) : it.quantidade;
        const newTotal = precoUnit * (isNaN(qty) ? 1 : qty);
        return {
          ...it,
          preco_unitario: precoUnit,
          preco_total: newTotal,
          codigo_sinapi: selectedMatch.codigo,
          origem_preco: "SINAPI",
          preco_sinapi_unitario: precoUnit,
          preco_conciliado: true,
          sinapi_match: selectedMatch,
        };
      }),
      subtotal: 0, // will be recalculated
    }));

    // Recalculate subtotals
    updatedResult.macro_etapas = updatedResult.macro_etapas.map((etapa) => ({
      ...etapa,
      subtotal: etapa.itens.reduce((sum, it) => {
        const t = typeof it.preco_total === "string" ? parseFloat(it.preco_total) : it.preco_total;
        return sum + (isNaN(t) ? 0 : t);
      }, 0),
    }));

    // Recalculate financial summary with BDI
    const bdi = analysis?.bdi_percentual || 25;
    updatedResult.resumo_final = recalculateTotals(updatedResult, bdi);

    setLocalResult(updatedResult);

    // Persist to DB
    const totalGeral = typeof updatedResult.resumo_final.total_geral === "string"
      ? parseFloat(updatedResult.resumo_final.total_geral)
      : updatedResult.resumo_final.total_geral;

    supabase
      .from("analyses")
      .update({
        resultado_json: updatedResult as any,
        total_estimado: isNaN(totalGeral) ? null : totalGeral,
      })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Failed to persist:", error);
      });

    toast.success(`Preço SINAPI vinculado ao item ${itemCode}`);
  }, [linkModal.item, localResult, analysis, id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!analysis || !localResult) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Resultado não encontrado</p>
        <Button asChild><Link to="/dashboard">Voltar ao Dashboard</Link></Button>
      </div>
    );
  }

  const result = localResult;
  const hasMacroEtapas = result.macro_etapas?.length > 0;
  const computedSummary = recalculateTotals(result, analysis.bdi_percentual || 25);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-primary text-primary-foreground">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
            </Button>
            <div className="flex items-center gap-2 font-bold">
              <Box className="h-5 w-5" />
              {analysis.nome_projeto}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const shareUrl = `${window.location.origin}/share/${id}`;
              navigator.clipboard.writeText(shareUrl);
              toast.success("Link copiado! Envie para o cliente.");
            }}>
              <Share2 className="mr-1 h-4 w-4" /> Compartilhar
            </Button>
            <Button variant="outline" size="sm" onClick={runMatching} disabled={matchingPrices}>
              {matchingPrices ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
              Conciliar SINAPI
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToPDF(analysis.nome_projeto, result)}>
              <Download className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToExcel(analysis.nome_projeto, result)}>
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
            </Button>
          </div>
        </div>
      </nav>

      <div className="container py-8 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Área Total</p>
                <p className="text-2xl font-bold">{result.area_total_m2} m²</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Escala</p>
                <p className="text-2xl font-bold">{result.escala_detectada}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="text-2xl font-bold">{analysis.tipo_construcao || "—"}</p>
              </div>
              {result.referencia_sinapi && (
                <div>
                  <p className="text-sm text-muted-foreground">Ref. SINAPI</p>
                  <p className="text-lg font-bold">{result.referencia_sinapi}</p>
                </div>
              )}
            </div>
            {result.resumo && <p className="mt-4 text-muted-foreground">{result.resumo}</p>}
          </CardContent>
        </Card>

        <ExecutiveDashboard result={result} resumo={computedSummary} analysisId={id} />

        <PredictiveDelayAlert analysisId={id!} refreshKey={diarioRefreshKey} />
        <AlertHistoryTimeline analysisId={id!} projectName={analysis.nome_projeto} refreshKey={diarioRefreshKey} />

        <SummaryCard resumo={computedSummary} />

        {hasMacroEtapas ? (
          <>
            {/* Search filter */}
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
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="orcamento">Visão Geral (Categorias)</TabsTrigger>
                <TabsTrigger value="comodos">
                  <Home className="h-3.5 w-3.5 mr-1" /> Visão por Cômodo
                </TabsTrigger>
                <TabsTrigger value="recomendacoes">Marcas</TabsTrigger>
                <TabsTrigger value="cronograma">
                  <CalendarDays className="h-3.5 w-3.5 mr-1" /> Cronograma (Gantt)
                </TabsTrigger>
                <TabsTrigger value="diario">
                  <ClipboardList className="h-3.5 w-3.5 mr-1" /> Diário de Obra
                </TabsTrigger>
                <TabsTrigger value="memorial">
                  <ScrollText className="h-3.5 w-3.5 mr-1" /> Memorial Descritivo
                </TabsTrigger>
                <TabsTrigger value="conflitos">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Conflitos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orcamento" className="space-y-6">
                {result.macro_etapas.map((etapa, i) => {
                  const filtered = filterItems(etapa.itens);
                  if (!filtered.length && searchFilter) return null;
                  const subtotal = filtered.reduce((s, it) => {
                    const t = typeof it.preco_total === "string" ? parseFloat(it.preco_total) : it.preco_total;
                    return s + (isNaN(t) ? 0 : t);
                  }, 0);
                  return (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{etapa.nome}</CardTitle>
                          <Badge variant="outline" className="font-mono">
                            {formatCurrency(searchFilter ? subtotal : etapa.subtotal)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <BudgetTable
                          items={filtered}
                          title=""
                          sinapiMatches={sinapiMatches}
                          onLinkClick={(item, suggestions) => setLinkModal({ open: true, item, suggestions })}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="comodos" className="space-y-6">
                {roomGroups.map((group, i) => {
                  const filtered = filterItems(group.itens);
                  if (!filtered.length && searchFilter) return null;
                  const subtotal = filtered.reduce((s, it) => {
                    const t = typeof it.preco_total === "string" ? parseFloat(it.preco_total) : it.preco_total;
                    return s + (isNaN(t) ? 0 : t);
                  }, 0);
                  return (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">{group.comodo}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{filtered.length} itens</Badge>
                            <Badge variant="outline" className="font-mono">
                              {formatCurrency(searchFilter ? subtotal : group.subtotal)}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <BudgetTable
                          items={filtered}
                          title=""
                          sinapiMatches={sinapiMatches}
                          onLinkClick={(item, suggestions) => setLinkModal({ open: true, item, suggestions })}
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
                <RecommendationsSection items={result.recomendacoes} />
              </TabsContent>

              <TabsContent value="cronograma">
                <GanttChart
                  analysisId={id!}
                  macroEtapas={result.macro_etapas || []}
                  areaM2={result.area_total_m2 || 100}
                  onSaved={() => setDiarioRefreshKey((value) => value + 1)}
                />
              </TabsContent>

              <TabsContent value="diario">
                <ConstructionDiaryPanel analysisId={id!} onSaved={() => setDiarioRefreshKey((value) => value + 1)} />
              </TabsContent>

              <TabsContent value="memorial">
                <MemorialDescritivo
                  analysisResult={result}
                  nomeProjeto={analysis.nome_projeto}
                  tipoConstrucao={analysis.tipo_construcao || undefined}
                  totalObra={typeof computedSummary.total_geral === "string" ? parseFloat(computedSummary.total_geral) : computedSummary.total_geral}
                  bdiPercent={analysis.bdi_percentual || 25}
                />
              </TabsContent>

              <TabsContent value="conflitos">
                <ClashDetectionPanel analysisId={id!} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Formato de resultado legado. Refaça a análise para obter o novo formato.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {linkModal.item && (
        <SinapiLinkModal
          open={linkModal.open}
          onClose={() => setLinkModal({ open: false, item: null, suggestions: [] })}
          itemDescricao={linkModal.item.descricao}
          itemCode={linkModal.item.item}
          suggestions={linkModal.suggestions}
          onSelect={handleLinkPrice}
        />
      )}
    </div>
  );
}
