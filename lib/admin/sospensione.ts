import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { haCancellazioneConfermata, nascondiProfiliEBloccaAccesso } from "@/lib/legal/cancellazione";
import { isUtenteSospeso, leggiSospensione, type DatiSospensione } from "@/lib/auth/sospeso";
import { registraDecisione, MOTIVAZIONE_MIN } from "@/lib/moderation/decisioni";
import { TITOLARE } from "@/lib/legal/titolare";
import type { Json } from "@/lib/supabase/types";

/**
 * Sospensione e riattivazione di un account da parte del Team.
 *
 * COSA FA LA SOSPENSIONE. Blocca l'accesso (ban di Supabase Auth) e riporta a
 * `pending` i profili artista approvati, così spariscono dal catalogo. Lo stato
 * di partenza si conserva in `app_metadata.sospensione` dell'utente: la
 * riattivazione ripristina solo quei profili, e solo se sono ancora `pending`.
 * `app_metadata` non è modificabile dall'utente (a differenza di `user_metadata`).
 *
 * ABBONAMENTO STRIPE. NON viene disdetto: la sospensione è temporanea e
 * disdire un abbonamento a nome dell'utente sarebbe una decisione diversa, con
 * effetti economici. L'email lo dice e indica come chiedere la disdetta.
 */

const AREA = "admin/sospensione";

export type EsitoSospensione =
  | { ok: true; reference: string; notified: boolean }
  | { ok: false; error: string };

type Input = { userId: string; motivo: string; attoreId: string };

const MSG_CANCELLAZIONE =
  "L'utente ha una richiesta di cancellazione confermata: sospensione e riattivazione sono bloccate. " +
  "Gestisci la richiesta da Impostazioni > Cancellazioni account.";

/**
 * Aggiorna `profili_nascosti` facendo l'UNIONE con quelli già presenti
 * (riletti ora), mai una sostituzione. Con `completa` chiude `in_corso`.
 */
async function unisciProfiliNascosti(
  userId: string,
  nuovi: string[],
  completa: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: letto, error } = await admin.auth.admin.getUserById(userId);
  if (error || !letto?.user) return { ok: false, error: error?.message ?? "utente assente" };
  const attuale = leggiSospensione(letto.user.app_metadata);
  if (!attuale) return { ok: false, error: "registro di sospensione assente" };
  const dati: DatiSospensione = {
    ...attuale,
    profili_nascosti: Array.from(new Set([...attuale.profili_nascosti, ...nuovi])),
    in_corso: completa ? false : attuale.in_corso,
  };
  const { error: errore } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(letto.user.app_metadata ?? {}), sospensione: dati as unknown as Json },
  });
  return errore ? { ok: false, error: errore.message } : { ok: true };
}

/**
 * Per approvare un profilo: il proprietario non deve essere sospeso né
 * bloccato. Lettura con errore controllato.
 */
export async function verificaProprietarioNonSospeso(
  userId: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!userId) return { ok: true };
  const { data, error } = await createAdminClient().auth.admin.getUserById(userId);
  if (error || !data?.user) {
    logger.error(AREA, `proprietario non leggibile: ${error?.message ?? "assente"}`);
    return { ok: false, error: "Non riesco a verificare lo stato dell'account del proprietario. Nessuna modifica fatta." };
  }
  if (leggiSospensione(data.user.app_metadata)) {
    return {
      ok: false,
      error: "L'account del proprietario è sospeso: il profilo non può essere approvato. Riattiva prima l'account da Utenti.",
    };
  }
  if (isUtenteSospeso(data.user)) {
    return { ok: false, error: "L'account del proprietario è bloccato (es. chiuso su richiesta): il profilo non può essere approvato." };
  }
  return { ok: true };
}

/** Frase sull'abbonamento per l'email di sospensione. */
async function fraseAbbonamento(userId: string): Promise<string> {
  const admin = createAdminClient();
  const contatto = TITOLARE.emailContatti;
  const { data, error } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .in("status", ["trialing", "active", "past_due"]);
  if (error) {
    logger.warn(AREA, `lettura abbonamenti fallita: ${error.message}`);
    // Non sapendo se c'è un abbonamento, la frase resta condizionale.
    return ` Se hai un abbonamento attivo, resta attivo: per disdirlo scrivi a ${contatto}.`;
  }
  if ((data ?? []).length === 0) return "";
  return ` Il tuo abbonamento resta attivo: se vuoi disdirlo scrivi a ${contatto}.`;
}

