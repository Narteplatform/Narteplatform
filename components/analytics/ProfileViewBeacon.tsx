"use client";

import { useEffect } from "react";

/**
 * Segnala una visita reale al profilo di un artista.
 *
 * Non rende niente. Le tre condizioni che rendono il dato credibile:
 *
 *  1. **JavaScript eseguito** — i crawler che non lo eseguono si escludono da
 *     soli, senza bisogno di mantenere una lista di user-agent;
 *  2. **Scheda in primo piano** — una pagina aperta in una scheda di sfondo
 *     (o un prefetch andato a buon fine) non è una visita;
 *  3. **Qualche secondo di permanenza** — chi apre e chiude subito non stava
 *     guardando l'artista.
 *
 * Il `Set` a livello di modulo evita il doppio invio da StrictMode in sviluppo,
 * dai re-render e dal ritorno indietro nella stessa sessione di pagina. La
 * PRIMARY KEY della tabella resta comunque la rete di sicurezza finale.
 */

const DWELL_MS = 2_000;
const sent = new Set<string>();

export function ProfileViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug || sent.has(slug)) return;

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      if (sent.has(slug)) return;
      sent.add(slug);

      // `keepalive` così la richiesta sopravvive a una navigazione immediata.
      // Ogni errore viene inghiottito: la pagina non dipende da questa chiamata.
      void fetch("/api/artists/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug }),
        keepalive: true,
      }).catch(() => {});
    }, DWELL_MS);

    return () => window.clearTimeout(timer);
  }, [slug]);

  return null;
}
