import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { registraDecisione, MOTIVAZIONE_MIN, type ComunicazioneDecisione } from "@/lib/moderation/decisioni";
import { logger } from "@/lib/logger";

/**
 * Moderazione delle recensioni: logica condivisa dalle Server Action e dalle
 * funzioni chiamate dal server (es. annullamento di una data).
 *
 * Sta in un modulo `server-only` e NON in `_actions.ts` di proposito: ogni
 * funzione esportata da un file `"use server"` diventa un endpoint richiamabile
 * dal browser. `nascondiRecensioniDiBookingAnnullato` prende `actorId` come
 * parametro: esposta come Server Action, chiunque potrebbe firmare una
 * moderazione a nome di un altro.
 *
 * COMPATIBILITÀ CON LA MIGRATION 0066. Le colonne di moderazione
 * (`deleted_at`, `moderation_reason`, ...) esistono solo dopo la 0066. Finché
 * mancano (42703 / PGRST204) si ricade sul comportamento minimo: si agisce solo
 * su `hidden` — MAI con la DELETE fisica, che libererebbe il vincolo unique e
 * permetterebbe di recensire di nuovo la stessa data — e la decisione viene
 * comunque registrata e comunicata.
 */

export type EsitoModerazione = { ok: true } | { ok: false; error: string };

export type AzioneModerazione = "nascondi" | "ripristina" | "elimina";

type ErroreDb = { code?: string | null; message?: string | null } | null | undefined;

/** True se l'errore dice che una colonna (non ancora migrata) non esiste. */
export function colonnaMancante(error: ErroreDb): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /column .* does not exist|could not find the .* column/i.test(error.message ?? "");
}

/**
 * Rigenera la pagina pubblica dell'artista. Non solleva mai: è
 * un'ottimizzazione di visualizzazione, l'azione precedente è già andata a
 * buon fine.
 */
export async function revalidateArtistProfile(artistId: string | null | undefined) {
  if (!artistId) return;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("artists").select("slug").eq("id", artistId).maybeSingle();
    if (data?.slug) revalidatePath(`/artisti/${data.slug}`);
  } catch {
    // ignorata di proposito
  }
}

type RigaFeedback = {
  id: string;
  hidden: boolean;
  artist_id: string;
  organizer_id: string;
  rating: number;
  deleted_at: string | null;
};

const TESTI: Record<
  AzioneModerazione,
  { action: string; autore: (a: string) => string; artista: string; effetti: string }
> = {
  nascondi: {
    action: "recensione_nascosta",
    autore: (a) =>
      `abbiamo nascosto la recensione che hai scritto su ${a}: non è più visibile e non conta nella media.`,
    artista: "abbiamo nascosto una recensione ricevuta dal tuo profilo: non è più visibile e non conta nella media.",
    effetti: "La recensione resta conservata e può essere ripristinata se la decisione viene riesaminata.",
  },
  ripristina: {
    action: "recensione_ripristinata",
    autore: (a) => `abbiamo ripristinato la recensione che hai scritto su ${a}: torna visibile.`,
    artista: "abbiamo ripristinato una recensione ricevuta dal tuo profilo: torna visibile e conta nella media.",
    effetti: "La recensione è di nuovo visibile dove il piano dell'artista prevede le recensioni.",
  },
  elimina: {
    action: "recensione_eliminata",
    autore: (a) => `abbiamo eliminato la recensione che hai scritto su ${a}.`,
    artista: "abbiamo eliminato una recensione ricevuta dal tuo profilo.",
    effetti:
      "La recensione non è più visibile. Resta in archivio e la stessa data non può essere recensita di nuovo.",
  },
};

