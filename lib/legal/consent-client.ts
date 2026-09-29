"use client";

import { useEffect, useState } from "react";

/**
 * Lo stato del consenso ai cookie, dal lato del browser.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERCHÉ SI LEGGE E NON SI ASCOLTA.
 *
 * iubenda offre una callback — `onPreferenceExpressed` — ma va dichiarata dentro
 * `_iub.csConfiguration` **prima** che lo script parta. Con il widget quella
 * configurazione arriva dal pannello, e sovrascriverla per infilarci una callback
 * significherebbe rischiare di perdere tutte le impostazioni del banner: il
 * pulsante di rifiuto, il consenso per finalità, il ritiro esplicito. Un
 * meccanismo di comodo che mette a rischio le impostazioni che hanno valore
 * legale non è un buon affare.
 *
 * Si legge quindi l'API pubblica, `_iub.cs.api.getPreferences()`, che restituisce
 * le finalità concesse. Non è elegante ma non può rompere nulla, e ha un
 * vantaggio non ovvio: funziona anche alla **seconda visita**, quando l'utente si
 * è già espresso in passato e nessuna callback scatterebbe più.
 *
 * UN SOLO OSSERVATORE PER TUTTA LA PAGINA. La lettura sta in un modulo, non
 * nell'hook: su un profilo con tre video ci sarebbero altrimenti quattro
 * intervalli a fare lo stesso lavoro. I componenti si iscrivono e ricevono lo
 * stato quando cambia.
 * ────────────────────────────────────────────────────────────────────────────
 */

export type TrackingConsent = {
  /** L'utente si è espresso: prima di questo momento non si carica niente. */
  ready: boolean;
  /** Finalità 4 di iubenda — misurazione. Copre Google Analytics. */
  measurement: boolean;
  /** Finalità 5 — targeting e pubblicità. Copre il pixel di Meta. */
  advertising: boolean;
};

export const CONSENSO_ASSENTE: TrackingConsent = {
  ready: false,
  measurement: false,
  advertising: false,
};

declare global {
  interface Window {
    _iub?: {
      cs?: {
        api?: {
          getPreferences?: () => { purposes?: Record<string, boolean> } | null;
          openPreferences?: () => void;
        };
      };
    };
  }
}

/** Ogni quanto si rilegge, prima e dopo che l'utente si sia espresso. */
const ATTESA_INIZIALE_MS = 400;
const CONTROLLO_MS = 2000;

let stato: TrackingConsent = CONSENSO_ASSENTE;
let iscritti: Array<(s: TrackingConsent) => void> = [];
let osservatoreAvviato = false;

function leggi(): TrackingConsent {
  const pref = window._iub?.cs?.api?.getPreferences?.();
  if (!pref) return CONSENSO_ASSENTE;
  const p = pref.purposes ?? {};
  return {
    ready: true,
    measurement: p["4"] === true,
    advertising: p["5"] === true,
  };
}

function uguali(a: TrackingConsent, b: TrackingConsent): boolean {
  return (
    a.ready === b.ready &&
    a.measurement === b.measurement &&
    a.advertising === b.advertising
  );
}

function avviaOsservatore(): void {
  if (osservatoreAvviato || typeof window === "undefined") return;
  osservatoreAvviato = true;

  const controlla = () => {
    const nuovo = leggi();
    if (uguali(nuovo, stato)) return;

    const prima = stato;
    stato = nuovo;
    for (const f of iscritti) f(nuovo);

    // RITIRO DEL CONSENSO. Smontare un tag non toglie dalla pagina le funzioni
    // che ha già definito, né i cookie che ha già scritto: l'unico modo onesto
    // di dare seguito a un ritiro è ricaricare. Succede solo dopo un gesto
    // esplicito dell'utente, quindi il ricaricamento è atteso.
    if (
      (prima.measurement && !nuovo.measurement) ||
      (prima.advertising && !nuovo.advertising)
    ) {
      window.location.reload();
    }
  };

  // Ritmo serrato finché l'API non c'è — lo script arriva dopo l'idratazione —
  // e poi rado, solo per accorgersi di un cambio di preferenze.
  let atteso = 0;
  const veloce = window.setInterval(() => {
    controlla();
    atteso += ATTESA_INIZIALE_MS;
    // Dopo trenta secondi si smette di insistere: se l'API non è comparsa, o
    // iubenda non è configurato o un'estensione l'ha bloccato. In entrambi i
    // casi si resta senza consenso, che è il comportamento corretto.
    if (stato.ready || atteso > 30_000) {
      window.clearInterval(veloce);
      if (stato.ready) window.setInterval(controlla, CONTROLLO_MS);
    }
  }, ATTESA_INIZIALE_MS);

  controlla();
}

export function useTrackingConsent(): TrackingConsent {
  const [locale, setLocale] = useState<TrackingConsent>(stato);

  useEffect(() => {
    avviaOsservatore();
    // Lo stato può essere già cambiato fra il primo rendering e questo effetto.
    setLocale(stato);

    const f = (s: TrackingConsent) => setLocale(s);
    iscritti.push(f);
    return () => {
      iscritti = iscritti.filter((x) => x !== f);
    };
  }, []);

  return locale;
}
