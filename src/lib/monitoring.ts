import { supabase } from "@/integrations/supabase/client";

type ErrorSeverity = "info" | "warning" | "error" | "critical";

interface ClientErrorReportInput {
  source: string;
  message: string;
  severity?: ErrorSeverity;
  metadata?: Record<string, unknown>;
}

const REPORT_DEDUPE_MS = 30_000;
const recentReports = new Map<string, number>();

function toSerializableValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > 4) return "[truncated]";
  if (typeof value === "string") return value.slice(0, 4000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => toSerializableValue(item, depth + 1));
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message.slice(0, 1000),
      stack: value.stack?.slice(0, 4000) ?? null,
    };
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 20)
        .map(([key, item]) => [key, toSerializableValue(item, depth + 1)]),
    );
  }

  return String(value).slice(0, 1000);
}

function shouldReport(fingerprint: string) {
  const now = Date.now();
  const lastSent = recentReports.get(fingerprint);

  for (const [key, timestamp] of recentReports.entries()) {
    if (now - timestamp > REPORT_DEDUPE_MS) {
      recentReports.delete(key);
    }
  }

  if (lastSent && now - lastSent < REPORT_DEDUPE_MS) {
    return false;
  }

  recentReports.set(fingerprint, now);
  return true;
}

export async function reportClientError(input: ClientErrorReportInput) {
  if (!import.meta.env.PROD) return;

  const message = String(input.message || "").trim().slice(0, 300);
  if (!message) return;

  const route = typeof window !== "undefined" ? window.location.pathname : "/";
  const fingerprint = `${input.source}:${route}:${message}`;
  if (!shouldReport(fingerprint)) return;

  const metadata = toSerializableValue({
    route,
    href: typeof window !== "undefined" ? window.location.href : null,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    ...input.metadata,
  });

  try {
    await supabase.functions.invoke("report-app-error", {
      body: {
        source: input.source,
        severity: input.severity ?? "error",
        message,
        metadata,
      },
    });
  } catch (error) {
    console.warn("[client-monitoring-failed]", error);
  }
}
