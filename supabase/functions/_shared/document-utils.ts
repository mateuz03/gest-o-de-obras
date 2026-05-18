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
  return new Uint8Array(arrayBuffer);
}

/**
 * Versão inicial:
 * - tenta extrair texto do PDF inteiro
 * - divide em páginas heurísticas quando possível
 *
 * Observação:
 * dependendo da biblioteca escolhida no seu runtime, você pode trocar a implementação
 * mantendo o mesmo contrato de saída.
 */
export async function parsePdfDocument(fileBytes: Uint8Array): Promise<ParsedDocumentResult> {
  let fullText = "";

  try {
    // Biblioteca leve/compatível em muitos cenários Deno/npm.
    // Se ela falhar no seu ambiente, troque por outra, mantendo o contrato.
    const mod = await import("npm:pdf-parse@1.1.1");
    const pdfParse = mod.default || mod;

    const result = await pdfParse(fileBytes);
    fullText = typeof result?.text === "string" ? result.text : "";

    const numpages =
      typeof result?.numpages === "number" && Number.isFinite(result.numpages)
        ? result.numpages
        : 1;

    // Sem extração por página real ainda: criamos páginas placeholder
    // e colocamos o texto inteiro na primeira página para a fase 1.
    const pages: ParsedPdfPage[] = Array.from({ length: Math.max(1, numpages) }).map((_, index) => ({
      page_number: index + 1,
      embedded_text: index === 0 ? fullText : "",
      has_embedded_text: index === 0 ? fullText.trim().length > 0 : false,
      metadata_json: {
        source: "pdf-parse",
        extracted_page_mode: "phase1_document_level_text",
      },
    }));

    return {
      kind: "pdf",
      page_count: pages.length,
      pages,
      extracted_text_preview: fullText.slice(0, 2000),
    };
  } catch (error) {
    console.error("parsePdfDocument failed:", error);

    return {
      kind: "pdf",
      page_count: 1,
      pages: [
        {
          page_number: 1,
          embedded_text: "",
          has_embedded_text: false,
          metadata_json: {
            source: "parse_failed",
          },
        },
      ],
      extracted_text_preview: "",
    };
  }
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