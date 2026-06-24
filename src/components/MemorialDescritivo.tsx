import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { loadPdfExportDeps } from "@/lib/lazyDeps";
import { AnalysisResult, BudgetItem } from "@/lib/types";
import { FileText, Loader2, Download, Sparkles, Eye, Code } from "lucide-react";
import { toast } from "sonner";
import { MaterialPerformanceCard } from "./MaterialPerformanceCard";
import { InteractiveMemorial } from "./InteractiveMemorial";

interface MemorialDescritivoProps {
  analysisResult: AnalysisResult;
  nomeProjeto: string;
  tipoConstrucao?: string;
  totalObra?: number;
  bdiPercent?: number;
}

const FINISHING_KEYWORDS = [
  "piso", "porcelanato", "ceramic", "azulejo", "revestimento", "rejunte",
  "tinta", "pintura", "esmalte", "verniz", "massa corrida",
  "louça", "vaso", "cuba", "torneira", "ducha", "registro", "metais",
  "porta", "janela", "esquadria", "vidro", "fechadura",
  "gesso", "forro", "drywall", "moldura",
  "granito", "mármore", "marmore", "bancada", "soleira",
  "luminária", "lustre", "spot", "led",
];

function isFinishingItem(descricao: string): boolean {
  const d = descricao.toLowerCase();
  return FINISHING_KEYWORDS.some((kw) => d.includes(kw));
}

