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
   * Indirizzo per le questioni sui dati personali.
   *
   * ⚠️ VUOTO DI PROPOSITO, finché non è una casella che funziona davvero. Un
   * indirizzo pubblicato in un'informativa e non presidiato è peggio che
   * assente: fissa un canale per esercitare i diritti e poi non risponde, e il
   * termine di un mese decorre comunque. Finché è vuoto, informativa e termini
   * rimandano alla pagina contatti, che è presidiata.
   *
   * Da valorizzare con qualcosa come `privacy@narteofficial.it` quando la posta
   * sul dominio sarà attiva — la verifica del dominio email è ancora aperta.
   */
  emailPrivacy: "",
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
