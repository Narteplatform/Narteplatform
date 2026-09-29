import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Raccoglie le violazioni della Content Security Policy.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERCHÉ ESISTE.
 * La CSP di questo progetto è in sola segnalazione, e il piano per attivarla era
 * «navigare le cinque aree con la console aperta e vedere se segnala qualcosa».
 * È una verifica che si fa una volta e poi non si rifà più: richiede una persona,
 * un browser e la pazienza di attraversare pubblico, artista, organizzatore,
 * admin e consulente toccando ogni funzione. Basta un percorso non provato — un
 * caricamento audio, una chat con allegato, il portale Stripe — e la violazione
 * si scopre dagli utenti il giorno in cui la policy diventa attiva.
 *
 * Con questo endpoint la verifica la fanno i browser di chi usa il sito, su
 * tutti i percorsi veri, e lascia una traccia leggibile nei log. Passata una
 * settimana senza segnalazioni, attivare la policy è una decisione informata
 * invece di una scommessa.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * DUE COSE CHE QUESTO ENDPOINT NON DEVE DIVENTARE.
 *
 * 1. **Un canale di dati personali.** Una segnalazione porta l'indirizzo della
 *    pagina visitata, e quell'indirizzo può contenere parametri — un token di
 *    reimpostazione password, un identificativo. Vengono tagliati: si conserva
 *    solo il percorso.
 * 2. **Un rubinetto aperto sui log.** Una sola estensione del browser mal fatta
 *    può generare migliaia di segnalazioni identiche, e su Vercel ogni riga di
 *    log si paga. Le violazioni già viste in questa istanza non si ripetono.
 */

export const runtime = "nodejs";

/** Firme già registrate da questa istanza. Si azzera a ogni avvio a freddo. */
const vistE = new Set<string>();

/** Oltre questo numero di firme diverse si smette: qualcosa è fuori controllo. */
const LIMITE_FIRME = 200;

/**
 * I due formati non usano gli stessi nomi per gli stessi campi: il formato
 * storico scrive `document-uri` e `blocked-uri`, la Reporting API `documentURL`
 * e `blockedURL`. Vanno accettati entrambi, o metà delle segnalazioni arriva
 * senza sapere da quale pagina venga.
 */
type Segnalazione = {
  "document-uri"?: unknown;
  documentURL?: unknown;
  "violated-directive"?: unknown;
  "effective-directive"?: unknown;
  effectiveDirective?: unknown;
  "blocked-uri"?: unknown;
  blockedURL?: unknown;
};

/** Il primo valore utile fra più nomi possibili dello stesso campo. */
function primo(...valori: unknown[]): unknown {
  return valori.find((v) => typeof v === "string" && v.length > 0);
}

/** Solo il percorso: via parametri e frammento, che possono contenere segreti. */
function soloPercorso(valore: unknown): string {
  if (typeof valore !== "string" || !valore) return "?";
  try {
    const u = new URL(valore);
    return `${u.origin}${u.pathname}`;
  } catch {
    return valore.split("?")[0]!.slice(0, 200);
  }
}

/** Dell'origine bloccata basta lo schema e l'host: il percorso non serve. */
function soloOrigine(valore: unknown): string {
  if (typeof valore !== "string" || !valore) return "?";
  // I valori speciali della specifica — `inline`, `eval`, `data` — non sono URL.
  if (!valore.includes("://")) return valore.slice(0, 80);
  try {
    return new URL(valore).origin;
  } catch {
    return valore.slice(0, 120);
  }
}

export async function POST(request: Request) {
  // Il corpo arriva con `application/csp-report` (formato storico) oppure
  // `application/reports+json` (Reporting API): due forme diverse per la stessa
  // informazione, ed entrambe vanno accettate perché i browser non concordano.
  let grezzo: unknown;
  try {
    grezzo = await request.json();
  } catch {
    // Una segnalazione illeggibile non è un errore del client: si ignora.
    return new NextResponse(null, { status: 204 });
  }

  const segnalazioni: Segnalazione[] = [];

  if (Array.isArray(grezzo)) {
    // Reporting API: un array di buste, ognuna con `body`.
    for (const b of grezzo) {
      const corpo = (b as { body?: unknown })?.body;
      if (corpo && typeof corpo === "object") segnalazioni.push(corpo as Segnalazione);
    }
  } else if (grezzo && typeof grezzo === "object") {
    const classico = (grezzo as { "csp-report"?: unknown })["csp-report"];
    segnalazioni.push(
      (classico && typeof classico === "object" ? classico : grezzo) as Segnalazione
    );
  }

  for (const s of segnalazioni) {
    const direttiva =
      (primo(
        s["effective-directive"],
        s.effectiveDirective,
        s["violated-directive"]
      ) as string) ?? "?";
    const bloccato = soloOrigine(primo(s["blocked-uri"], s.blockedURL));
    const pagina = soloPercorso(primo(s["document-uri"], s.documentURL));

    // La firma non include la pagina: la stessa risorsa bloccata su venti
    // profili artista è UNA cosa da sistemare, non venti.
    const firma = `${direttiva}|${bloccato}`;
    if (vistE.has(firma)) continue;
    if (vistE.size >= LIMITE_FIRME) continue;
    vistE.add(firma);

    logger.warn("csp", `${direttiva} ha bloccato ${bloccato} — prima vista su ${pagina}`);
  }

  // 204 sempre: al browser non interessa l'esito, e rispondere con un errore lo
  // farebbe soltanto riprovare.
  return new NextResponse(null, { status: 204 });
}
