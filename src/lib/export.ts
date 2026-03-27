import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { AnalysisResult, BudgetItem } from "./types";

function fmt(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function budgetRows(items: BudgetItem[]) {
  return items.map((i) => [
    i.item,
    i.descricao + (i.perda_aplicada ? ` (perda: ${i.perda_aplicada})` : ""),
    i.local_aplicacao || "—",
    i.fornecedor,
    i.marca,
    String(i.quantidade),
    i.unidade,
    fmt(i.preco_unitario),
    fmt(i.preco_total),
    i.codigo_sinapi || (i.origem_preco?.includes("Sem") ? "Est." : ""),
  ]);
}

const BUDGET_HEAD = [["Item", "Descrição", "Local", "Fornec.", "Marca", "Quant", "Unid", "R$ Unit.", "R$ Total", "SINAPI"]];

export function exportToPDF(projectName: string, result: AnalysisResult) {
  const doc = new jsPDF({ orientation: "landscape" });
  let y = 15;

  doc.setFontSize(18);
  doc.text("AI Construct Estimator — Orçamento", 14, y);
  y += 8;
  doc.setFontSize(13);
  doc.text(projectName, 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.text(`Área: ${result.area_total_m2} m² | Escala: ${result.escala_detectada}${result.referencia_sinapi ? ` | Ref: ${result.referencia_sinapi}` : ""}`, 14, y);
  y += 4;

  if (result.resumo) {
    const lines = doc.splitTextToSize(result.resumo, 270);
    doc.text(lines, 14, y + 3);
    y += 3 + lines.length * 3.5;
  }

  // Macro etapas
  if (result.macro_etapas?.length) {
    for (const etapa of result.macro_etapas) {
      if (!etapa.itens?.length) continue;
      doc.setFontSize(11);
      doc.text(`${etapa.nome} — Subtotal: ${fmt(etapa.subtotal)}`, 14, y + 5);
      autoTable(doc, {
        startY: y + 8,
        head: BUDGET_HEAD,
        body: budgetRows(etapa.itens),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [245, 130, 32] },
        columnStyles: { 1: { cellWidth: 80 } },
      });
      y = (doc as any).lastAutoTable.finalY + 3;
      if (y > 180) { doc.addPage(); y = 15; }
    }
  }

  // Resumo final
  if (result.resumo_final) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Resumo Financeiro", 14, 20);
    autoTable(doc, {
      startY: 28,
      head: [["Descrição", "Valor"]],
      body: [
        ["Total Materiais", fmt(result.resumo_final.total_materiais)],
        ["Total Mão de Obra", fmt(result.resumo_final.total_mao_de_obra)],
        ...(result.resumo_final.bdi_valor ? [[`BDI (${result.resumo_final.bdi_percentual}%)`, fmt(result.resumo_final.bdi_valor)]] : []),
        ["TOTAL GERAL", fmt(result.resumo_final.total_geral)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [245, 130, 32] },
    });
  }

  // Recomendações
  if (result.recomendacoes?.length) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Recomendações de Marcas", 14, 20);
    let ry = 28;
    result.recomendacoes.forEach((rec) => {
      autoTable(doc, {
        startY: ry,
        head: [[rec.material, "Marca", "Justificativa"]],
        body: rec.marcas.map((m, i) => [`#${i + 1}`, m.nome, m.justificativa]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [245, 130, 32] },
      });
      ry = (doc as any).lastAutoTable.finalY + 5;
    });
  }

  doc.save(`${projectName.replace(/\s+/g, "_")}_orcamento.pdf`);
}

export function exportToExcel(projectName: string, result: AnalysisResult) {
  const wb = XLSX.utils.book_new();

  const budgetToSheet = (items: BudgetItem[]) =>
    items.map((i) => ({
      Item: i.item,
      Descrição: i.descricao,
      Local: i.local_aplicacao || "—",
      Fornecedor: i.fornecedor,
      Marca: i.marca,
      Quantidade: i.quantidade,
      Unidade: i.unidade,
      "R$ Unitário": i.preco_unitario,
      "R$ Total": i.preco_total,
      "Cód. SINAPI": i.codigo_sinapi || "",
      "Origem Preço": i.origem_preco || "",
      "Perda Aplicada": i.perda_aplicada || "",
    }));

  // All items in one sheet
  if (result.macro_etapas?.length) {
    const allItems: any[] = [];
    for (const etapa of result.macro_etapas) {
      allItems.push({ Item: "", Descrição: `=== ${etapa.nome} ===`, Local: "", Fornecedor: "", Marca: "", Quantidade: "", Unidade: "", "R$ Unitário": "", "R$ Total": etapa.subtotal, "Cód. SINAPI": "", "Origem Preço": "", "Perda Aplicada": "" });
      allItems.push(...budgetToSheet(etapa.itens));
    }
    const ws = XLSX.utils.json_to_sheet(allItems);
    ws["!cols"] = [{ wch: 8 }, { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Orçamento");
  }

  // Per room
  if (result.quantitativo_por_comodo?.length) {
    const roomItems: any[] = [];
    for (const comodo of result.quantitativo_por_comodo) {
      roomItems.push({ Item: "", Descrição: `=== ${comodo.comodo} ===`, Local: "", Fornecedor: "", Marca: "", Quantidade: "", Unidade: "", "R$ Unitário": "", "R$ Total": comodo.subtotal, "Cód. SINAPI": "", "Origem Preço": "", "Perda Aplicada": "" });
      roomItems.push(...budgetToSheet(comodo.itens));
    }
    const ws = XLSX.utils.json_to_sheet(roomItems);
    ws["!cols"] = [{ wch: 8 }, { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Por Cômodo");
  }

  // Summary
  if (result.resumo_final) {
    const s = result.resumo_final;
    const summaryData = [
      { Descrição: "Total Materiais", Valor: s.total_materiais },
      { Descrição: "Total Mão de Obra", Valor: s.total_mao_de_obra },
      ...(s.bdi_valor ? [{ Descrição: `BDI (${s.bdi_percentual}%)`, Valor: s.bdi_valor }] : []),
      { Descrição: "TOTAL GERAL", Valor: s.total_geral },
    ];
    const ws = XLSX.utils.json_to_sheet(summaryData);
    ws["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "Resumo");
  }

  // Recommendations
  if (result.recomendacoes?.length) {
    const data: any[] = [];
    result.recomendacoes.forEach((rec) => {
      rec.marcas.forEach((m, i) => {
        data.push({ Material: rec.material, Posição: i + 1, Marca: m.nome, Justificativa: m.justificativa });
      });
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, "Recomendações");
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${projectName.replace(/\s+/g, "_")}_orcamento.xlsx`);
}