function getNumeric(value: number | string | undefined | null): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function MemorialDescritivo({
  analysisResult, nomeProjeto, tipoConstrucao,
  totalObra = 0, bdiPercent = 25,
}: MemorialDescritivoProps) {
  const [memorial, setMemorial] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [viewMode, setViewMode] = useState<"interactive" | "raw">("interactive");
  const [cardOpen, setCardOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);

  // Collect all finishing items from the budget
  const finishingItems = useMemo(() => {
    const items: BudgetItem[] = [];
    (analysisResult.macro_etapas || []).forEach((etapa) => {
      etapa.itens?.forEach((item) => {
        if (isFinishingItem(item.descricao || "")) {
          items.push(item);
        }
      });
    });
    return items;
  }, [analysisResult]);

  const openCard = (item: BudgetItem) => {
    setSelectedItem(item);
    setCardOpen(true);
  };

  // Build a chip-aware rendering of memorial text
  const interactiveMemorial = useMemo(() => {
    if (!memorial || finishingItems.length === 0) return null;

    // Build keyword index from item descriptions (first 2-3 significant words)
    const matches: { keyword: string; item: BudgetItem }[] = [];
    finishingItems.forEach((item) => {
      const words = (item.descricao || "")
        .toLowerCase()
        .split(/[\s,()\-/]+/)
        .filter((w) => w.length >= 4 && !["para", "com", "sem", "tipo", "linha"].includes(w));
      // Use first significant word as anchor
      if (words.length > 0) matches.push({ keyword: words[0], item });
    });

    // Walk through memorial and build segments
    const segments: { text: string; item?: BudgetItem }[] = [];
    let remaining = memorial;
    const lower = memorial.toLowerCase();
    const used = new Set<string>();
    const positions: { start: number; end: number; item: BudgetItem }[] = [];

    matches.forEach(({ keyword, item }) => {
      if (used.has(item.descricao)) return;
      const idx = lower.indexOf(keyword);
      if (idx >= 0) {
        positions.push({ start: idx, end: idx + keyword.length, item });
        used.add(item.descricao);
      }
    });

    positions.sort((a, b) => a.start - b.start);
    // Filter overlapping
    const clean: typeof positions = [];
    let lastEnd = -1;
    for (const p of positions) {
      if (p.start >= lastEnd) {
        clean.push(p);
        lastEnd = p.end;
      }
    }

    let cursor = 0;
    clean.forEach((p) => {
      if (p.start > cursor) segments.push({ text: memorial.slice(cursor, p.start) });
      segments.push({ text: memorial.slice(p.start, p.end), item: p.item });
      cursor = p.end;
    });
    if (cursor < memorial.length) segments.push({ text: memorial.slice(cursor) });

    return segments;
  }, [memorial, finishingItems]);

  const generateMemorial = useCallback(async () => {
    setGenerating(true);
    try {
      const materiaisText = (analysisResult.macro_etapas || [])
        .map((etapa) => {
          const itensText = etapa.itens
            .map((it) => `- ${it.descricao} | Qtd: ${it.quantidade} ${it.unidade} | ${it.local_aplicacao || "Geral"} | Marca: ${it.marca || "—"}`)
            .join("\n");
          return `### ${etapa.nome}\n${itensText}`;
        })
        .join("\n\n");

      const { data, error } = await supabase.functions.invoke("generate-memorial", {
        body: {
          materiais: materiaisText,
          resumo_obra: analysisResult.resumo || "",
          nome_projeto: nomeProjeto,
          area_m2: analysisResult.area_total_m2,
          tipo_construcao: tipoConstrucao || "Residencial",
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setMemorial(data.memorial || "Nenhum conteúdo gerado.");
      toast.success("Memorial Descritivo gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar Memorial Descritivo.");
    }
    setGenerating(false);
  }, [analysisResult, nomeProjeto, tipoConstrucao]);

  const downloadPDF = useCallback(async () => {
    if (!memorial) return;
    setExportingPdf(true);

    try {
      const { jsPDF } = await loadPdfExportDeps();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Memorial Descritivo", margin, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Projeto: ${nomeProjeto}`, margin, 35);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, margin, 42);

      doc.setLineWidth(0.5);
      doc.line(margin, 47, pageWidth - margin, 47);

      const lines = doc.splitTextToSize(memorial.replace(/[#*]/g, ""), maxWidth);
      let y = 55;
      const lineHeight = 5;
      for (const line of lines) {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }

      doc.save(`Memorial_${nomeProjeto.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF baixado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar o PDF do memorial.");
    } finally {
      setExportingPdf(false);
    }
  }, [memorial, nomeProjeto]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Memorial Descritivo Paramétrico
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {memorial && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewMode(viewMode === "interactive" ? "raw" : "interactive")}
                >
                  {viewMode === "interactive" ? <><Code className="h-3.5 w-3.5 mr-1" /> Editar texto</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Visualizar</>}
                </Button>
              )}
              <Button size="sm" onClick={generateMemorial} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
                {memorial ? "Regenerar" : "Gerar Memorial"}
              </Button>
              {memorial && (
                <Button variant="outline" size="sm" onClick={() => void downloadPDF()} disabled={exportingPdf}>
                  {exportingPdf ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  Baixar PDF
                </Button>
              )}
            </div>
          </div>
          {memorial && finishingItems.length > 0 && viewMode === "interactive" && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Clique em um <span className="font-medium text-primary">termo destacado</span> ou em um item ao lado para ver o Card de Performance (Premium / Padrão / Econômica).
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!memorial && !generating && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Clique em "Gerar Memorial" para criar um Memorial Descritivo técnico baseado nos materiais e quantitativos da análise.
            </p>
          )}
          {generating && (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Gerando Memorial Descritivo com IA...</span>
            </div>
          )}
          {memorial && !generating && viewMode === "raw" && (
            <Textarea
              value={memorial}
              onChange={(e) => setMemorial(e.target.value)}
              className="min-h-[400px] font-mono text-sm leading-relaxed"
              placeholder="O memorial aparecerá aqui..."
            />
          )}
          {memorial && !generating && viewMode === "interactive" && (
            <div className="grid gap-4 md:grid-cols-[1fr_280px]">
              {/* Memorial text with clickable chips */}
              <div className="border rounded-lg p-4 bg-card whitespace-pre-wrap text-sm leading-relaxed max-h-[600px] overflow-y-auto">
                {interactiveMemorial ? (
                  interactiveMemorial.map((seg, i) =>
                    seg.item ? (
                      <button
                        key={i}
                        onClick={() => openCard(seg.item!)}
                        className="inline-flex items-center bg-primary/10 hover:bg-primary/20 text-primary font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer underline decoration-dotted decoration-primary/50"
                        title={`Ver alternativas para: ${seg.item.descricao}`}
                      >
                        {seg.text}
                      </button>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    )
                  )
                ) : (
                  <span>{memorial}</span>
                )}
              </div>

              {/* Side list of finishing items */}
              <div className="border rounded-lg p-3 bg-muted/30">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Itens de Acabamento
                  <Badge variant="secondary" className="ml-auto text-xs">{finishingItems.length}</Badge>
                </h4>
                <ScrollArea className="h-[540px] pr-2">
                  <div className="space-y-1.5">
                    {finishingItems.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">Nenhum item de acabamento detectado no orçamento.</p>
                    )}
                    {finishingItems.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => openCard(item)}
                        className="w-full text-left text-xs p-2 rounded border bg-card hover:bg-accent/10 hover:border-primary/40 transition-colors"
                      >
                        <p className="font-medium leading-snug line-clamp-2">{item.descricao}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {getNumeric(item.quantidade)} {item.unidade}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <InteractiveMemorial analysisResult={analysisResult} totalObra={totalObra} />

      {selectedItem && (
        <MaterialPerformanceCard
          open={cardOpen}
          onOpenChange={setCardOpen}
          itemDescricao={selectedItem.descricao || ""}
          unidade={selectedItem.unidade || "un"}
          quantidade={getNumeric(selectedItem.quantidade)}
          precoAtualUnit={getNumeric(selectedItem.preco_unitario)}
          totalObra={totalObra}
          bdiPercent={bdiPercent}
        />
      )}
    </>
  );
}
