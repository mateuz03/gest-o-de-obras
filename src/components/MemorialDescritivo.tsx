import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { AnalysisResult } from "@/lib/types";
import { FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface MemorialDescritivoProps {
  analysisResult: AnalysisResult;
  nomeProjeto: string;
  tipoConstrucao?: string;
}

export function MemorialDescritivo({ analysisResult, nomeProjeto, tipoConstrucao }: MemorialDescritivoProps) {
  const [memorial, setMemorial] = useState("");
  const [generating, setGenerating] = useState(false);

  const generateMemorial = useCallback(async () => {
    setGenerating(true);
    try {
      // Build materials summary
      const materiaisText = (analysisResult.macro_etapas || [])
        .map(etapa => {
          const itensText = etapa.itens.map(it =>
            `- ${it.descricao} | Qtd: ${it.quantidade} ${it.unidade} | ${it.local_aplicacao || "Geral"} | Marca: ${it.marca || "—"}`
          ).join("\n");
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

  const downloadPDF = useCallback(() => {
    if (!memorial) return;

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

    // Split memorial into lines and render
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
  }, [memorial, nomeProjeto]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Memorial Descritivo
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={generateMemorial} disabled={generating}>
              {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
              {memorial ? "Regenerar" : "Gerar Memorial"}
            </Button>
            {memorial && (
              <Button variant="outline" size="sm" onClick={downloadPDF}>
                <Download className="h-3.5 w-3.5 mr-1" /> Baixar PDF
              </Button>
            )}
          </div>
        </div>
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
        {memorial && !generating && (
          <Textarea
            value={memorial}
            onChange={(e) => setMemorial(e.target.value)}
            className="min-h-[400px] font-mono text-sm leading-relaxed"
            placeholder="O memorial aparecerá aqui..."
          />
        )}
      </CardContent>
    </Card>
  );
}
