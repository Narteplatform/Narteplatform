"use client";

import { useEffect, useState } from "react";

/**
 * Riapre il pannello delle preferenze cookie.
 *
 * Non è un ornamento: il consenso deve poter essere ritirato con la stessa
 * facilità con cui è stato dato, e un banner che compare una volta e poi
 * scompare per dodici mesi non lo consente. iubenda mette a disposizione anche
 * un pulsante fisso in un angolo dello schermo, ma è facile da non vedere e più
 * facile ancora da confondere con una decorazione: un collegamento nella barra
 * legale del piè di pagina è il posto dove la gente lo cerca, accanto a privacy
 * e cookie policy.
 *
 * PERCHÉ UN <button> E NON UN <a>. Non porta da nessuna parte: apre un pannello
 * nella pagina corrente. Un collegamento che non è un collegamento rompe il
 * clic centrale, il «apri in nuova scheda» e l'annuncio dei lettori di schermo.
 *
 * SI DISEGNA DA SOLO SOLO SE SERVE. Finché lo script di iubenda non è caricato
 * non c'è alcun pannello da aprire, e un comando che non fa niente è peggio di
 * un comando assente. Il controllo è ritardato di proposito: lo script arriva
 * dopo l'idratazione, quindi al primo rendering non c'è ancora.
 */
export function CookiePreferencesLink({ className }: { className?: string }) {
  const [disponibile, setDisponibile] = useState(false);

  useEffect(() => {
    let vivo = true;
    const controlla = () => {
      if (!vivo) return;
      if (typeof window._iub?.cs?.api?.openPreferences === "function") {
        setDisponibile(true);
        return;
      }
      // Lo script può tardare, o non arrivare mai se un'estensione lo blocca.
      // Si riprova per qualche secondo e poi si smette: il collegamento
      // semplicemente non compare.
      tentativi += 1;
      if (tentativi < 20) setTimeout(controlla, 500);
    };
    let tentativi = 0;
    controlla();
    return () => {
      vivo = false;
    };
  }, []);

  if (!disponibile) return null;

  // Emette anche il separatore, e li avvolge entrambi in <li>: dentro una <ul>
  // gli unici figli ammessi sono elementi di lista, e un separatore lasciato
  // fuori resterebbe un punto orfano nelle righe in cui il collegamento non
  // compare.
  return (
    <>
      <li aria-hidden="true">·</li>
      <li>
        <button
          type="button"
          onClick={() => window._iub?.cs?.api?.openPreferences?.()}
          className={className}
        >
          Preferenze cookie
        </button>
      </li>
    </>
  );
}
