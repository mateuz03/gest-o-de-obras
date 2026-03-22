import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { AnalysisResult } from "./types";

export function exportToPDF(projectName: string, result: AnalysisResult) {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(20);
  doc.text("AI Construct Estimator", 14, y);
  y += 10;
  doc.setFontSize(14);
  doc.text(projectName, 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Área Total: ${result.area_total_m2} m² | Escala: ${result.escala_detectada}`, 14, y);
  y += 5;

  if (result.resumo) {
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(result.resumo, 180);
    doc.text(lines, 14, y + 5);
    y += 5 + lines.length * 4;
  }

  const addTable = (title: string, items: any[], startY: number) => {
    doc.setFontSize(12);
    doc.text(title, 14, startY + 5);
    autoTable(doc, {
      startY: startY + 8,
      head: [["Material", "Quantidade", "Unidade", "Observação"]],
      body: items.map((i) => [i.material, i.quantidade, i.unidade, i.observacao || ""]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [245, 130, 32] },
    });
    return (doc as any).lastAutoTable.finalY;
  };

  if (result.estrutura?.length) y = addTable("Estrutura", result.estrutura, y + 5);
  if (result.acabamento?.length) y = addTable("Acabamento", result.acabamento, y + 5);
  if (result.instalacoes?.length) y = addTable("Instalações", result.instalacoes, y + 5);

  if (result.recomendacoes?.length) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Recomendações de Marcas", 14, 20);
    let ry = 28;
    result.recomendacoes.forEach((rec) => {
      autoTable(doc, {
        startY: ry,
        head: [[`${rec.material}`, "Marca", "Justificativa"]],
        body: rec.marcas.map((m, i) => [`#${i + 1}`, m.nome, m.justificativa]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [245, 130, 32] },
      });
      ry = (doc as any).lastAutoTable.finalY + 5;
    });
  }

  doc.save(`${projectName.replace(/\s+/g, "_")}_estimativa.pdf`);
}

export function exportToExcel(projectName: string, result: AnalysisResult) {
  const wb = XLSX.utils.book_new();

  const addSheet = (name: string, items: any[]) => {
    const data = items.map((i) => ({
      Material: i.material,
      Quantidade: i.quantidade,
      Unidade: i.unidade,
      Observação: i.observacao || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  if (result.estrutura?.length) addSheet("Estrutura", result.estrutura);
  if (result.acabamento?.length) addSheet("Acabamento", result.acabamento);
  if (result.instalacoes?.length) addSheet("Instalações", result.instalacoes);

  if (result.recomendacoes?.length) {
    const data: any[] = [];
    result.recomendacoes.forEach((rec) => {
      rec.marcas.forEach((m, i) => {
        data.push({
          Material: rec.material,
          Posição: i + 1,
          Marca: m.nome,
          Justificativa: m.justificativa,
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, "Recomendações");
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${projectName.replace(/\s+/g, "_")}_estimativa.xlsx`);
}
