"use client";

import { useEffect, useState } from "react";

/**
 * Lo stato del consenso ai cookie, dal lato del browser.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERCHÉ SERVE UN PONTE E NON BASTA UN `useEffect`
 *
 * iubenda comunica la scelta dell'utente con una callback che chiama appena ha
 * letto il proprio cookie — cioè PRIMA che React abbia montato alcunché. Su
 * ogni visita di ritorno, dove il consenso è già stato dato in passato, quella
 * chiamata arriva e passa. Un componente che registrasse la callback dentro un
 * `useEffect` la troverebbe già avvenuta e non saprebbe mai che il consenso
 * c'è: il tracciamento non partirebbe più, per nessuno, dalla seconda visita in
 * poi. È un difetto che in sviluppo non si vede, perché si prova sempre con il
 * banner appena comparso.
 *
 * La soluzione: la callback la possiede lo script iniettato in testa alla
 * pagina, che scrive l'ultimo stato su `window.__narteConsent` e lo riannuncia
 * con un evento. Chi arriva dopo legge la variabile, chi era già montato
 * ascolta l'evento. Nessuno dei due può perdere la notizia.
 * ────────────────────────────────────────────────────────────────────────────
 */
export type TrackingConsent = {
  /** L'utente si è espresso (o iubenda ha stabilito che non serve chiederglielo). */
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

/** Nome dell'evento con cui lo script in testa annuncia i cambiamenti. */
export const CONSENT_EVENT = "narte:consent";

declare global {
  interface Window {
    __narteConsent?: TrackingConsent;
    /**
     * L'oggetto di iubenda. Tipizzato al minimo indispensabile: serve solo
     * `openPreferences()`, per riaprire il pannello delle scelte da un
     * contenuto bloccato. Il resto della sua superficie non ci riguarda e
     * descriverla per intero significherebbe doverla mantenere.
     */
    _iub?: {
      cs?: { api?: { openPreferences?: () => void } };
    };
  }
}

export function useTrackingConsent(): TrackingConsent {
  const [stato, setStato] = useState<TrackingConsent>(() =>
    typeof window !== "undefined" && window.__narteConsent
      ? window.__narteConsent
      : CONSENSO_ASSENTE
  );

  useEffect(() => {
    // Seconda lettura, non ridondante: fra il calcolo dello stato iniziale e
    // l'esecuzione di questo effetto la callback può essere scattata. Senza,
    // quella finestra basta a perdere il consenso.
    if (window.__narteConsent) setStato(window.__narteConsent);

    const ascolta = (e: Event) => {
      const dettaglio = (e as CustomEvent<TrackingConsent>).detail;
      if (dettaglio) setStato(dettaglio);
    };
    window.addEventListener(CONSENT_EVENT, ascolta);
    return () => window.removeEventListener(CONSENT_EVENT, ascolta);
  }, []);

  return stato;
}
