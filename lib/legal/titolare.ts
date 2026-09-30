/**
 * I dati del titolare del trattamento, in un punto solo.
 *
 * Servono in quattro posti — piè di pagina, informativa privacy, termini d'uso e
 * registro dei trattamenti — e sono esattamente il tipo di dato che, copiato a
 * mano in quattro file, finisce per divergere: si cambia l'indirizzo in uno e si
 * lascia il vecchio negli altri tre. Un'incoerenza fra l'informativa e il piè di
 * pagina sulla stessa pagina web è il genere di dettaglio che chi cerca un
 * appiglio trova subito.
 *
 * Vanno dichiarati **anche nel pannello iubenda**, perché l'informativa generata
 * da lui porta la propria intestazione: quella non passa da qui.
 */

export const TITOLARE = {
  /** Ditta individuale: il titolare è la persona fisica. */
  denominazione: "Eduardo Castronuovo",
  partitaIva: "IT11071661216",
  indirizzo: "Via Domenico Fontana 27",
  cap: "80128",
  citta: "Napoli",
  paese: "Italia",

  /**
   * Recapito pubblico unico (decisione del 30/09/2026): contatti generali,
   * questioni sui dati personali, segnalazioni DSA e reclami. Uno solo, così
   * sito, informativa, termini ed email non possono più divergere.
   *
   * La casella va attivata e PRESIDIATA sul dominio narteofficial.it: i
   * termini promettono tempi di risposta alle segnalazioni.
   */
  emailContatti: "info@narteofficial.it",

  /** Indirizzo per le questioni sui dati personali: lo stesso recapito unico. */
  emailPrivacy: "info@narteofficial.it",
} as const;

/** Una riga sola, per il piè di pagina. */
export function titolareInLinea(): string {
  const t = TITOLARE;
  return `${t.denominazione} — P.IVA ${t.partitaIva} — ${t.indirizzo}, ${t.cap} ${t.citta}`;
}

/** Il recapito da indicare nei documenti: l'email se c'è, altrimenti la pagina. */
export function recapitoPrivacyHtml(): string {
  return TITOLARE.emailPrivacy
    ? `<a href="mailto:${TITOLARE.emailPrivacy}">${TITOLARE.emailPrivacy}</a>`
    : `<a href="/contatti">pagina contatti</a>`;
}