export async function sospendiAccount({ userId, motivo, attoreId }: Input): Promise<EsitoSospensione> {
  const motivoPulito = motivo.trim();
  if (motivoPulito.length < MOTIVAZIONE_MIN) {
    return { ok: false, error: `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.` };
  }
  if (userId === attoreId) return { ok: false, error: "Non puoi sospendere il tuo stesso account." };

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
  if (profilo?.role === "superadmin") {
    return { ok: false, error: "Un superadmin non può essere sospeso da qui." };
  }

  const { data: letto, error: erroreUtente } = await admin.auth.admin.getUserById(userId);
  if (erroreUtente || !letto?.user) {
    logger.error(AREA, `utente non leggibile: ${erroreUtente?.message ?? "assente"}`);
    return { ok: false, error: "Utente non trovato o non leggibile. Nessuna modifica fatta." };
  }
  const utente = letto.user;
  if (leggiSospensione(utente.app_metadata)) {
    return {
      ok: false,
      error: "L'account risulta già sospeso (o con una sospensione rimasta a metà): riattivalo prima di sospenderlo di nuovo.",
    };
  }
  if (isUtenteSospeso(utente)) {
    return {
      ok: false,
      error: "L'account è già bloccato per un altro motivo (es. cancellazione richiesta dall'utente): non si sospende da qui.",
    };
  }

  const cancellazione = await haCancellazioneConfermata(userId);
  if (!cancellazione.ok) {
    return { ok: false, error: "Non riesco a verificare le richieste di cancellazione. Nessuna modifica fatta." };
  }
  if (cancellazione.attiva) return { ok: false, error: MSG_CANCELLAZIONE };

  // 1. Prima l'intenzione: se il processo si ferma a metà, il registro esiste
  //    e la riattivazione sa che c'è qualcosa da rimettere a posto.
  const intenzione: DatiSospensione = {
    in_corso: true,
    motivo: motivoPulito,
    sospeso_il: new Date().toISOString(),
    attore: attoreId,
    profili_nascosti: [],
  };
  const { error: erroreIntenzione } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(utente.app_metadata ?? {}), sospensione: intenzione as unknown as Json },
  });
  if (erroreIntenzione) {
    logger.error(AREA, `registro di sospensione non scritto: ${erroreIntenzione.message}`);
    return { ok: false, error: "Non riesco a registrare la sospensione. Nessuna modifica fatta." };
  }

  // 2. Nascondi i profili e banna.
  const esito = await nascondiProfiliEBloccaAccesso(userId, AREA);
  if (!esito.ok) {
    // Stato a metà: si tenta di salvare comunque i profili già nascosti nel
    // registro (unione), così la riattivazione li ritrova.
    if (esito.nascosti.length > 0) {
      logger.error(
        AREA,
        `SOSPENSIONE INCOMPLETA — utente=${userId} profili già nascosti: ${esito.nascosti.join(", ")}`
      );
      const salvati = await unisciProfiliNascosti(userId, esito.nascosti, false);
      if (!salvati.ok) logger.error(AREA, `profili nascosti non salvati nel registro: ${salvati.error}`);
    }
    return {
      ok: false,
      error:
        "Sospensione non riuscita e rimasta a metà: l'account risulta con una sospensione in corso. " +
        "Usa «Riattiva» per ripristinare, poi riprova. Controlla i log del server.",
    };
  }

  // 3. Profili nascosti nel registro (unione) e chiusura di `in_corso`.
  const chiuso = await unisciProfiliNascosti(userId, esito.nascosti, true);
  if (!chiuso.ok) {
    logger.error(
      AREA,
      `ACCOUNT BLOCCATO MA PROFILI NON REGISTRATI — utente=${userId} profili nascosti: ` +
        `${esito.nascosti.join(", ") || "nessuno"}: ${chiuso.error}`
    );
    return {
      ok: false,
      error: "Account bloccato ma elenco dei profili nascosti non salvato: segnalalo a chi gestisce il sito prima di riattivare.",
    };
  }

  const abbonamento = await fraseAbbonamento(userId);
  const decisione = await registraDecisione({
    actorId: attoreId,
    targetType: "account",
    targetId: userId,
    affectedUserId: userId,
    action: "account_sospeso",
    reason: motivoPulito,
    notify: {
      decision: "Abbiamo sospeso il tuo account N'arte.",
      target: "Account N'arte",
      consequences:
        "Non puoi più accedere e i tuoi profili non sono visibili sul sito, finché la sospensione non viene revocata." +
        abbonamento,
    },
  });
  if (!decisione.ok) {
    logger.error(AREA, `sospensione eseguita ma decisione non registrata: ${decisione.error}`);
    return { ok: false, error: `Account sospeso, ma la decisione non è stata registrata: ${decisione.error}` };
  }
  return { ok: true, reference: decisione.reference, notified: decisione.notified };
}

