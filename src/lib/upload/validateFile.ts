// lib/upload/validateFile.ts
// Validação de arquivos em múltiplas camadas — nunca confie apenas no Content-Type

// ── Configurações ─────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

// Magic bytes (assinatura binária real do arquivo)
const MAGIC_BYTES: Record<string, string> = {
  "application/pdf": "25504446",        // %PDF
  "image/png":       "89504e47",        // .PNG
  "image/jpeg":      "ffd8ff",          // JFIF/EXIF
  "image/webp":      "52494646",        // RIFF (WebP usa RIFF....WEBP)
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MIN_FILE_SIZE_BYTES = 1024;             // 1 KB (rejeita arquivos vazios/corrompidos)

// ── Tipos ─────────────────────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  hash?: string;
  detectedMimeType?: string;
}

// ── Funções principais ────────────────────────────────────────────────────

export async function validateUploadedFile(file: File): Promise<FileValidationResult> {
  // ── Camada 1: Tamanho ─────────────────────────────────────────────────
  if (file.size < MIN_FILE_SIZE_BYTES) {
    return { valid: false, error: "Arquivo muito pequeno ou corrompido." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
    };
  }

  // ── Camada 2: MIME type declarado ────────────────────────────────────
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Formato não permitido: ${file.type}. Use PDF, PNG, JPEG ou WEBP.`,
    };
  }

  // ── Camada 3: Magic bytes (leitura dos primeiros bytes do binário) ────
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 8));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");

  const expectedMagic = MAGIC_BYTES[file.type];
  if (expectedMagic && !hex.startsWith(expectedMagic)) {
    if (file.type === "image/webp") {
      const extendedBytes = new Uint8Array(buffer.slice(0, 12));
      const extHex = Array.from(extendedBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      const webpMarker = "57454250"; // "WEBP" em hex
      if (!extHex.includes(webpMarker)) {
        return { valid: false, error: "Arquivo WEBP inválido ou corrompido." };
      }
    } else {
      return {
        valid: false,
        error: "O conteúdo do arquivo não corresponde ao formato declarado.",
      };
    }
  }

  // ── Camada 4: Sanitização do nome ────────────────────────────────────
  const sanitizedName = sanitizeFileName(file.name);

  // ── Camada 5: Hash SHA-256 para rastreabilidade ──────────────────────
  // Usa o ambiente global (compatível com Next.js Edge e Vercel)
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    valid: true,
    sanitizedName,
    hash,
    detectedMimeType: file.type,
  };
}

export function sanitizeFileName(originalName: string): string {
  const noPath = originalName.replace(/[/\\]/g, "");

  const clean = noPath
    .replace(/[^a-zA-Z0-9._\-\u00C0-\u024F]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[._]+/, "")
    .slice(0, 200);

  const ext = clean.split(".").pop()?.toLowerCase() ?? "";
  const SAFE_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp"]);

  if (!SAFE_EXTENSIONS.has(ext)) {
    return `arquivo_${Date.now()}.bin`;
  }

  return clean || `arquivo_${Date.now()}.${ext}`;
}

export function generateStoragePath(userId: string, mimeType: string): string {
  const ext = mimeType === "application/pdf" ? "pdf"
    : mimeType === "image/png"  ? "png"
    : mimeType === "image/webp" ? "webp"
    : "jpg";

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  return `${userId}/${year}/${month}/${uuid}.${ext}`;
}