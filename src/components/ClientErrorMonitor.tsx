import { useEffect } from "react";

import { reportClientError } from "@/lib/monitoring";

export function ClientErrorMonitor() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const onError = (event: ErrorEvent) => {
      void reportClientError({
        source: "window.error",
        severity: "error",
        message: event.message || "Unhandled browser error",
        metadata: {
          filename: event.filename || null,
          lineno: event.lineno || null,
          colno: event.colno || null,
          stack: event.error instanceof Error ? event.error.stack ?? null : null,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";

      void reportClientError({
        source: "window.unhandledrejection",
        severity: "warning",
        message,
        metadata: {
          reason,
        },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
