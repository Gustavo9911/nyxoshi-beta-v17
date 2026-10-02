import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "Algo inesperado aconteceu. Recarregue a página.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <div className="nyx-loading-mark mx-auto mb-1" aria-hidden="true">☾</div>
      <span className="text-destructive" aria-hidden="true">
        <TriangleAlert className="size-7" strokeWidth={2} />
      </span>
      <h1 className="font-display text-xl font-medium">Algo deu errado</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {errorMessage(error)}
      </p>
    </main>
  );
}
