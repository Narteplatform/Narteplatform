import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { registraAzione, registraDecisione } from "@/lib/moderation/decisioni";
import { sospendiAccount } from "@/lib/admin/sospensione";
import { chiudiAccountDalTeam } from "@/lib/admin/chiusura";
import { logger } from "@/lib/logger";

/**
 * Preavviso di 30 giorni per sospensione e chiusura degli artisti con partita
 * IVA (art. 4 Reg. UE 2019/1150, «P2B»; parere legale di novembre 2026).
 *
 * Il P2B tutela gli utenti commerciali: per N'arte sono gli ARTISTI che
 * operano come professionisti. Si riconoscono dal consenso `clausole_specifiche`
 * (artt. 1341-1342 c.c.), che solo chi dichiara la partita IVA presta, al
 * checkout o nell'accettazione delle condizioni. Organizzatori e artisti
 * consumatori: nessun preavviso, come prima.
 *
 * Eccezione: violazione grave o obbligo di legge (art. 4, par. 4). La sceglie
 * il membro del Team, con la motivazione, e la misura è immediata.
 */

export const GIORNI_PREAVVISO_P2B = 30;

export type TipoMisura = "sospensione" | "chiusura";

function tabellaMancante(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

const MSG_MIGRATION =
  "Per programmare la misura con preavviso serve la migration 0077. Applicala dal SQL editor, oppure, se si tratta di una violazione grave o di un obbligo di legge, scegli l'effetto immediato.";

/**
 * Vero se l'account è di un artista professionista. Una lettura fallita NON
 * si traduce in «no»: si restituisce errore e chi chiama non procede.
 */
export async function eArtistaProfessionista(
  userId: string,
): Promise<{ ok: true; professionista: boolean } | { ok: false }> {
  const admin = createAdminClient();
  const [profilo, consensi] = await Promise.all([
    admin.from("profiles").select("role").eq("id", userId).maybeSingle(),
    admin
      .from("user_consents")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "clausole_specifiche")
      .eq("accepted", true)
      .limit(1),
  ]);
  if (profilo.error || consensi.error) {
    logger.error("preavviso", "lettura fallita:", profilo.error?.message ?? consensi.error?.message);
    return { ok: false };
  }
  const artista = profilo.data?.role === "artist";
  return { ok: true, professionista: artista && (consensi.data ?? []).length > 0 };
}

/** Misura in attesa per l'account, se c'è. */
export async function misuraInAttesa(
  userId: string,
): Promise<{ ok: true; misura: { id: string; tipo: TipoMisura; efficace_dal: string } | null } | { ok: false }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("misure_programmate")
    .select("id, tipo, efficace_dal")
    .eq("user_id", userId)
    .is("eseguita_il", null)
    .is("annullata_il", null)
    .maybeSingle();
  if (error) {
    if (tabellaMancante(error)) return { ok: true, misura: null };
    logger.error("preavviso", "misura in attesa non letta:", error.message);
    return { ok: false };
  }
  return { ok: true, misura: data };
}

const dataIt = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Rome" });

/**
 * Programma la misura fra 30 giorni e comunica il preavviso motivato, con il
 * collegamento per il reclamo. Nessun effetto immediato sull'account.
 */
