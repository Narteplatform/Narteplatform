"use client";

import Link from "next/link";
import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Errore di una pagina del sito pubblico.
 *
 * Sta DENTRO il layout pubblico: header e footer restano, e chi arriva qui può
 * comunque navigare altrove. Al pubblico non si mostrano messaggio né stack
 * (in produzione Next li oscura comunque per gli errori del server): solo il
 * `digest`, che permette di ritrovare l'errore nei log di Vercel.
 */
export default function PublicGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("public error boundary", error);
  }, [error]);

  return (
    <section className="container-narte flex min-h-[60vh] flex-col items-center justify-center py-28 text-center">
      <p className="accent-label mb-3">errore</p>
      <h1 className="font-display text-3xl tracking-tight md:text-5xl">
        Qualcosa è andato storto
      </h1>
      <p className="mt-4 max-w-lg text-sm text-muted-foreground">
        La pagina non si è caricata correttamente. Riprova fra qualche istante oppure
        torna alla home.
      </p>
      {error?.digest && (
        <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          codice: {error.digest}
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
          href="/"
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          Torna alla home
        </Link>
      </div>
    </section>
  );
}
