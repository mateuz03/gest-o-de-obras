type XlsxModule = typeof import("xlsx");
type SaveAsFn = typeof import("file-saver")["saveAs"];
type JsPdfCtor = (typeof import("jspdf"))["default"];
type AutoTableFn = (typeof import("jspdf-autotable"))["default"];

let xlsxLoader: Promise<XlsxModule> | null = null;
let spreadsheetExportLoader: Promise<{ XLSX: XlsxModule; saveAs: SaveAsFn }> | null = null;
let pdfExportLoader: Promise<{ jsPDF: JsPdfCtor; autoTable: AutoTableFn }> | null = null;

export async function loadXlsx() {
  if (!xlsxLoader) {
    xlsxLoader = import("xlsx");
  }

  return xlsxLoader;
}

export async function loadSpreadsheetExportDeps() {
  if (!spreadsheetExportLoader) {
    spreadsheetExportLoader = Promise.all([loadXlsx(), import("file-saver")]).then(
      ([XLSX, fileSaverModule]) => ({
        XLSX,
        saveAs: fileSaverModule.saveAs,
      })
    );
  }

  return spreadsheetExportLoader;
}

export async function loadPdfExportDeps() {
  if (!pdfExportLoader) {
    pdfExportLoader = Promise.all([import("jspdf"), import("jspdf-autotable")]).then(
      ([jsPdfModule, autoTableModule]) => ({
        jsPDF: jsPdfModule.default,
        autoTable: autoTableModule.default,
      })
    );
  }

  return pdfExportLoader;
}
