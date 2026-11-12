"use client";

import { useEffect } from "react";

/**
 * Segnala l'apertura reale di un link d'invito (vedi /api/inviti/visita).
 * Stesse condizioni di ProfileViewBeacon: JavaScript eseguito, scheda in primo
 * piano, 2 secondi di permanenza. Non rende niente.
 */

const DWELL_MS = 2_000;
const inviati = new Set<string>();

export function BeaconInvito({ codice }: { codice: string }) {
  useEffect(() => {
    if (!codice || inviati.has(codice)) return;

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      if (inviati.has(codice)) return;
      inviati.add(codice);
      void fetch("/api/inviti/visita", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codice }),
        keepalive: true,
      }).catch(() => {});
    }, DWELL_MS);

    return () => window.clearTimeout(timer);
  }, [codice]);

  return null;
}
