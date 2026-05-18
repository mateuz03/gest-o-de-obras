export interface OcrResult {
  fullText: string;
  provider: string;
  raw?: unknown;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export async function runGoogleVisionOcr(imageBytes: Uint8Array): Promise<OcrResult> {
  const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY is not configured");
  }

  const base64Image = bytesToBase64(imageBytes);

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION",
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Vision OCR failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const result = data?.responses?.[0];

  const fullText =
    result?.fullTextAnnotation?.text ||
    result?.textAnnotations?.[0]?.description ||
    "";

  return {
    fullText,
    provider: "google_vision",
    raw: result,
  };
}