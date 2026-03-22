import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Analysis, AnalysisResult, MaterialItem, BrandRecommendation } from "@/lib/types";
import { ArrowLeft, Building2, Download, FileSpreadsheet, FileText, Ruler, Zap, Paintbrush } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/export";

function MaterialTable({ items, title, icon: Icon }: { items: MaterialItem[]; title: string; icon: any }) {
  if (!items?.length) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{item.material}</TableCell>
                <TableCell className="text-right">{item.quantidade}</TableCell>
                <TableCell>{item.unidade}</TableCell>
                <TableCell className="text-muted-foreground">{item.observacao || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RecommendationsTable({ items }: { items: BrandRecommendation[] }) {
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
      const { data } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", id)
        .single();
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

      <div className="container py-8">
        {/* Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Área Total</p>
                <p className="text-2xl font-bold">{result.area_total_m2} m²</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Escala Detectada</p>
                <p className="text-2xl font-bold">{result.escala_detectada}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="text-2xl font-bold">{analysis.tipo_construcao || "—"}</p>
              </div>
            </div>
            {result.resumo && (
              <p className="mt-4 text-muted-foreground">{result.resumo}</p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="estrutura" className="space-y-4">
          <TabsList>
            <TabsTrigger value="estrutura">Estrutura</TabsTrigger>
            <TabsTrigger value="acabamento">Acabamento</TabsTrigger>
            <TabsTrigger value="eletrica">Elétrica</TabsTrigger>
            <TabsTrigger value="hidraulica">Hidráulica</TabsTrigger>
            <TabsTrigger value="recomendacoes">Marcas</TabsTrigger>
          </TabsList>
          <TabsContent value="estrutura">
            <MaterialTable items={result.estrutura} title="Materiais de Estrutura" icon={Building2} />
          </TabsContent>
          <TabsContent value="acabamento">
            <MaterialTable items={result.acabamento} title="Materiais de Acabamento" icon={Paintbrush} />
          </TabsContent>
          <TabsContent value="eletrica">
            <MaterialTable items={result.instalacoes_eletricas || result.instalacoes || []} title="Instalações Elétricas" icon={Zap} />
          </TabsContent>
          <TabsContent value="hidraulica">
            <MaterialTable items={result.instalacoes_hidraulicas || []} title="Instalações Hidráulicas" icon={Ruler} />
          </TabsContent>
          <TabsContent value="recomendacoes">
            <RecommendationsTable items={result.recomendacoes} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
