"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ArtistiErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[artisti error boundary]", error);
  }, [error]);

  return (
    <main className="container-narte flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="accent-label mb-3">errore</p>
      <h1 className="font-display text-3xl uppercase md:text-5xl">
        Qualcosa è andato storto
      </h1>
      <p className="mt-4 max-w-lg text-sm text-muted-foreground">
        Stiamo già indagando. Puoi riprovare oppure tornare alla lista artisti.
      </p>
      {error?.digest && (
        <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          digest: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:border-accent hover:text-accent"
        >
          Riprova
        </button>
        <Link
          href="/artisti"
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          Torna agli artisti
        </Link>
      </div>
    </main>
  );
}
