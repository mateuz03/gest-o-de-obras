import { HttpError } from "./security.ts";

const MAGIC_PREFIXES: Record<string, string> = {
  "application/pdf": "25504446",
  "image/png": "89504e47",
  "image/jpeg": "ffd8ff",
  "image/jpg": "ffd8ff",
  "image/webp": "52494646",
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function assertMagicBytes(mimeType: string, bytes: Uint8Array) {
  const prefix = MAGIC_PREFIXES[mimeType];
  if (!prefix) return;

  const headerHex = bytesToHex(bytes.slice(0, 12));
  if (mimeType === "image/webp") {
    if (!headerHex.startsWith(prefix) || !headerHex.includes("57454250")) {
      throw new HttpError(400, "Arquivo WEBP invalido.", "INVALID_FILE_SIGNATURE");
    }
    return;
  }

  if (!headerHex.startsWith(prefix)) {
    throw new HttpError(400, "O conteudo do arquivo nao corresponde ao formato declarado.", "INVALID_FILE_SIGNATURE");
  }
}

export function validateBinaryUpload({
  allowedMimeTypes,
  bytes,
  fileName,
  maxBytes,
  mimeType,
  minBytes = 1024,
}: {
  allowedMimeTypes: string[];
  bytes: Uint8Array;
  fileName?: string | null;
  maxBytes: number;
  mimeType: string;
  minBytes?: number;
}) {
  const normalizedMime = String(mimeType || "").toLowerCase();

  if (!allowedMimeTypes.includes(normalizedMime)) {
    throw new HttpError(400, `Tipo de arquivo nao suportado: ${normalizedMime || "desconhecido"}.`, "INVALID_FILE_TYPE");
  }

  if (bytes.byteLength < minBytes) {
    throw new HttpError(400, "Arquivo muito pequeno ou corrompido.", "INVALID_FILE_SIZE");
  }

  if (bytes.byteLength > maxBytes) {
    throw new HttpError(400, "Arquivo acima do limite permitido.", "INVALID_FILE_SIZE");
  }

  if (fileName && String(fileName).trim().length > 255) {
    throw new HttpError(400, "Nome do arquivo invalido.", "INVALID_FILE_NAME");
  }

  assertMagicBytes(normalizedMime, bytes);
}

export function parseDataUrlImage(dataUrl: string, maxBytes: number) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ""));
  if (!match) {
    throw new HttpError(400, "Formato de imagem invalido.", "INVALID_IMAGE");
  }

  const mimeType = match[1].toLowerCase();
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  validateBinaryUpload({
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
    bytes,
    maxBytes,
    mimeType,
    minBytes: 512,
  });

  const extension = mimeType === "image/png"
    ? "png"
    : mimeType === "image/webp"
      ? "webp"
      : "jpg";

  return {
    bytes,
    extension,
    mimeType,
  };
}
