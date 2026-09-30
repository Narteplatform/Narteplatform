/**
 * Dove punta «Come funziona» accanto all'ordine del catalogo.
 *
 * File a parte e senza dipendenze perché lo usano componenti client: importarlo
 * da lib/legal/v2/index.ts porterebbe nel bundle del browser l'intero testo dei
 * documenti legali. Finché le pagine v2 non sono pubblicate, il collegamento
 * va all'articolo del centro assistenza che spiega già badge e visibilità:
 * meglio di un link che porta a una 404.
 */
export function urlCriteriPosizionamento(): string {
  return process.env.NEXT_PUBLIC_LEGAL_V2_PUBBLICATO === "1"
    ? "/criteri-di-posizionamento"
    : "/help/artisti/badge-e-visibilita";
}