export async function riattivaAccount({ userId, motivo, attoreId }: Input): Promise<EsitoSospensione> {
  const motivoPulito = motivo.trim();
  if (motivoPulito.length < MOTIVAZIONE_MIN) {
    return { ok: false, error: `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.` };
  }

  const admin = createAdminClient();

  const { data: letto, error: erroreUtente } = await admin.auth.admin.getUserById(userId);
  if (erroreUtente || !letto?.user) {
    logger.error(AREA, `utente non leggibile: ${erroreUtente?.message ?? "assente"}`);
    return { ok: false, error: "Utente non trovato o non leggibile. Nessuna modifica fatta." };
  }
  const utente = letto.user;
  const sospensione = leggiSospensione(utente.app_metadata);
  if (!sospensione) {
    // Senza il registro non si sa cosa ripristinare; un account bloccato per
    // altro motivo (es. cancellazione confermata) non va sbloccato da qui.
    return { ok: false, error: "Nessuna sospensione registrata su questo account: niente da riattivare." };
  }

  const cancellazione = await haCancellazioneConfermata(userId);
  if (!cancellazione.ok) {
    return { ok: false, error: "Non riesco a verificare le richieste di cancellazione. Nessuna modifica fatta." };
  }
  if (cancellazione.attiva) return { ok: false, error: MSG_CANCELLAZIONE };

  // Ripristino dei soli profili elencati e ancora `pending`: quelli cambiati
  // nel frattempo (rifiutati, già riapprovati) non si toccano.
  if (sospensione.profili_nascosti.length > 0) {
    const { data: profili, error: erroreLettura } = await admin
      .from("artists")
      .select("id, status")
      .in("id", sospensione.profili_nascosti);
    if (erroreLettura) {
      logger.error(AREA, `lettura profili fallita: ${erroreLettura.message}`);
      return { ok: false, error: "Non riesco a leggere i profili da ripristinare. Nessuna modifica fatta." };
    }
    for (const p of (profili ?? []).filter((x) => x.status === "pending")) {
      const { error } = await admin
        .from("artists")
        .update({ status: "approved" })
        .eq("id", p.id)
        .eq("status", "pending");
      if (error) {
        logger.error(AREA, `profilo ${p.id} non ripristinato: ${error.message}`);
        return { ok: false, error: "Ripristino dei profili non riuscito. Puoi riprovare: l'operazione è ripetibile." };
      }
    }
  }

  const { error: erroreSblocco } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
    app_metadata: { ...(utente.app_metadata ?? {}), sospensione: null },
  });
  if (erroreSblocco) {
    logger.error(AREA, `sblocco fallito: ${erroreSblocco.message}`);
    return { ok: false, error: "Sblocco dell'accesso non riuscito. Puoi riprovare: l'operazione è ripetibile." };
  }

  const decisione = await registraDecisione({
    actorId: attoreId,
    targetType: "account",
    targetId: userId,
    affectedUserId: userId,
    action: "account_riattivato",
    reason: motivoPulito,
    notify: {
      decision: "Abbiamo riattivato il tuo account N'arte.",
      target: "Account N'arte",
      consequences: "Puoi accedere di nuovo e i tuoi profili tornano visibili sul sito.",
    },
  });
  if (!decisione.ok) {
    logger.error(AREA, `riattivazione eseguita ma decisione non registrata: ${decisione.error}`);
    return { ok: false, error: `Account riattivato, ma la decisione non è stata registrata: ${decisione.error}` };
  }
  return { ok: true, reference: decisione.reference, notified: decisione.notified };
}

export { leggiSospensione };
