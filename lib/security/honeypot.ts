/**
 * Trappola per i bot che compilano i moduli.
 *
 * Due controlli, entrambi invisibili a chi usa il sito davvero.
 *
 * 1. CAMPO TRAPPOLA — un input nascosto con un nome che un compilatore
 *    automatico non resiste a riempire (`azienda`, non `honeypot`: i bot
 *    moderni riconoscono i nomi ovvi). Una persona non lo vede e lo lascia
 *    vuoto; uno script compila tutto ciò che trova.
 *
 * 2. TEMPO DI COMPILAZIONE — il modulo porta con sé l'istante in cui è stato
 *    aperto. Un essere umano impiega qualche secondo a scrivere; uno script
 *    invia in poche centinaia di millisecondi.
 *
 * PERCHÉ NON UN CAPTCHA: richiederebbe un account esterno, aggiungerebbe uno
 * script di terze parti in ogni pagina e complicherebbe il banner cookie.
 * Questi due controlli fermano la stragrande maggioranza dello spam automatico
 * a costo zero. Se un giorno passasse spam mirato, il posto dove innestare un
 * captcha è esattamente questo.
 *
 * Questo modulo è condiviso fra client e server: nessun import di `server-only`.
 */

/** Nome del campo trappola. Deve sembrare un campo vero. */
export const HONEYPOT_FIELD = "azienda";

/** Nome del campo che porta l'istante di apertura del modulo. */
export const TIMESTAMP_FIELD = "aperto_alle";

/**
 * Tempo minimo di compilazione. Sotto questa soglia si assume un automatismo.
 * Tre secondi sono sotto il tempo di chiunque legga anche solo le etichette,
 * e ben sopra quello di uno script.
 */
const MIN_MS = 3000;

/**
 * Tempo massimo. Oltre, il modulo è rimasto aperto per ore: non è
 * necessariamente un bot, ma il valore non è più affidabile e conviene non
 * usarlo per decidere. Non blocca, si limita a non fidarsi.
 */
const MAX_MS = 1000 * 60 * 60 * 12;

export type HoneypotFields = {
  [HONEYPOT_FIELD]?: unknown;
  [TIMESTAMP_FIELD]?: unknown;
};

export type HoneypotEsito =
  | { ok: true }
  | { ok: false; motivo: "campo-trappola" | "troppo-veloce" };

/**
 * Verifica i due controlli. Da chiamare lato server, all'inizio della action.
 */
export function checkHoneypot(input: HoneypotFields): HoneypotEsito {
  const trappola = input[HONEYPOT_FIELD];
  if (typeof trappola === "string" && trappola.trim() !== "") {
    return { ok: false, motivo: "campo-trappola" };
  }

  const grezzo = input[TIMESTAMP_FIELD];
  const aperto = typeof grezzo === "string" ? Number(grezzo) : Number(grezzo);
  if (Number.isFinite(aperto) && aperto > 0) {
    const trascorso = Date.now() - aperto;
    // Un timestamp nel futuro o troppo vecchio non è un indizio di bot: è un
    // orologio sfasato o una scheda lasciata aperta. Si ignora e basta.
    if (trascorso >= 0 && trascorso < MIN_MS) {
      return { ok: false, motivo: "troppo-veloce" };
    }
    if (trascorso > MAX_MS) return { ok: true };
  }

  return { ok: true };
}

/**
 * Messaggio da restituire a chi viene fermato.
 *
 * Volutamente vago e non accusatorio: se dicesse "hai compilato il campo
 * nascosto" spiegherebbe a chi scrive bot come aggirare la trappola, e
 * accuserebbe una persona vera nel raro caso di un falso positivo (un gestore
 * di password che riempie tutti i campi, per esempio).
 */
export const MESSAGGIO_BLOCCO =
  "Non siamo riusciti a inviare la richiesta. Ricarica la pagina e riprova.";