export async function programmaMisura(input: {
  userId: string;
  tipo: TipoMisura;
  motivo: string;
  attoreId: string;
}): Promise<{ ok: true; notified: boolean; efficaceDal: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const efficaceDal = new Date(Date.now() + GIORNI_PREAVVISO_P2B * 86_400_000).toISOString();

  const { data: riga, error } = await admin
    .from("misure_programmate")
    .insert({
      user_id: input.userId,
      tipo: input.tipo,
      motivo: input.motivo,
      efficace_dal: efficaceDal,
      creata_da: input.attoreId,
    })
    .select("id")
    .single();
  if (error || !riga) {
    if (tabellaMancante(error)) return { ok: false, error: MSG_MIGRATION };
    if (error?.code === "23505") return { ok: false, error: "Per questo account c'è già una misura programmata." };
    logger.error("preavviso", "misura non programmata:", error?.message);
    return { ok: false, error: "Non sono riuscito a programmare la misura. Nessuna modifica fatta." };
  }

  const nome = input.tipo === "sospensione" ? "sospensione" : "chiusura";
  const esito = await registraDecisione({
    actorId: input.attoreId,
    targetType: "account",
    targetId: input.userId,
    affectedUserId: input.userId,
    action: `${nome}_programmata`,
    reason: input.motivo,
    notify: {
      decision: `Con un preavviso di ${GIORNI_PREAVVISO_P2B} giorni ti comunichiamo che dal ${dataIt(efficaceDal)} il tuo account N'arte sarà ${input.tipo === "sospensione" ? "sospeso" : "chiuso"}.`,
      target: "Account N'arte",
      consequences:
        input.tipo === "sospensione"
          ? "Fino a quella data l'account resta attivo. Dalla data indicata l'accesso sarà bloccato e i profili non saranno più visibili."
          : "Fino a quella data l'account resta attivo. Dalla data indicata l'accesso sarà bloccato, i profili non saranno più visibili e l'abbonamento sarà disdetto a fine periodo; i dati saranno cancellati dopo altri 30 giorni.",
      contestable: true,
    },
  });
  if (!esito.ok) {
    // Senza preavviso comunicato la misura non può partire: si annulla.
    await admin.from("misure_programmate").update({ annullata_il: new Date().toISOString(), esito: "preavviso non registrato" }).eq("id", riga.id);
    return { ok: false, error: `Preavviso non registrato: ${esito.error} Nessuna misura programmata.` };
  }
  await admin.from("misure_programmate").update({ riferimento: esito.reference }).eq("id", riga.id);
  return { ok: true, notified: esito.notified, efficaceDal };
}

/** Annulla la misura in attesa (es. dopo un reclamo accolto). */
export async function annullaMisura(input: {
  userId: string;
  motivo: string;
  attoreId: string;
}): Promise<{ ok: true; annullate: number } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("misure_programmate")
    .update({ annullata_il: new Date().toISOString(), annullata_da: input.attoreId, esito: input.motivo.slice(0, 500) })
    .eq("user_id", input.userId)
    .is("eseguita_il", null)
    .is("annullata_il", null)
    .select("id");
  if (error) {
    if (tabellaMancante(error)) return { ok: true, annullate: 0 };
    return { ok: false, error: "Non riesco ad annullare la misura programmata. Riprova." };
  }
  const annullate = data?.length ?? 0;
  if (annullate > 0) {
    await registraAzione({
      actorId: input.attoreId,
      targetType: "account",
      targetId: input.userId,
      affectedUserId: input.userId,
      action: "misura_programmata_annullata",
      descrizione: input.motivo,
    });
  }
  return { ok: true, annullate };
}

/**
 * Esegue le misure arrivate a scadenza. Chiamata dal cron giornaliero.
 * Le misure sono reversibili (sospensione e chiusura si annullano dal
 * pannello), quindi non serve un interruttore di sola conta.
 */
export async function eseguiMisureScadute(): Promise<{ ok: true; esiti: string[] } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("misure_programmate")
    .select("id, user_id, tipo, motivo, creata_da")
    .is("eseguita_il", null)
    .is("annullata_il", null)
    .lte("efficace_dal", new Date().toISOString())
    .limit(20);
  if (error) {
    if (tabellaMancante(error)) return { ok: true, esiti: [] };
    return { ok: false, error: error.message };
  }

  const esiti: string[] = [];
  for (const m of data ?? []) {
    if (!m.creata_da) {
      esiti.push(`Misura ${m.id}: autore non più presente, non eseguita. Da verificare a mano.`);
      continue;
    }
    const args = { userId: m.user_id, motivo: m.motivo, attoreId: m.creata_da };
    const r = m.tipo === "sospensione" ? await sospendiAccount(args) : await chiudiAccountDalTeam(args);
    const { error: upErr } = await admin
      .from("misure_programmate")
      .update(r.ok ? { eseguita_il: new Date().toISOString(), esito: "eseguita" } : { esito: `errore: ${r.error}`.slice(0, 500) })
      .eq("id", m.id);
    if (upErr) logger.error("preavviso", `misura ${m.id} non aggiornata:`, upErr.message);
    esiti.push(r.ok ? `Eseguita: ${m.tipo} dell'account ${m.user_id}.` : `ERRORE ${m.tipo} dell'account ${m.user_id}: ${r.error}`);
  }
  return { ok: true, esiti };
}
