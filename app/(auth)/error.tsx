"use client";

import Link from "next/link";
import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Errore nelle pagine di accesso (login, registrazione, recupero password,
 * accettazione condizioni…).
 *
 * Il gruppo non ha un layout proprio: questa pagina sta direttamente sotto il
 * layout radice, quindi porta il suo <main>. Nessun dettaglio tecnico: chi la
 * vede spesso non è ancora entrato. Solo il `digest`, per i log.
 */
export default function AuthGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("auth error boundary", error);
  }, [error]);

  return (
    <main
      id="contenuto"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground"
    >
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="accent-label">errore</p>
        <h1 className="font-display text-2xl tracking-tight">Qualcosa è andato storto</h1>
        <p className="text-sm text-muted-foreground">
          Non siamo riusciti a completare l&rsquo;operazione. Riprova fra qualche istante.
        </p>
        {error.digest && (
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            codice: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            Riprova
          </button>
          <Link
            href="/login"
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            Vai all&rsquo;accesso
          </Link>
          <Link
            href="/"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Torna al sito
          </Link>
        </div>
      </div>
    </main>
  );
}
