export interface ParsedPdfPage {
  page_number: number;
  embedded_text: string;
  has_embedded_text: boolean;
  metadata_json?: Record<string, unknown>;
}

export interface ParsedDocumentResult {
  kind: "pdf" | "image" | "unknown";
  page_count: number;
  pages: ParsedPdfPage[];
  extracted_text_preview: string;
}

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_DOCUMENT_PAGES = 20;

export function inferDocumentKind(mimeType: string, fileName: string): "pdf" | "image" | "unknown" {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) return "pdf";
  if (
    lowerMime.includes("image/") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp")
  ) {
    return "image";
  }

  return "unknown";
}

export async function downloadStorageFile(
  supabase: any,
  bucket: string,
  storagePath: string,
): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) throw error;

  const arrayBuffer = await data.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("O arquivo excede o limite seguro de processamento.");
  }

  return bytes;
}

export async function parsePdfDocument(fileBytes: Uint8Array): Promise<ParsedDocumentResult> {
  if (fileBytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("O PDF excede o limite seguro de processamento.");
  }

  const mod = await import("npm:pdf-parse@1.1.1");
  const pdfParse = mod.default || mod;
  const result = await pdfParse(fileBytes);
  const fullText = typeof result?.text === "string" ? result.text : "";

  const numpages =
    typeof result?.numpages === "number" && Number.isFinite(result.numpages)
      ? result.numpages
      : 1;

  if (numpages > MAX_DOCUMENT_PAGES) {
    throw new Error(`O PDF possui ${numpages} páginas. O limite seguro é ${MAX_DOCUMENT_PAGES}.`);
  }

  const pages: ParsedPdfPage[] = Array.from({ length: Math.max(1, numpages) }).map((_, index) => ({
    page_number: index + 1,
    embedded_text: index === 0 ? fullText : "",
    has_embedded_text: index === 0 ? fullText.trim().length > 0 : false,
    metadata_json: {
      source: "pdf-parse",
      extracted_page_mode: "document_level_text",
    },
  }));

  return {
    kind: "pdf",
    page_count: pages.length,
    pages,
    extracted_text_preview: fullText.slice(0, 2000),
  };
}

export async function parseImageDocument(): Promise<ParsedDocumentResult> {
  return {
    kind: "image",
    page_count: 1,
    pages: [
      {
        page_number: 1,
        embedded_text: "",
        has_embedded_text: false,
        metadata_json: {
          source: "image",
        },
      },
    ],
    extracted_text_preview: "",
  };
}
