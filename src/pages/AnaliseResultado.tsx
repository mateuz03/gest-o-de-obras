import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Analysis, AnalysisResult, MacroEtapa, ComodoQuantitativo, BudgetItem, BrandRecommendation, ResumoFinal } from "@/lib/types";
import { ArrowLeft, Building2, Download, FileSpreadsheet, FileText, DollarSign } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/export";

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function BudgetTable({ items, title }: { items: BudgetItem[]; title: string }) {
  if (!items?.length) return null;
  return (
    <div className="overflow-x-auto">
      <h4 className="text-sm font-semibold mb-2 text-foreground">{title}</h4>
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
          {items.map((item, i) => (
            <TableRow key={i}>
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
              <TableCell className="text-right">{formatCurrency(item.preco_unitario)}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(item.preco_total)}</TableCell>
              <TableCell>
                {item.codigo_sinapi ? (
                  <Badge variant="outline" className="text-xs">{item.codigo_sinapi}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{item.origem_preco?.includes("Sem") ? "Est." : "—"}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
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

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("analyses").select("*").eq("id", id).single();
      setAnalysis(data as any);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!analysis?.resultado_json) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Resultado não encontrado</p>
        <Button asChild><Link to="/dashboard">Voltar ao Dashboard</Link></Button>
      </div>
    );
  }

  const result = analysis.resultado_json as AnalysisResult;
  const hasMacroEtapas = result.macro_etapas?.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
            </Button>
            <div className="flex items-center gap-2 font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Building2 className="h-5 w-5 text-primary" />
              {analysis.nome_projeto}
            </div>
          </div>
          <div className="flex gap-2">
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
        {/* Summary header */}
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

        {/* Financial summary */}
        {result.resumo_final && <SummaryCard resumo={result.resumo_final} />}

        {/* Main content */}
        {hasMacroEtapas ? (
          <Tabs defaultValue="orcamento" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="orcamento">Orçamento por Etapa</TabsTrigger>
              {result.quantitativo_por_comodo?.length && <TabsTrigger value="comodos">Por Cômodo</TabsTrigger>}
              <TabsTrigger value="recomendacoes">Marcas</TabsTrigger>
            </TabsList>

            <TabsContent value="orcamento" className="space-y-6">
              {result.macro_etapas.map((etapa, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{etapa.nome}</CardTitle>
                      <Badge variant="outline" className="font-mono">{formatCurrency(etapa.subtotal)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BudgetTable items={etapa.itens} title="" />
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {result.quantitativo_por_comodo?.length && (
              <TabsContent value="comodos" className="space-y-6">
                {result.quantitativo_por_comodo.map((comodo, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{comodo.comodo}</CardTitle>
                        <Badge variant="outline" className="font-mono">{formatCurrency(comodo.subtotal)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <BudgetTable items={comodo.itens} title="" />
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            )}

            <TabsContent value="recomendacoes">
              <RecommendationsSection items={result.recomendacoes} />
            </TabsContent>
          </Tabs>
        ) : (
          // Legacy fallback for old analyses
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Formato de resultado legado. Refaça a análise para obter o novo formato de orçamento.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
