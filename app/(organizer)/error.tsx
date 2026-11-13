"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

/**
 * Errore nell'area organizzatore.
 *
 * Stesso impianto di quelli di (admin) e (artist), ma senza stack trace:
 * l'organizzatore è un utente esterno, e i dettagli tecnici non gli servono
 * (né vanno mostrati). Resta il `digest` per ritrovare l'errore nei log.
 */
export default function OrganizerGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("organizer error boundary", error);
  }, [error]);

  return (
    <main id="contenuto" className="min-h-screen bg-background p-6 lg:p-12">
      <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-red-200 bg-red-50/40 p-8 text-foreground">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-6 shrink-0 text-red-600" aria-hidden="true" />
          <div className="space-y-2">
            <h1 className="font-display text-xl tracking-tight">
              Errore nell&rsquo;area organizzatore
            </h1>
            <p className="text-sm text-muted-foreground">
              La pagina non si è caricata correttamente. Riprova; se il problema
              continua, scrivici indicando il codice qui sotto.
            </p>
            {error.digest && (
              <p className="font-mono text-xs text-muted-foreground">codice: {error.digest}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-sm text-background hover:bg-foreground/90"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Riprova
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm hover:bg-muted"
          >
            Ricarica la pagina
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-full border border-border px-4 text-sm hover:bg-muted"
          >
            Torna al sito
          </Link>
        </div>
      </div>
    </main>
  );
}
