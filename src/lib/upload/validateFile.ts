const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MAGIC_BYTES: Record<string, string> = {
  "application/pdf": "25504446",
  "image/png": "89504e47",
  "image/jpeg": "ffd8ff",
  "image/webp": "52494646",
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MIN_FILE_SIZE_BYTES = 1024;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  hash?: string;
  detectedMimeType?: string;
}

export interface FileValidationOptions {
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
  minSizeBytes?: number;
}

export async function validateUploadedFile(
  file: File,
  options: FileValidationOptions = {},
): Promise<FileValidationResult> {
  const allowedMimeTypes = new Set(options.allowedMimeTypes ?? Array.from(ALLOWED_MIME_TYPES));
  const maxSizeBytes = options.maxSizeBytes ?? MAX_FILE_SIZE_BYTES;
  const minSizeBytes = options.minSizeBytes ?? MIN_FILE_SIZE_BYTES;

  if (file.size < minSizeBytes) {
    return { valid: false, error: "Arquivo muito pequeno ou corrompido." };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho maximo: ${maxSizeBytes / 1024 / 1024} MB.`,
    };
  }

  if (!allowedMimeTypes.has(file.type)) {
    return {
      valid: false,
      error: `Formato nao permitido: ${file.type || "desconhecido"}.`,
    };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 8));
  const hex = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");

  const expectedMagic = MAGIC_BYTES[file.type];
  if (expectedMagic && !hex.startsWith(expectedMagic)) {
    if (file.type === "image/webp") {
      const extendedBytes = new Uint8Array(buffer.slice(0, 12));
      const extHex = Array.from(extendedBytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const webpMarker = "57454250";
      if (!extHex.includes(webpMarker)) {
        return { valid: false, error: "Arquivo WEBP invalido ou corrompido." };
      }
    } else {
      return {
        valid: false,
        error: "O conteudo do arquivo nao corresponde ao formato declarado.",
      };
    }
  }

  const sanitizedName = sanitizeFileName(file.name);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");

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
  const safeExtensions = new Set(["pdf", "png", "jpg", "jpeg", "webp"]);

  if (!safeExtensions.has(ext)) {
    return `arquivo_${Date.now()}.bin`;
  }

  return clean || `arquivo_${Date.now()}.${ext}`;
}

export function generateStoragePath(userId: string, mimeType: string): string {
  const ext = mimeType === "application/pdf"
    ? "pdf"
    : mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
        ? "webp"
        : "jpg";

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

  return `${userId}/${year}/${month}/${uuid}.${ext}`;
}
