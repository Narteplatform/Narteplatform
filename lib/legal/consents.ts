import "server-only";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { LEGAL_CONSENT_VERSION, LEGAL_VERSION } from "@/lib/legal/content";
import { logger } from "@/lib/logger";
import type { ConsentKind } from "@/lib/supabase/types";

/**
 * Consensi: scrittura, lettura, revoca.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DUE REGISTRI, NON UNO. Non è una ridondanza, sono due cose diverse.
 *
 *   `user_consents`  — lo storico. Una riga per ogni accettazione o ritiro,
 *                      datata e legata alla versione del documento. È la prova.
 *   `profiles.legal_version_accepted`
 *                    — lo stato corrente. Serve a rispondere in fretta a una
 *                      domanda sola, che il middleware pone a ogni navigazione:
 *                      «ha già accettato la versione in vigore?». È una cache.
 *
 * Le due scritture avvengono nella stessa transazione dentro le funzioni SQL,
 * quindi non possono divergere. Se qualcuno le disallineasse a mano, la
 * schermata di accettazione se ne accorge e si rimette in pari da sola.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * PERCHÉ NON SI SCRIVE DIRETTAMENTE SULLA TABELLA
 * La 0049 non concede alcun INSERT su `user_consents`, e fa bene: un consenso
 * che l'interessato potesse scrivere a piacere non dimostrerebbe nulla. Si passa
 * quindi da due funzioni `security definer` che ricavano l'identità da
 * `auth.uid()` — il chiamante non sceglie per chi sta registrando il consenso,
 * lo decide la sessione.
 *
 * Conseguenza pratica: queste funzioni usano il client con i cookie, MAI
 * `createAdminClient()`. Con il service role `auth.uid()` è null e la funzione
 * solleva. L'admin client serve solo in lettura, dove si guarda il consenso di
 * un altro utente.
 */

export type ConsentRow = {
  kind: ConsentKind;
  version: string;
  accepted: boolean;
  accepted_at: string;
};

export type ConsentEsito = { ok: true } | { ok: false; error: string };

const ERRORE_GENERICO =
  "Non siamo riusciti a registrare la tua scelta. Riprova fra un momento.";

/**
 * Registra un singolo consenso per l'utente in sessione.
 *
 * `accepted = false` non cancella niente: scrive una riga di RITIRO. Cancellare
 * l'accettazione precedente distruggerebbe la prova che fino a quel momento il
 * trattamento era legittimo — che è precisamente la cosa che un giorno potrebbe
 * servire dimostrare.
 */
export async function recordConsent(
  kind: ConsentKind,
  accepted = true,
  version: string = LEGAL_VERSION
): Promise<ConsentEsito> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_consent", {
    p_kind: kind,
    p_version: version,
    p_accepted: accepted,
  });

  if (error) {
    logger.error("legal/consents", `record_consent(${kind}) fallita: ${error.message}`);
    return { ok: false, error: ERRORE_GENERICO };
  }
  return { ok: true };
}

/**
 * Accettazione dei documenti in blocco, usata dalla schermata di gate.
 *
 * Una sola chiamata invece di tre: se la seconda fallisse resterebbe un utente
 * con la privacy accettata e i termini no, e la cache aggiornata o meno a
 * seconda di dove si è rotto. La funzione SQL scrive tutto o niente.
 *
 * `marketing` a `undefined` significa «non si è espresso», che non è un
 * rifiuto e non va registrato come tale.
 */
export async function acceptLegalDocuments(
  marketing?: boolean,
  version: string = LEGAL_VERSION
): Promise<ConsentEsito> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_legal_documents", {
    p_version: version,
    p_marketing: marketing ?? null,
  });

  if (error) {
    logger.error("legal/consents", `accept_legal_documents fallita: ${error.message}`);
    return { ok: false, error: ERRORE_GENERICO };
  }
  return { ok: true };
}

/** Ritiro del consenso marketing. Scrive, non cancella — vedi `recordConsent`. */
export async function revokeMarketingConsent(): Promise<ConsentEsito> {
  return recordConsent("marketing", false);
}

/**
 * L'ultimo evento per ciascun tipo di consenso.
 *
 * Legge con l'admin client perché serve anche a guardare i consensi di un altro
 * utente dal pannello amministrativo, dove la policy «leggi i propri» non
 * basterebbe.
 */
