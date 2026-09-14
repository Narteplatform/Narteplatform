import { LEGAL_CONSENT_VERSION } from "@/lib/legal/content";

/**
 * Il gate di ri-accettazione: regole di esenzione e confronto delle versioni.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * A COSA SERVE
 * Nessuno degli account creati da un amministratore — cioè TUTTI gli artisti,
 * i consulenti e i superadmin invitati — ha mai accettato termini o
 * informativa: quei percorsi non passano da `signUp`, quindi la trigger che
 * registra il consenso non trova nulla da leggere. Lo stesso vale per chiunque
 * si sia registrato prima che i documenti esistessero.
 *
 * Non si può spuntare una casella al posto di qualcun altro. L'unico modo
 * corretto di raccogliere quel consenso è chiederlo alla persona, la prima
 * volta che torna.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * QUESTO FILE È IMPORTATO DAL MIDDLEWARE: gira sul runtime edge a ogni
 * richiesta. Niente dipendenze pesanti, niente accessi al database, solo
 * confronti di stringhe.
 */

/**
 * Cookie che memorizza la versione già accettata.
 *
 * PERCHÉ UN COOKIE SE IL DATO È SUL PROFILO. Senza, il middleware dovrebbe
 * interrogare `profiles` a ogni navigazione di ogni utente autenticato, anche
 * sulle pagine pubbliche dove oggi non fa alcuna query. Con il cookie, chi ha
 * già accettato non tocca mai il database: la verifica è un confronto fra due
 * stringhe.
 *
 * NON è un meccanismo di sicurezza e non deve diventarlo. Falsificarlo non dà
 * accesso a nulla: fa solo saltare una schermata informativa. Il consenso vero
 * resta quello registrato in `user_consents`, e le azioni che contano —
 * inviare una richiesta di booking, registrarsi — hanno la loro casella.
 */
export const LEGAL_COOKIE = "narte-lv";

/** Sei mesi. Alla scadenza si rifà una query e il cookie si riscrive. */
export const LEGAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

/**
 * Percorsi esenti dal gate.
 *
 * È la lista che impedisce i cicli infiniti, e ogni voce ha una ragione:
 *
 *  - la schermata di accettazione stessa, altrimenti si redirige verso di sé;
 *  - l'uscita, o chi non vuole accettare resta prigioniero del proprio account;
 *  - i documenti legali, perché vanno letti PRIMA di accettare — ed è da lì che
 *    la schermata li apre;
 *  - le rotte di accesso e recupero password, che si usano proprio quando una
 *    sessione non è ancora completa;
 *  - le rotte API: un route handler deve rispondere JSON. Restituirgli un 307
 *    verso una pagina HTML fa fallire ogni `fetch` del client con un errore di
 *    parsing che non dice niente a nessuno.
 */
const ESENTI_ESATTI = new Set([
  "/accetta-condizioni",
  "/logout",
  "/login",
  "/register",
  "/recupero-password",
  "/reset-password",
  "/post-login",
  "/privacy",
  "/cookie-policy",
  "/termini",
  "/sitemap.xml",
  "/robots.txt",
  "/favicon.ico",
]);

const ESENTI_PREFISSO = [
  "/accetta-condizioni/",
  // Le riscritture di next.config.ts puntano qui: senza questa riga i
  // documenti sarebbero irraggiungibili proprio da chi deve leggerli.
  "/legale/",
  "/api/",
  "/auth/",
  "/_next/",
  "/__health",
  "/opengraph-image",
];

export function isGateExempt(path: string): boolean {
  if (ESENTI_ESATTI.has(path)) return true;
  return ESENTI_PREFISSO.some((p) => path.startsWith(p));
}

/**
 * Richieste che NON vanno mai deviate, per natura e non per percorso.
 *
 * PREFETCH: il router di Next scarica in anticipo le pagine dei collegamenti
 * che l'utente sfiora col mouse. Rispondere a un prefetch con un redirect
 * avvelena la cache del router — al click successivo la navigazione finisce
 * dove non doveva, e il difetto è pressoché impossibile da riprodurre a mano.
 *
 * SERVER ACTION: è una POST. Deviarla significa rispedire il corpo verso la
 * pagina del gate, che non sa cosa farsene: l'azione dell'utente sparisce
 * senza un errore. Capita solo se il cookie scade con la scheda già aperta;
 * il caso si copre meglio dentro le azioni che contano, non qui.
 */
export function isGateSkippableRequest(headers: Headers): boolean {
  if (headers.get("next-router-prefetch") === "1") return true;
  if (headers.get("purpose") === "prefetch") return true;
  if (headers.get("next-action")) return true;
  return false;
}

/**
 * La versione accettata copre quella oggi in vigore?
 *
 * Le versioni sono date ISO e si ordinano da sole come stringhe, ma il
 * controllo di forma serve: la trigger della 0049 ripiega su `'sconosciuta'`
 * quando la registrazione non porta con sé la versione, e
 * `"sconosciuta" >= "2026-08-28"` è VERO in ordine alfabetico — la 's' viene
 * dopo il '2'. Tutto ciò che non è una data si considera non valido.
 */
export function copreVersioneCorrente(accettata: string | null | undefined): boolean {
  if (!accettata) return false;
  const isoData = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoData.test(accettata) || !isoData.test(LEGAL_CONSENT_VERSION)) return false;
  return accettata >= LEGAL_CONSENT_VERSION;
}