export async function applicaModerazione(input: {
  feedbackId: string;
  azione: AzioneModerazione;
  reason: string;
  actorId: string;
}): Promise<EsitoModerazione> {
  const reason = input.reason.trim();
  if (reason.length < MOTIVAZIONE_MIN) {
    return { ok: false, error: `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.` };
  }
  const admin = createAdminClient();

  // Lettura con la colonna nuova; se manca, si ripete senza.
  let fb: RigaFeedback | null = null;
  const piena = await admin
    .from("feedback")
    .select("id, hidden, artist_id, organizer_id, rating, deleted_at")
    .eq("id", input.feedbackId)
    .maybeSingle();
  if (piena.error && colonnaMancante(piena.error)) {
    const base = await admin
      .from("feedback")
      .select("id, hidden, artist_id, organizer_id, rating")
      .eq("id", input.feedbackId)
      .maybeSingle();
    if (base.error) return { ok: false, error: base.error.message };
    fb = base.data ? { ...base.data, deleted_at: null } : null;
  } else if (piena.error) {
    return { ok: false, error: piena.error.message };
  } else {
    fb = piena.data as RigaFeedback | null;
  }
  if (!fb) return { ok: false, error: "Recensione non trovata" };

  if (fb.deleted_at) return { ok: false, error: "La recensione è già stata eliminata." };
  if (input.azione === "nascondi" && fb.hidden) {
    return { ok: false, error: "La recensione è già nascosta." };
  }
  if (input.azione === "ripristina" && !fb.hidden) {
    return { ok: false, error: "La recensione è già visibile." };
  }

  const now = new Date().toISOString();
  const nascosta = input.azione !== "ripristina";
  const meta = {
    moderation_reason: reason,
    moderated_by: input.actorId,
    moderated_at: now,
  };
  const pieno =
    input.azione === "elimina"
      ? { hidden: true, deleted_at: now, ...meta }
      : { hidden: nascosta, ...meta };

  const upd = await admin.from("feedback").update(pieno).eq("id", fb.id);
  if (upd.error) {
    if (!colonnaMancante(upd.error)) return { ok: false, error: upd.error.message };
    logger.warn(
      "feedback",
      "colonne di moderazione assenti (migration 0066 non applicata): agisco solo su hidden."
    );
    const minimo = await admin.from("feedback").update({ hidden: nascosta }).eq("id", fb.id);
    if (minimo.error) return { ok: false, error: minimo.error.message };
  }

  // Destinatari: autore (organizzatore) e artista.
  const [orgRes, artRes] = await Promise.all([
    admin.from("organizers").select("user_id").eq("id", fb.organizer_id).maybeSingle(),
    admin.from("artists").select("user_id, stage_name").eq("id", fb.artist_id).maybeSingle(),
  ]);
  if (orgRes.error) logger.warn("feedback", "organizzatore non leggibile:", orgRes.error.message);
  if (artRes.error) logger.warn("feedback", "artista non leggibile:", artRes.error.message);
  const nomeArtista = artRes.data?.stage_name ?? "l'artista";
  const testi = TESTI[input.azione];
  const target = `Recensione su «${nomeArtista}» (voto ${fb.rating}/5)`;

  const comunicazione = (decision: string): ComunicazioneDecisione => ({
    decision,
    target,
    consequences: testi.effetti,
  });

  const esiti = await Promise.all([
    registraDecisione({
      actorId: input.actorId,
      targetType: "recensione",
      targetId: fb.id,
      action: testi.action,
      reason,
      affectedUserId: orgRes.data?.user_id ?? null,
      notify: comunicazione(testi.autore(nomeArtista)),
    }),
    registraDecisione({
      actorId: input.actorId,
      targetType: "recensione",
      targetId: fb.id,
      action: testi.action,
      reason,
      affectedUserId: artRes.data?.user_id ?? null,
      notify: comunicazione(testi.artista),
    }),
  ]);
  for (const e of esiti) {
    if (!e.ok) logger.warn("feedback", "decisione non registrata:", e.error);
  }

  revalidatePath("/admin/recensioni");
  revalidatePath("/admin/feedback");
  revalidatePath("/dashboard/feedback");
  revalidatePath("/organizzatore/feedback");
  await revalidateArtistProfile(fb.artist_id);
  return { ok: true };
}

/**
 * Oscura la recensione collegata a una Data confermata che viene ANNULLATA.
 *
 * Il Regolamento (doc. 05) non ammette recensioni su date non più confermate:
 * se l'admin annulla una data già recensita, la recensione va nascosta con
 * motivazione e comunicata a entrambe le parti. La recensione resta in archivio
 * (oscuramento, non eliminazione).
 *
 * DA COLLEGARE: chiamare da `cancelConfirmedBooking`
 * (app/(admin)/admin/artisti/_actions.ts) dopo l'annullamento riuscito.
 * Non solleva: in caso di problema restituisce `{ ok: false }` e il chiamante
 * decide se segnalarlo; l'annullamento della data non deve fallire per questo.
 *
 * @param bookingId id della richiesta di booking annullata
 * @param actorId   id dell'admin che ha annullato (finisce nel registro)
 * @param motivo    motivazione (almeno 10 caratteri); se vuota o troppo breve
 *                  si usa un testo standard che cita l'annullamento
 * @returns numero di recensioni oscurate (0 o 1: c'è un'unica recensione per data)
 */
export async function nascondiRecensioniDiBookingAnnullato(
  bookingId: string,
  actorId: string,
  motivo: string
): Promise<{ ok: true; nascoste: number } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("feedback")
      .select("id, hidden")
      .eq("booking_request_id", bookingId);
    if (error) return { ok: false, error: error.message };
    const daNascondere = (data ?? []).filter((f) => !f.hidden);
    if (daNascondere.length === 0) return { ok: true, nascoste: 0 };

    const testo =
      motivo.trim().length >= MOTIVAZIONE_MIN
        ? motivo.trim()
        : "La data a cui la recensione si riferisce è stata annullata: la recensione non è più riferibile a una data confermata (Regolamento delle recensioni, art. 2).";

    let nascoste = 0;
    for (const f of daNascondere) {
      const r = await applicaModerazione({
        feedbackId: f.id,
        azione: "nascondi",
        reason: testo,
        actorId,
      });
      if (r.ok) nascoste += 1;
      else logger.warn("feedback", "recensione di data annullata non oscurata:", r.error);
    }
    return { ok: true, nascoste };
  } catch (err) {
    logger.warn("feedback", "nascondiRecensioniDiBookingAnnullato fallita:", String(err));
    return { ok: false, error: "Oscuramento delle recensioni non riuscito." };
  }
}
