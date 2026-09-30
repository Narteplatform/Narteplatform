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
 * 2. **Non manda l'indirizzo IP.** Con la chiave privata non lo si invia; con
 *    quella pubblica il rilevamento automatico è attivo per impostazione
 *    predefinita e va spento esplicitamente — vedi il campo
 *    `autodetect_ip_address` più sotto. Utente, istante e versione bastano a
 *    dimostrare il consenso: è la stessa scelta motivata nella migration 0049, e
 *    sarebbe incoerente raccogliere presso un fornitore ciò che si è deciso di
 *    non conservare in casa.
 * 3. **Non manda il contenuto del messaggio.** Nella prova finisce ciò che
 *    riguarda il consenso — chi, quando, quale casella, quale versione — non
 *    il testo che la persona ha scritto nel modulo. Quel testo può contenere
 *    qualunque cosa, e mandarlo a un fornitore che non ne ha bisogno è
 *    esattamente il trattamento eccessivo che si vuole evitare.
 */

/**
 * DUE CHIAVI POSSIBILI, E NON SONO EQUIVALENTI.
 *
 * `IUBENDA_CONSENT_API_KEY` è la chiave **privata**: va sull'endpoint normale,
 * è quella che iubenda definisce a «maggiore affidabilità», e non deve uscire
 * dal server. È la scelta giusta.
 *
 * `IUBENDA_CONSENT_PUBLIC_KEY` è la chiave **pubblica**: viaggia dentro il
 * widget della Cookie Solution, quindi la conosce già chiunque apra il sito, e
 * funziona solo sull'endpoint `/public/consent`. Esiste qui come ripiego, per
 * non restare senza archivio esterno mentre si recupera quella privata — la
 * prova principale resta comunque nel nostro database.
 *
 * Se ci sono entrambe vince la privata. Passare dall'una all'altra è cambiare
 * una variabile d'ambiente: nessuna modifica al codice, nessun dato da migrare.
 */
const CHIAVE_PRIVATA = process.env.IUBENDA_CONSENT_API_KEY ?? "";
const CHIAVE_PUBBLICA = process.env.IUBENDA_CONSENT_PUBLIC_KEY ?? "";

const API_KEY = CHIAVE_PRIVATA || CHIAVE_PUBBLICA;
const USA_CHIAVE_PUBBLICA = !CHIAVE_PRIVATA && Boolean(CHIAVE_PUBBLICA);

const ENDPOINT = USA_CHIAVE_PUBBLICA
  ? "https://consent.iubenda.com/public/consent"
  : "https://consent.iubenda.com/consent";

/** Oltre questo tempo si rinuncia: il modulo dell'utente non deve attendere. */
const TIMEOUT_MS = 4000;

/**
 * iubenda ha già rifiutato una prova che citava «terms»?
 *
 * Il documento va registrato una volta con `npm run iubenda:notices`, e finché
 * non lo è ogni invio costerebbe DUE chiamate: una rifiutata e una di ripiego.
 * Alla prima rifiutata si impara, e per il resto della vita dell'istanza si
 * parte già senza. Si azzera a ogni avvio a freddo, quindi il giorno in cui il
 * documento viene registrato il comportamento torna da sé quello giusto senza
 * che nessuno debba ricordarsene.
 */
let terminiRifiutati = false;

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

  const documenti = terminiRifiutati
    ? prova.documenti.filter((d) => d !== "terms")
    : prova.documenti;

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
    // ⚠️ NESSUN `version` QUI, ed è deliberato.
    //
    // Le versioni dei legal notice le assegna iubenda, come numeri progressivi
    // (1, 2, 3…) a ogni invio del testo. La nostra `LEGAL_VERSION` è una data
    // — «2026-09-14» — e appartiene a un altro sistema di numerazione: passarla
    // qui significherebbe riferirsi a una versione che iubenda non ha. Omettendo
    // il campo, iubenda aggancia la prova all'ultima versione del testo che
    // possiede, che è esattamente quella che l'utente ha letto.
    //
    // La nostra versione non va persa: finisce nella prova, qui sotto.
    legal_notices: documenti.map((identifier) => ({ identifier })),
    preferences: prova.preferenze,
    proofs: [
      {
        form: prova.modulo,
        content: [
          prova.testoCasella ?? "",
          `[versione documenti N'arte: ${versione}]`,
        ]
          .filter(Boolean)
          .join(" "),
      },
    ],
    timestamp: new Date().toISOString(),
    // ⚠️ Solo per la chiave pubblica, e va detto esplicitamente: su
    // `/public/consent` il rilevamento dell'indirizzo IP è ATTIVO per
    // impostazione predefinita. Lasciarlo acceso significherebbe far registrare
    // a iubenda un IP che noi abbiamo deciso di non conservare — e siccome la
    // chiamata parte dal nostro server, quell'IP non sarebbe nemmeno quello
    // dell'utente ma quello di Vercel: un dato inutile e una contraddizione con
    // l'informativa, nello stesso campo.
    ...(USA_CHIAVE_PUBBLICA ? { autodetect_ip_address: false } : {}),
  };

  async function invia(corpo: unknown) {
    return fetch(ENDPOINT, {
      method: "POST",
      headers: {
        ApiKey: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Nessuna cache: è una scrittura.
      cache: "no-store",
    });
  }

  try {
    let r = await invia(body);

    // SECONDO TENTATIVO SENZA I DOCUMENTI, e non è una pezza.
    //
    // I «legal notices» su iubenda esistono come entità: quelli generati da lui
    // — informativa e cookie policy — si sincronizzano da soli, i TERMINI no,
    // perché li scriviamo noi e vanno registrati con `npm run iubenda:notices`.
    // Finché quella registrazione non è stata fatta, riferirsi a `terms` può far
    // rifiutare l'INTERA chiamata.
    //
    // Sarebbe il baratto peggiore possibile: perdere anche la prova del consenso
    // privacy, che è valida, per colpa di un'etichetta non ancora creata. Quindi
    // si riprova con i soli documenti che iubenda sicuramente conosce. Si
    // conserva meno, ma si conserva.
    if (!r.ok && body.legal_notices.length > 1) {
      const soloNoti = body.legal_notices.filter((n) => n.identifier !== "terms");
      if (soloNoti.length !== body.legal_notices.length) {
        logger.warn(
          "legal/iubenda",
          `prova rifiutata (${r.status}): riprovo senza «terms». ` +
            "Per registrarlo una volta per tutte: npm run iubenda:notices"
        );
        r = await invia({ ...body, legal_notices: soloNoti });
        // Se il ripiego funziona, il problema era proprio «terms»: da qui in poi
        // si evita la chiamata sprecata.
        if (r.ok) terminiRifiutati = true;
      }
    }

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
    "Ho letto l'informativa privacy: i miei dati servono solo a rispondere a questa richiesta.",
  termini:
    "Ho letto e accetto i termini d'uso. Ho preso visione dell'informativa privacy.",
  eta: "Dichiaro di avere almeno 18 anni.",
  marketing:
    "Voglio ricevere novità sugli eventi e sulle opportunità N'arte.",
} as const;
