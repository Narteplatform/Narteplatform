import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { nascondiProfiliEBloccaAccesso } from "@/lib/legal/cancellazione";
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

type DatiSospensione = {
  sospeso_il: string;
  motivo: string;
  profili_nascosti: string[];
  attore: string;
};

function leggiSospensione(appMetadata: unknown): DatiSospensione | null {
  if (!appMetadata || typeof appMetadata !== "object") return null;
  const s = (appMetadata as Record<string, unknown>).sospensione;
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  const nascosti = Array.isArray(o.profili_nascosti)
    ? o.profili_nascosti.filter((x): x is string => typeof x === "string")
    : [];
  return {
    sospeso_il: typeof o.sospeso_il === "string" ? o.sospeso_il : "",
    motivo: typeof o.motivo === "string" ? o.motivo : "",
    profili_nascosti: nascosti,
    attore: typeof o.attore === "string" ? o.attore : "",
  };
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
    return { ok: false, error: "L'account risulta già sospeso." };
  }

  const esito = await nascondiProfiliEBloccaAccesso(userId, AREA);
  if (!esito.ok) {
    if (esito.nascosti.length > 0) {
      // Stato a metà: alcuni profili già nascosti. Va detto forte, con gli id,
      // perché senza registro nessuno saprebbe cosa ripristinare.
      logger.error(
        AREA,
        `SOSPENSIONE INCOMPLETA — utente=${userId} profili già nascosti: ${esito.nascosti.join(", ")}`
      );
    }
    return { ok: false, error: "Sospensione non riuscita. Controlla i log del server prima di riprovare." };
  }

  const dati: DatiSospensione = {
    sospeso_il: new Date().toISOString(),
    motivo: motivoPulito,
    profili_nascosti: esito.nascosti,
    attore: attoreId,
  };
  const appMetadata = { ...(utente.app_metadata ?? {}), sospensione: dati as unknown as Json };
  const { error: erroreMeta } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: appMetadata,
  });
  if (erroreMeta) {
    logger.error(
      AREA,
      `ACCOUNT BLOCCATO MA STATO NON SALVATO — utente=${userId} profili nascosti: ` +
        `${esito.nascosti.join(", ") || "nessuno"}: ${erroreMeta.message}`
    );
    return {
      ok: false,
      error: "Account bloccato ma stato precedente non salvato: segnalalo a chi gestisce il sito prima di riattivare.",
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
