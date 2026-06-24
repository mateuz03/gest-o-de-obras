import { Component, type ErrorInfo, type ReactNode } from "react";

import { reportClientError } from "@/lib/monitoring";

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  state: GlobalErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportClientError({
      source: "react.error-boundary",
      severity: "critical",
      message: error.message || "React render failure",
      metadata: {
        name: error.name,
        stack: error.stack ?? null,
        componentStack: info.componentStack,
      },
    });
  }

  handleReload = () => {
    window.location.assign("/inicio");
  };

  handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-700">
            !
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-slate-900">Algo saiu do trilho</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Registramos a falha para investigacao e preparamos uma rota segura para voce continuar usando o app.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Ir para o inicio logado
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Abrir landing page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
