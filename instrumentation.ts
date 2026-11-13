import type { Instrumentation } from "next";
import { logger } from "@/lib/logger";

/**
 * Strumentazione di Next.js: registro strutturato degli errori lato server.
 *
 * PERCHÉ. Un errore in una pagina, in una Server Action o in una rotta API
 * finiva nei log di Vercel come uno stack trace sciolto, senza dire su quale
 * rotta né di che tipo fosse. Qui ogni errore di richiesta diventa UNA riga
 * JSON con il prefisso `[errore-richiesta]`, filtrabile nei log:
 *
 *   { route, path, metodo, tipo, router, sorgente, digest, nome, messaggio }
 *
 * `digest` è lo stesso codice che l'utente vede nella pagina di errore
 * (app/global-error.tsx): chi segnala un problema può citarlo e lo si ritrova qui.
 *
 * DATI PERSONALI. Non si registrano header, cookie, query string né corpo
 * della richiesta. Per le rotte con segmenti dinamici (es. /api/calendario/[token],
 * /invito/[codice], /artisti/[slug]) si registra solo lo schema della rotta,
 * non il percorso reale, che può contenere token o identificativi. Gli
 * indirizzi email eventualmente presenti nel messaggio d'errore vengono mascherati.
 *
 * SENTRY (facoltativo, oggi NON attivo). Per agganciarlo:
 *   1. `npm i @sentry/nextjs` e configurazione (sentry.server.config.ts);
 *   2. impostare `SENTRY_DSN` su Vercel;
 *   3. qui sotto, in `onRequestError`, aggiungere:
 *        if (process.env.SENTRY_DSN) {
 *          const Sentry = await import("@sentry/nextjs");
 *          Sentry.captureRequestError(error, request, context);
 *        }
 *      e in `register()` l'import della configurazione per runtime.
 * Finché la dipendenza non è installata quell'import non va scritto: il
 * bundler lo risolverebbe e la build fallirebbe.
 */

export function register(): void {
  // Punto di aggancio per Sentry/OpenTelemetry (vedi sopra). Oggi nulla.
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function percorsoSicuro(path: string, routePath: string): string | undefined {
  // Rotta dinamica: il percorso reale può contenere token o id → non si registra.
  if (routePath.includes("[")) return undefined;
  return path.split("?")[0];
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  try {
    const e = error instanceof Error ? (error as Error & { digest?: string }) : null;
    const riga = {
      route: context.routePath,
      path: percorsoSicuro(request.path, context.routePath),
      metodo: request.method,
      tipo: context.routeType,
      router: context.routerKind,
      sorgente: context.renderSource,
      revalidate: context.revalidateReason,
      digest: e?.digest,
      nome: e?.name,
      messaggio: (e?.message ?? String(error)).replace(EMAIL_RE, "***@***").slice(0, 500),
    };
    logger.error("errore-richiesta", JSON.stringify(riga));
  } catch {
    // Il registro degli errori non deve mai generarne uno a sua volta.
  }
};
