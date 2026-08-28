"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * Banner cookie.
 *
 * È volutamente LEGGERO, e può esserlo perché il sito non ha strumenti di
 * profilazione: niente Google Analytics, niente pixel di Meta, nessun
 * tracciamento pubblicitario. Verificato nel codice, non dato per scontato.
 *
 * Ne consegue che non c'è nulla da bloccare in attesa del consenso: gli unici
 * cookie sono quelli di sessione, tecnicamente necessari, per i quali il
 * consenso non è richiesto. Questo banner quindi INFORMA e prende atto della
 * presa visione — non è un gestore del consenso, e sarebbe disonesto fingere
 * che lo sia mostrando interruttori che non governano nulla.
 *
 * QUANDO ARRIVERÀ IUBENDA: questo componente va rimosso dal layout e
 * sostituito dalla Cookie Solution, che dovrà bloccare davvero gli script di
 * terze parti che a quel punto esisteranno. Il dominio di iubenda va aggiunto
 * alla CSP in `next.config.ts` — l'annotazione è già lì.
 *
 * La scelta resta nel browser di chi naviga e non raggiunge mai i nostri
 * server: non è un dato che ci serva.
 */

const CHIAVE = "narte-cookie-ack-v1";

export function CookieBanner() {
  // Si parte da "nascosto" e si decide dopo il montaggio. Renderizzarlo subito
  // produrrebbe uno sfarfallio a ogni caricamento per chi ha già accettato,
  // perché il server non può sapere cosa c'è nel browser.
  const [visibile, setVisibile] = React.useState(false);

  React.useEffect(() => {
    try {
      if (!window.localStorage.getItem(CHIAVE)) setVisibile(true);
    } catch {
      // Navigazione privata o memoria disattivata: si mostra il banner e basta.
      // Meglio mostrarlo una volta di troppo che non mostrarlo mai.
      setVisibile(true);
    }
  }, []);

  function accetta() {
    try {
      window.localStorage.setItem(CHIAVE, new Date().toISOString());
    } catch {
      // Se non si può salvare, ricomparirà: fastidioso ma innocuo.
    }
    setVisibile(false);
  }

  if (!visibile) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Informativa sui cookie"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(13,27,42,0.15)]"
    >
      <div className="container-narte flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm leading-snug text-muted-foreground">
          Usiamo solo cookie tecnici, necessari a farti restare collegato.{" "}
          <strong className="text-foreground">
            Nessun tracciamento, nessuna profilazione pubblicitaria.
          </strong>{" "}
          <Link
            href="/cookie-policy"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Leggi la cookie policy
          </Link>
          .
        </p>

        <Button onClick={accetta} className="shrink-0 self-start sm:self-auto">
          Ho capito
        </Button>
      </div>
    </div>
  );
}