export async function getLatestConsents(
  userId: string
): Promise<Partial<Record<ConsentKind, ConsentRow>>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_consents")
    .select("kind, version, accepted, accepted_at")
    .eq("user_id", userId)
    .order("accepted_at", { ascending: false });

  // Un errore qui non è un elenco vuoto: è «non lo sappiamo». Restituire {} e
  // basta farebbe concludere a chi chiama che l'utente non ha mai acconsentito
  // a niente — e da lì, per esempio, che si può smettere di mandargli le email
  // o che va rimesso davanti al gate. Si logga e si restituisce comunque {},
  // ma chi decide qualcosa di importante deve gestire il caso a monte.
  if (error) {
    logger.error("legal/consents", `lettura consensi fallita: ${error.message}`);
    return {};
  }

  const ultimo: Partial<Record<ConsentKind, ConsentRow>> = {};
  for (const riga of data ?? []) {
    // Ordinati dal più recente: il primo che si incontra per ogni tipo è quello
    // che vale, i successivi sono storia.
    if (!ultimo[riga.kind]) ultimo[riga.kind] = riga as ConsentRow;
  }
  return ultimo;
}

/**
 * True solo se privacy E termini risultano accettati alla versione del consenso
 * oggi in vigore.
 *
 * È la funzione con cui la schermata di gate si accorge di essere stata aperta
 * per sbaglio — cache disallineata, trigger che non ha trovato il profilo — e
 * si rimette in pari invece di riproporre all'utente un modulo che ha già
 * compilato.
 */
export async function hasAcceptedCurrentLegal(userId: string): Promise<boolean> {
  const ultimo = await getLatestConsents(userId);
  const valido = (riga?: ConsentRow) =>
    riga?.accepted === true && versioneAlmeno(riga.version, LEGAL_CONSENT_VERSION);
  return valido(ultimo.privacy) && valido(ultimo.termini);
}

/**
 * Confronto fra versioni, che sono date ISO e si ordinano da sole come stringhe.
 *
 * Il controllo di forma non è pedanteria: la trigger della 0049 ripiega su
 * `'sconosciuta'` quando la registrazione non porta con sé la versione, e
 * `"sconosciuta" >= "2026-08-28"` è VERO in ordine alfabetico — la 's' viene
 * dopo il '2'. Senza questo filtro, un consenso di versione ignota farebbe
 * passare il gate invece di fermarlo. Tutto ciò che non è una data si considera
 * non valido, che è l'unica lettura prudente.
 */
function versioneAlmeno(versione: string, minimo: string): boolean {
  const isoData = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoData.test(versione) || !isoData.test(minimo)) return false;
  return versione >= minimo;
}

/**
 * I due campi da scrivere sulle righe dei moduli pubblici.
 *
 * Chi compila il modulo contatti non ha un account, quindi non c'è un
 * `user_id` a cui legare una riga di `user_consents`: la prova va sulla stessa
 * riga del dato che autorizza, dove vive e muore con esso.
 */
export function publicFormConsent(): {
  consent_version: string;
  consent_at: string;
} {
  return { consent_version: LEGAL_VERSION, consent_at: new Date().toISOString() };
}

/**
 * Riallinea la cache su `profiles` a partire dallo storico.
 *
 * Serve alla schermata di accettazione quando si accorge di essere stata aperta
 * per niente: il registro dice che la persona ha già accettato, ma la colonna
 * che il middleware legge dice di no. Può succedere se la colonna viene
 * azzerata a mano, se la trigger di registrazione non trova ancora il profilo,
 * o durante una migrazione a metà.
 *
 * Senza questo rimedio un disallineamento diventerebbe un utente chiuso fuori
 * per sempre: il middleware lo manda al gate, il gate glielo ripropone, e
 * accettare di nuovo non cambierebbe la colonna se la scrittura fallisce ogni
 * volta per lo stesso motivo.
 *
 * Non inventa nulla: copia una versione che è già scritta nel registro. Se il
 * registro non dice niente — perché la lettura è fallita — non scrive.
 */
export async function syncLegalVersionFromConsents(
  userId: string
): Promise<boolean> {
  const ultimo = await getLatestConsents(userId);
  const versione = ultimo.termini?.accepted ? ultimo.termini.version : null;
  if (!versione) return false;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ legal_version_accepted: versione })
    .eq("id", userId);

  if (error) {
    logger.error("legal/consents", `riallineamento versione fallito: ${error.message}`);
    return false;
  }
  return true;
}
