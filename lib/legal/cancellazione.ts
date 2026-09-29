import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { logger } from "@/lib/logger";

/**
 * Cancellazione dell'account: richiesta, conferma, disattivazione.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DUE TEMPI, E IL SECONDO PASSA DALLA POSTA.
 *
 * Chi invia la richiesta è già autenticato, quindi la conferma non serve a
 * stabilire chi sia. Serve contro il caso più banale e più probabile — una
 * sessione lasciata aperta su un computer condiviso, un click sbagliato — e
 * contro il ripensamento. Su un'azione irreversibile, un passaggio che obbliga
 * ad aprire la propria posta vale il fastidio che costa.
 *
 * COSA FA LA CONFERMA, E COSA NON FA.
 * Fa: chiude l'accesso e toglie il profilo dal pubblico, subito. Non fa: la
 * rimozione dei dati, che resta un passaggio controllato entro 30 giorni. È la
 * differenza fra disattivare e cancellare, e va mantenuta — perché la
 * cancellazione su questo schema tocca tabelle che il cascade non raggiunge e
 * file che vivono altrove, e perché in quei 30 giorni si può tornare indietro.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Quanto vale il collegamento inviato per email. */
export const SCADENZA_ORE = 48;

/** Il token in chiaro non si conserva: se ne conserva l'impronta. */
function impronta(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type EsitoConferma =
  | { ok: true; giaFatto: boolean }
  | { ok: false; motivo: "non-trovata" | "scaduta" | "annullata" | "errore" };

/**
 * Registra la richiesta e restituisce il token da mettere nel collegamento.
 *
 * Una richiesta ancora aperta viene annullata prima di aprirne un'altra: due
 * collegamenti validi contemporaneamente sono due modi di confermare la stessa
 * cosa, e il secondo che arriva in casella confonde chi lo riceve.
 */
export async function creaRichiestaCancellazione(
  userId: string,
  motivo?: string
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { error: erroreAnnulla } = await admin
    .from("account_deletion_requests")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("confirmed_at", null)
    .is("cancelled_at", null);

  if (erroreAnnulla) {
    // Non si prosegue: senza aver chiuso le precedenti resterebbero più
    // collegamenti validi, e non è un dettaglio da ignorare.
    logger.error("cancellazione", `annullamento precedenti fallito: ${erroreAnnulla.message}`);
    return { ok: false, error: "Non siamo riusciti a registrare la richiesta. Riprova." };
  }

  const token = randomBytes(32).toString("base64url");
  const scadenza = new Date(Date.now() + SCADENZA_ORE * 3600 * 1000).toISOString();

  const { error } = await admin.from("account_deletion_requests").insert({
    user_id: userId,
    token_hash: impronta(token),
    reason: motivo ?? null,
    expires_at: scadenza,
  });

  if (error) {
    logger.error("cancellazione", `inserimento fallito: ${error.message}`);
    return { ok: false, error: "Non siamo riusciti a registrare la richiesta. Riprova." };
  }

  return { ok: true, token };
}

/**
 * Conferma la richiesta e disattiva l'account.
 *
 * Il token basta: chi lo possiede ha accesso alla casella di posta
 * dell'interessato, che è la prova che serviva. Non si richiede una sessione —
 * chi clicca da un telefono diverso non deve rifare l'accesso per esercitare un
 * proprio diritto.
 */
export async function confermaCancellazione(token: string): Promise<EsitoConferma> {
  const admin = createAdminClient();

  const { data: richiesta, error } = await admin
    .from("account_deletion_requests")
    .select("id, user_id, expires_at, confirmed_at, cancelled_at, completed_at")
    .eq("token_hash", impronta(token))
    .maybeSingle();

  if (error) {
    logger.error("cancellazione", `lettura richiesta fallita: ${error.message}`);
    return { ok: false, motivo: "errore" };
  }
  if (!richiesta) return { ok: false, motivo: "non-trovata" };
  if (richiesta.cancelled_at) return { ok: false, motivo: "annullata" };

  // Già confermata: non è un errore, è qualcuno che ha aperto due volte lo
  // stesso messaggio. Si risponde come la prima volta, senza rifare il lavoro.
  if (richiesta.confirmed_at) return { ok: true, giaFatto: true };

  if (new Date(richiesta.expires_at).getTime() < Date.now()) {
    return { ok: false, motivo: "scaduta" };
  }

  const statoPrecedente = await disattivaAccount(richiesta.user_id);
  if (!statoPrecedente.ok) return { ok: false, motivo: "errore" };

  const { error: erroreConferma } = await admin
    .from("account_deletion_requests")
    .update({
      confirmed_at: new Date().toISOString(),
      restore_state: statoPrecedente.stato,
    })
    .eq("id", richiesta.id);

  if (erroreConferma) {
    // L'account è già disattivato ma la richiesta non risulta confermata: va
    // detto forte, perché è lo stato che nessuno si aspetta e che va sistemato
    // a mano. Non si tenta di riattivare: due operazioni fallibili in fila
    // peggiorerebbero le cose.
    logger.error(
      "cancellazione",
      `ACCOUNT DISATTIVATO MA RICHIESTA NON CONFERMATA — id=${richiesta.id} ` +
        `utente=${richiesta.user_id}: ${erroreConferma.message}`
    );
    return { ok: false, motivo: "errore" };
  }

  return { ok: true, giaFatto: false };
}

/**
 * Disattivazione: accesso chiuso, profilo fuori dal pubblico.
 *
 * PERCHÉ `status = 'pending'` E NON UN CAMPO NUOVO. Il catalogo pubblico mostra
 * gli artisti con `status = 'approved'`, e la regola sta nella policy di lettura
 * della tabella. Riportare lo stato a `pending` toglie il profilo dal sito
 * immediatamente, usando un valore che l'enum già prevede e un meccanismo già
 * collaudato. Aggiungere una colonna avrebbe significato riscrivere quella
 * policy — e una policy sbagliata su `artists` fa sparire l'intero catalogo,
 * non un profilo.
 */
async function disattivaAccount(
  userId: string
): Promise<{ ok: true; stato: Json } | { ok: false }> {
  const admin = createAdminClient();

  const { data: artisti, error: erroreLettura } = await admin
    .from("artists")
    .select("id, status")
    .eq("user_id", userId);

  if (erroreLettura) {
    // Senza sapere lo stato di partenza non si tocca niente: scrivere una
    // modifica di cui non si è potuto registrare il valore precedente
    // significherebbe non poter più tornare indietro.
    logger.error("cancellazione", `lettura profili artista fallita: ${erroreLettura.message}`);
    return { ok: false };
  }

  const daNascondere = (artisti ?? []).filter((a) => a.status === "approved");
  for (const a of daNascondere) {
    const { error } = await admin
      .from("artists")
      .update({ status: "pending" })
      .eq("id", a.id);
    if (error) {
      logger.error("cancellazione", `profilo ${a.id} non nascosto: ${error.message}`);
      return { ok: false };
    }
  }

  // Blocco dell'accesso. `ban_duration` accetta una durata: cento anni equivale
  // a «finché qualcuno non lo toglie», ed è reversibile — che è il punto, visto
  // che per trenta giorni si può ancora tornare indietro.
  const { error: erroreBan } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (erroreBan) {
    logger.error("cancellazione", `blocco accesso fallito: ${erroreBan.message}`);
    return { ok: false };
  }

  return {
    ok: true,
    stato: {
      artisti_riportati_a_pending: daNascondere.map((a) => a.id),
      accesso_bloccato: true,
      disattivato_il: new Date().toISOString(),
    },
  };
}
