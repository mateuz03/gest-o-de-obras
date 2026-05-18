export interface RenderedPdfPage {
  page_number: number;
  content_type: string;
  bytes: Uint8Array;
}

export interface RenderPdfOptions {
  scale?: number;
  format?: "png" | "jpeg";
}

function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

export async function renderPdfToImages(
  fileBytes: Uint8Array,
  options: RenderPdfOptions = {},
): Promise<RenderedPdfPage[]> {
  const format = options.format || "png";
  const scale = options.scale || 2;

  if (format !== "png") {
    console.warn("renderPdfToImages: somente PNG suportado nesta versão inicial");
  }

  try {
    const { Buffer } = await import("node:buffer");
    const { pdfToPng } = await import("npm:pdf-to-png-converter");

    const pngPages = await pdfToPng(Buffer.from(fileBytes), {
      disableFontFace: false,
      useSystemFonts: true,
      viewportScale: scale,
      outputFolder: undefined,
      outputFileMaskFunc: (pageNumber: number) => `page-${pageNumber}`,
      pdfFilePassword: undefined,
      pagesToProcess: undefined,
      strictPagesToProcess: false,
      verbosityLevel: 0,
    });

    const rendered: RenderedPdfPage[] = [];

    for (let i = 0; i < pngPages.length; i++) {
      const page = pngPages[i];
      let bytes: Uint8Array | null = null;

      if (page?.content instanceof Uint8Array) {
        bytes = page.content;
      } else if (page?.content instanceof ArrayBuffer) {
        bytes = arrayBufferToUint8Array(page.content);
      } else if (page?.buffer instanceof Uint8Array) {
        bytes = page.buffer;
      } else if (page?.buffer instanceof ArrayBuffer) {
        bytes = arrayBufferToUint8Array(page.buffer);
      } else if (page?.pageContent instanceof Uint8Array) {
        bytes = page.pageContent;
      } else if (page?.pageContent instanceof ArrayBuffer) {
        bytes = arrayBufferToUint8Array(page.pageContent);
      }

      if (!bytes || bytes.byteLength === 0) {
        console.warn(`renderPdfToImages: página ${i + 1} sem bytes renderizados`);
        continue;
      }

      rendered.push({
        page_number: i + 1,
        content_type: "image/png",
        bytes,
      });
    }

    return rendered;
  } catch (error) {
    console.error("renderPdfToImages failed:", error);
    return [];
  }
}