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
export const IUBENDA_COOKIE_POLICY_ID =
  process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID ?? "";

/**
 * Vero quando la gestione del consenso è configurata.
 *
 * Da questo dipendono tre cose: il banner provvisorio si spegne, il player
 * video comincia a chiedere il consenso, e — indirettamente — il tracciamento
 * diventa accendibile, perché passa dalle callback di iubenda.
 */
export const iubendaAttivo = Boolean(IUBENDA_SITE_ID && IUBENDA_COOKIE_POLICY_ID);
