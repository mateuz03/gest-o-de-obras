import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AnalysisResult, BudgetItem, ResumoFinal } from "./types";

function fmt(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d = new Date()) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function flatten(result: AnalysisResult): { etapa: string; item: BudgetItem }[] {
  const rows: { etapa: string; item: BudgetItem }[] = [];
  for (const e of result.macro_etapas || []) {
    for (const it of e.itens || []) rows.push({ etapa: e.nome, item: it });
  }
  return rows;
}

export function exportOrcaLinkPDF(projectName: string, result: AnalysisResult, resumo: ResumoFinal) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ===== Header =====
  doc.setFillColor(30, 58, 138); // primary #1E3A8A
  doc.rect(0, 0, pageW, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("OrçaLink", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Orçamento Inteligente de Obras", 14, 19);

  doc.setFontSize(9);
  doc.text(`Emitido em ${fmtDate()}`, pageW - 14, 14, { align: "right" });
  doc.text(projectName, pageW - 14, 19, { align: "right" });

  // ===== Project title =====
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(projectName, 14, 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const meta = [
    result.area_total_m2 ? `Área: ${result.area_total_m2} m²` : null,
    result.escala_detectada ? `Escala: ${result.escala_detectada}` : null,
    result.referencia_sinapi ? `Ref. SINAPI: ${result.referencia_sinapi}` : null,
  ].filter(Boolean).join("  •  ");
  if (meta) doc.text(meta, 14, 37);

  // ===== Executive summary cards =====
  const totalMat = typeof resumo.total_materiais === "string" ? parseFloat(resumo.total_materiais) : resumo.total_materiais || 0;
  const totalMo = typeof resumo.total_mao_de_obra === "string" ? parseFloat(resumo.total_mao_de_obra) : resumo.total_mao_de_obra || 0;
  const totalGer = typeof resumo.total_geral === "string" ? parseFloat(resumo.total_geral) : resumo.total_geral || 0;
  const bdiVal = typeof resumo.bdi_valor === "string" ? parseFloat(resumo.bdi_valor as string) : (resumo.bdi_valor as number) || 0;

  const cards: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Total Materiais", value: fmt(totalMat) },
    { label: "Total Mão de Obra", value: fmt(totalMo) },
    ...(bdiVal ? [{ label: `BDI (${resumo.bdi_percentual}%)`, value: fmt(bdiVal) }] : []),
    { label: "VALOR TOTAL DA OBRA", value: fmt(totalGer), highlight: true },
  ];

  const cardW = (pageW - 28 - (cards.length - 1) * 4) / cards.length;
  const cardY = 44;
  cards.forEach((c, i) => {
    const x = 14 + i * (cardW + 4);
    if (c.highlight) {
      doc.setFillColor(13, 148, 136); // CTA teal
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(241, 245, 249);
      doc.setTextColor(30, 41, 59);
    }
    doc.roundedRect(x, cardY, cardW, 18, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(c.label, x + 3, cardY + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(c.highlight ? 12 : 11);
    doc.text(c.value, x + 3, cardY + 14);
  });

  // ===== Items table =====
  const rows = flatten(result);
  let hasEstimate = false;
  const body = rows.map(({ etapa, item }) => {
    const isEst = item.estimado_ia || item.origem_preco?.toLowerCase().includes("estimativa");
    if (isEst) hasEstimate = true;
    const desc = (isEst ? "* " : "") + item.descricao;
    return [
      etapa,
      item.item,
      desc,
      item.local_aplicacao || "—",
      String(item.quantidade ?? ""),
      item.unidade || "",
      fmt(item.preco_unitario),
      fmt(item.preco_total),
    ];
  });

  autoTable(doc, {
    startY: cardY + 24,
    head: [["Etapa", "Cód", "Descrição", "Local", "Qtd", "Un", "R$ Unit.", "R$ Total"]],
    body,
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 14, fontStyle: "bold" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 28 },
      4: { cellWidth: 14, halign: "right" },
      5: { cellWidth: 12 },
      6: { cellWidth: 24, halign: "right" },
      7: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14, bottom: 18 },
    didDrawPage: () => {
      // Footer
      const ph = doc.internal.pageSize.getHeight();
      const pw = doc.internal.pageSize.getWidth();
      doc.setDrawColor(226, 232, 240);
      doc.line(14, ph - 12, pw - 14, ph - 12);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(
        hasEstimate
          ? "* Itens marcados com asterisco tiveram preço unitário estimado por IA quando não localizados na base SINAPI oficial."
          : "Preços referenciados na base SINAPI oficial.",
        14,
        ph - 7
      );
      const page = doc.getCurrentPageInfo().pageNumber;
      doc.text(`OrçaLink • ${fmtDate()} • Pág. ${page}`, pw - 14, ph - 7, { align: "right" });
    },
  });

  doc.save(`OrcaLink_${projectName.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}
