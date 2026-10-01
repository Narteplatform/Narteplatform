import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Json } from "@/lib/supabase/types";
import {
  disattivaAccount,
  disdiciAbbonamentoAFinePeriodo,
  haCancellazioneConfermata,
} from "@/lib/legal/cancellazione";
import { registraDecisione, MOTIVAZIONE_MIN } from "@/lib/moderation/decisioni";

/**
 * Chiusura di un account disposta dal Team.
 *
 * Usa lo stesso percorso della cancellazione chiesta dall'utente: accesso
 * bloccato, profili fuori dal catalogo, abbonamento disdetto a fine periodo, e
 * una riga già confermata in `account_deletion_requests`, così la richiesta
 * compare negli strumenti root esistenti (e si può annullare entro 30 giorni
 * con `annullaCancellazioneConfermata`).
 *
 * NON esegue mai la cancellazione definitiva dei dati: quella resta lo
 * strumento root di /admin/impostazioni/cancellazioni.
 */

const AREA = "admin/chiusura";

export type EsitoChiusura =
  | { ok: true; reference: string; notified: boolean }
  | { ok: false; error: string };

function improntaCasuale(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

function fraseAbbonamento(esito: Json): string {
  const tipo =
    esito && typeof esito === "object" && !Array.isArray(esito) ? (esito as Record<string, Json>).esito : null;
  if (tipo === "disdetto" || tipo === "parziale" || tipo === "da_disdire_a_mano") {
    return " Il tuo abbonamento non si rinnoverà alla fine del periodo in corso.";
  }
  return "";
}

export async function chiudiAccountDalTeam({
  userId,
  motivo,
  attoreId,
}: {
  userId: string;
  motivo: string;
  attoreId: string;
}): Promise<EsitoChiusura> {
  const motivoPulito = motivo.trim();
  if (motivoPulito.length < MOTIVAZIONE_MIN) {
    return { ok: false, error: `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.` };
  }
  if (userId === attoreId) return { ok: false, error: "Non puoi chiudere il tuo stesso account." };

  const admin = createAdminClient();

  const { data: profilo, error: erroreProfilo } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (erroreProfilo) {
    logger.error(AREA, `lettura profilo fallita: ${erroreProfilo.message}`);
    return { ok: false, error: "Non riesco a verificare il ruolo dell'utente. Nessuna modifica fatta." };
  }
  if (!profilo) return { ok: false, error: "Utente non trovato." };
  if (profilo.role === "superadmin") {
    return { ok: false, error: "Un superadmin non può essere chiuso da qui." };
  }

  const gia = await haCancellazioneConfermata(userId);
  if (!gia.ok) {
    return { ok: false, error: "Non riesco a verificare le richieste di cancellazione. Nessuna modifica fatta." };
  }
  if (gia.attiva) {
    return { ok: false, error: "L'utente ha già una cancellazione confermata: gestiscila da Impostazioni > Cancellazioni account." };
  }

  // 1. Richieste ancora da confermare: vanno chiuse, o il collegamento già
  //    inviato potrebbe generare una seconda conferma sull'account chiuso.
  const { error: erroreAperte } = await admin
    .from("account_deletion_requests")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("confirmed_at", null)
    .is("cancelled_at", null);
  if (erroreAperte) {
    logger.error(AREA, `richieste aperte non chiuse: ${erroreAperte.message}`);
    return { ok: false, error: "Non riesco a chiudere le richieste di cancellazione già aperte. Nessuna modifica fatta." };
  }

  // 2. Disattivazione: accesso bloccato, profili fuori dal catalogo.
  const disattivato = await disattivaAccount(userId);
  if (!disattivato.ok) {
    return { ok: false, error: "Disattivazione non riuscita (vedi i log). Puoi riprovare: l'operazione è ripetibile." };
  }

  // 3. Abbonamento a fine periodo. Se Stripe non risponde la chiusura resta
  //    valida: l'esito va nello stato di ripristino e nei log.
  const abbonamento = await disdiciAbbonamentoAFinePeriodo(userId);

  // 4. La richiesta, già confermata.
  const adesso = new Date().toISOString();
  const { error: erroreRichiesta } = await admin.from("account_deletion_requests").insert({
    user_id: userId,
    token_hash: improntaCasuale(),
    reason: `Chiusura disposta dal team: ${motivoPulito}`.slice(0, 1000),
    expires_at: adesso,
    confirmed_at: adesso,
    restore_state: {
      ...(disattivato.stato as Record<string, Json>),
      abbonamento,
      chiusura_dal_team: true,
    },
  });
  if (erroreRichiesta) {
    logger.error(
      AREA,
      `ACCOUNT DISATTIVATO MA RICHIESTA NON REGISTRATA — utente=${userId}: ${erroreRichiesta.message}`
    );
    return {
      ok: false,
      error: "Account chiuso ma richiesta non registrata: segnalalo a chi gestisce il sito prima di fare altro.",
    };
  }

  // 5. Decisione registrata e comunicata, con il collegamento per il reclamo.
  const decisione = await registraDecisione({
    actorId: attoreId,
    targetType: "account",
    targetId: userId,
    affectedUserId: userId,
    action: "account_chiuso",
    reason: motivoPulito,
    notify: {
      decision: "Abbiamo chiuso il tuo account N'arte.",
      target: "Account N'arte",
      consequences:
        "L'accesso è bloccato e i tuoi profili non sono più visibili sul sito. Cancellazione definitiva dopo 30 giorni salvo reclamo accolto." +
        fraseAbbonamento(abbonamento),
    },
  });
  if (!decisione.ok) {
    logger.error(AREA, `chiusura eseguita ma decisione non registrata: ${decisione.error}`);
    return { ok: false, error: `Account chiuso, ma la decisione non è stata registrata: ${decisione.error}` };
  }
  return { ok: true, reference: decisione.reference, notified: decisione.notified };
}
