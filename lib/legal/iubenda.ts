/**
 * Configurazione di iubenda, in un modulo a sé.
 *
 * Sta qui e non dentro `components/legal/IubendaCs.tsx` perché questi valori
 * servono anche a componenti client — il player video, per sapere se c'è un
 * consenso da rispettare. Importarli dal file del componente trascinerebbe
 * quel modulo intero nel pacchetto del browser: un modulo che esiste per
 * iniettare script nel documento e non ha alcuna ragione di finire lì.
 *
 * Sono variabili `NEXT_PUBLIC_`: vengono sostituite col loro valore al momento
 * del build. Cambiarle su Vercel senza ridistribuire non ha alcun effetto.
 */

export const IUBENDA_SITE_ID = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID ?? "";

/**
 * L'identificativo pubblico del documento iubenda.
 *
 * È UNO SOLO per entrambi i documenti: su iubenda la cookie policy non è un
 * documento separato ma una sezione dell'informativa, e si raggiunge
 * aggiungendo `/cookie-policy` allo stesso indirizzo. Il nome della variabile
 * dice "cookie policy" perché è così che iubenda la chiama nel codice di
 * installazione della Cookie Solution, dove la si trova.
 */
export const IUBENDA_POLICY_ID =
  process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID ?? "";

/**
 * Vero quando la gestione del consenso è configurata.
 *
 * Da questo dipendono tre cose: il banner provvisorio si spegne, il player
 * video comincia a chiedere il consenso, e — indirettamente — il tracciamento
 * diventa accendibile, perché passa dalle callback di iubenda.
 */
export const iubendaAttivo = Boolean(IUBENDA_SITE_ID && IUBENDA_POLICY_ID);

/** I documenti che iubenda genera. I Termini restano nostri: vedi sotto. */
export type DocumentoIubenda = "privacy" | "cookie-policy";

/**
 * L'indirizzo del documento su iubenda.
 *
 * Si ricava dall'identificativo, così non serve incollare a mano due URL che
 * sarebbero comunque derivabili — un segnaposto in meno da sbagliare. Le
 * variabili `NEXT_PUBLIC_IUBENDA_*_URL` restano accettate e hanno la
 * precedenza, per il caso di un indirizzo personalizzato o di un documento
 * ospitato altrove.
 *
 * Stringa vuota se iubenda non è configurato: chi chiama mostra le bozze locali.
 */
export function iubendaDocUrl(doc: DocumentoIubenda): string {
  const esplicito =
    doc === "privacy"
      ? process.env.NEXT_PUBLIC_IUBENDA_PRIVACY_URL
      : process.env.NEXT_PUBLIC_IUBENDA_COOKIE_URL;
  if (esplicito) return esplicito;

  if (!IUBENDA_POLICY_ID) return "";
  const base = `https://www.iubenda.com/privacy-policy/${IUBENDA_POLICY_ID}`;
  return doc === "privacy" ? base : `${base}/cookie-policy`;
}

/**
 * I TERMINI NON SONO SU IUBENDA, ED È UNA SCELTA OBBLIGATA.
 *
 * Il generatore di termini e condizioni parte dal piano Advanced (19,99 €/mese
 * contro i 4,99 di Essentials). Ma soprattutto: le tre parti che contano per
 * N'arte — riparto degli adempimenti dell'evento sull'organizzatore, licenza
 * sui contenuti dell'artista con garanzia dei diritti, poteri di moderazione e
 * procedura di segnalazione — nessun generatore le produce, e andrebbero
 * comunque inserite a mano come testo personalizzato. Tenerle nel codice, dove
 * sono versionate insieme al resto e leggibili in una revisione, costa meno e
 * rende di più.
 *
 * Perciò `/termini` mostra sempre il documento locale, anche a iubenda attivo.
 */
export const TERMINI_SONO_LOCALI = true;
