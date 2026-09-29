import "server-only";

import { logger } from "@/lib/logger";
import { LEGAL_VERSION } from "@/lib/legal/content";

/**
 * Consent Database di iubenda — la seconda copia delle prove di consenso.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERCHÉ DUE COPIE, QUANDO UNA BASTEREBBE.
 *
 * La prova che conta la teniamo noi: `user_consents` per chi ha un account, le
 * colonne `consent_version`/`consent_at` per chi compila un modulo pubblico. È
 * nel nostro database, non dipende da nessuno e sopravvive alla disdetta di
 * qualunque abbonamento.
 *
 * Questa è la copia presso il fornitore, e serve a due cose che la nostra non
 * fa: è un archivio di un terzo, quindi ha un peso diverso se qualcuno
 * contesta che il consenso sia stato manipolato a posteriori; e la si può
 * esibire dal pannello di iubenda senza dover interrogare il database di
 * produzione. Costa una chiamata HTTP e ci rende meno dipendenti, non più.
 *
 * È INCLUSA ANCHE NEL PIANO GRATUITO. A differenza dell'API che restituisce il
 * testo dei documenti — che parte da Advanced — la Consent Database c'è già nel
 * piano Free, quindi questa integrazione funziona dal primo giorno.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * TRE REGOLE CHE QUESTO MODULO RISPETTA SEMPRE.
 *
 * 1. **Non blocca mai un modulo.** Se iubenda è lento o non risponde, l'invio
 *    dell'utente va a buon fine comunque: la prova che serve davvero è già
 *    stata scritta nel nostro database un istante prima. Un consenso registrato
 *    da noi e non da loro è un disallineamento; un modulo che non parte perché
 *    un fornitore è giù è un danno.
 * 2. **Non manda l'indirizzo IP.** L'API lo accetta e lo rileva anche da sé con
 *    la chiave pubblica: usiamo quella privata, da server, proprio perché
 *    l'IP non venga registrato. Utente, istante e versione bastano a dimostrare
 *    il consenso — è la stessa scelta motivata nella migration 0049, e sarebbe
 *    incoerente raccogliere altrove ciò che si è deciso di non conservare.
 * 3. **Non manda il contenuto del messaggio.** Nella prova finisce ciò che
 *    riguarda il consenso — chi, quando, quale casella, quale versione — non
 *    il testo che la persona ha scritto nel modulo. Quel testo può contenere
 *    qualunque cosa, e mandarlo a un fornitore che non ne ha bisogno è
 *    esattamente il trattamento eccessivo che si vuole evitare.
 */

const ENDPOINT = "https://consent.iubenda.com/consent";

/** Vuota = nessuna chiamata. L'integrazione è spenta finché non si configura. */
const API_KEY = process.env.IUBENDA_CONSENT_API_KEY ?? "";

/** Oltre questo tempo si rinuncia: il modulo dell'utente non deve attendere. */
const TIMEOUT_MS = 4000;

export const consentDatabaseAttiva = Boolean(API_KEY);

/**
 * Gli identificativi dei documenti, come vanno dichiarati nel pannello iubenda
 * alla voce «Legal notices». Devono combaciare: se qui si scrive un nome che
 * là non esiste, iubenda rifiuta la chiamata.
 */
export type AvvisoLegale = "privacy_policy" | "terms" | "cookie_policy";

export type ProvaConsenso = {
  /** Identificativo stabile dell'interessato. L'id utente quando c'è. */
  soggettoId?: string;
  email?: string;
  nomeCompleto?: string;
  /** Quali documenti sono stati mostrati e accettati. */
  documenti: AvvisoLegale[];
  /**
   * Le caselle e il loro stato, come coppie nome→valore. Finiscono nel pannello
   * di iubenda così come sono scritte qui: conviene usare nomi che una persona
   * capisca fra due anni.
   */
  preferenze: Record<string, boolean>;
  /** Da quale modulo arriva: serve a ritrovare la prova. */
  modulo: string;
  /** Il testo esatto della casella che l'utente ha spuntato. */
  testoCasella?: string;
  versione?: string;
};

/**
 * Registra la prova presso iubenda.
 *
 * Non solleva mai e non restituisce errori da gestire: chi la chiama la lancia e
 * prosegue. L'esito finisce nei log, dove serve a capire se l'integrazione è
 * viva — non nel percorso dell'utente, dove non cambierebbe nulla di utile.
 */
export async function registraProvaSuIubenda(prova: ProvaConsenso): Promise<void> {
  if (!API_KEY) return;

  const versione = prova.versione ?? LEGAL_VERSION;

  const body = {
    subject: {
      ...(prova.soggettoId ? { id: prova.soggettoId } : {}),
      ...(prova.email ? { email: prova.email } : {}),
      ...(prova.nomeCompleto ? { full_name: prova.nomeCompleto } : {}),
      // `verified` resta falso: non abbiamo verificato l'indirizzo email al
      // momento della spunta, e dichiarare il contrario renderebbe la prova
      // meno credibile invece che più forte.
      verified: false,
    },
    legal_notices: prova.documenti.map((identifier) => ({
      identifier,
      version: versione,
    })),
    preferences: prova.preferenze,
    proofs: [
      {
        form: prova.modulo,
        content: prova.testoCasella ?? "",
      },
    ],
    timestamp: new Date().toISOString(),
  };

  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        ApiKey: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Nessuna cache: è una scrittura.
      cache: "no-store",
    });

    if (!r.ok) {
      // Il corpo dell'errore di iubenda dice quale campo non gli piace: senza,
      // un 400 resta indistinguibile da una chiave sbagliata.
      const dettaglio = await r.text().catch(() => "");
      logger.warn(
        "legal/iubenda",
        `prova non registrata (${r.status}) modulo=${prova.modulo} ${dettaglio.slice(0, 300)}`
      );
      return;
    }

    logger.debug("legal/iubenda", `prova registrata, modulo=${prova.modulo}`);
  } catch (e) {
    // Timeout, rete, DNS. Non è un errore dell'utente e non va mostrato.
    const motivo = e instanceof Error ? e.message : String(e);
    logger.warn("legal/iubenda", `prova non inviata, modulo=${prova.modulo}: ${motivo}`);
  }
}

/**
 * La stessa cosa, ma già staccata dal percorso della richiesta.
 *
 * È la forma da usare dentro le server action: la chiamata parte, la action
 * prosegue, e se iubenda tarda quattro secondi l'utente non li aspetta. Il
 * `catch` finale non è ridondante — `registraProvaSuIubenda` non solleva, ma un
 * errore sincrono nella costruzione della promessa arriverebbe qui e diventerebbe
 * un rifiuto non gestito, che su Vercel fa terminare l'invocazione.
 */
export function registraProvaSuIubendaInBackground(prova: ProvaConsenso): void {
  void registraProvaSuIubenda(prova).catch(() => {});
}

/** Il testo delle caselle, in un posto solo, per ritrovarlo nelle prove. */
export const TESTO_CASELLA = {
  privacy:
    "Ho letto l'informativa privacy e acconsento al trattamento dei miei dati per essere ricontattato.",
  termini:
    "Ho letto e accetto la informativa privacy e i termini d'uso.",
  eta: "Dichiaro di avere almeno 18 anni.",
  marketing:
    "Voglio ricevere novità sugli eventi e sulle opportunità N'arte.",
} as const;
