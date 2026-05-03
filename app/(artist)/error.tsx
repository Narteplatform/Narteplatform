"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ArtistGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-red-200 bg-red-50/40 p-8 text-foreground">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-6 shrink-0 text-red-600" />
          <div className="space-y-2">
            <h1 className="font-display text-xl tracking-tight">
              Errore nella dashboard artista
            </h1>
            <p className="text-sm text-muted-foreground">
              Il rendering del layout o di una pagina è fallito. Sotto i dettagli tecnici:
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-4 text-xs">
          <p className="mb-1 font-mono text-red-700">
            <strong>{error.name}:</strong> {error.message}
          </p>
          {error.digest && (
            <p className="mb-1 font-mono text-muted-foreground">digest: {error.digest}</p>
          )}
          {error.stack && (
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-snug text-muted-foreground">
              {error.stack.split("\n").slice(0, 12).join("\n")}
            </pre>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-sm text-background hover:bg-foreground/90"
          >
            <RefreshCw className="size-4" /> Riprova
          </button>
          <Link
            href="/__health"
            className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm hover:bg-muted"
          >
            Apri diagnostica
          </Link>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm hover:bg-muted"
          >
            Torna al sito
          </Link>
        </div>
      </div>
    </div>
  );
}
