import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { linkNotifica, type NotificaItem } from "@/lib/notifications/types";

export type { NotificaItem, NotificheIniziali, AreaNotifiche } from "@/lib/notifications/types";
export { linkNotifica } from "@/lib/notifications/types";

/**
 * Notifiche in-app (migration 0073).
 *
 * TUTTO QUI È BEST-EFFORT. Una notifica è un di più: se non si riesce a
 * scriverla o a leggerla, il flusso che l'ha generata (una richiesta di
 * booking, un'approvazione) deve proseguire identico. Nessuna funzione di
 * scrittura lancia mai.
 *
 * RILASCIO. Il codice va online PRIMA della migration: finché la tabella non
 * esiste (42P01 / PGRST205) le scritture sono no-op e la lettura dà
 * «non disponibile», con la campanella semplicemente vuota.
 */

export type NotificaInput = {
  userId: string;
  artistId?: string | null;
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
};

let tabellaMancanteSegnalata = false;

function tabellaMancante(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function segnalaTabellaMancante(): void {
  if (tabellaMancanteSegnalata) return;
  tabellaMancanteSegnalata = true;
  logger.warn("notifiche", "tabella notifications assente: migration 0073 non applicata");
}

export async function creaNotifica(input: NotificaInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({
      user_id: input.userId,
      artist_id: input.artistId ?? null,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    });
    if (error) {
      if (tabellaMancante(error)) segnalaTabellaMancante();
      else logger.error("notifiche", "scrittura fallita:", error.message);
    }
  } catch (err) {
    logger.error("notifiche", "creaNotifica:", err instanceof Error ? err.message : err);
  }
}

/** Notifica il proprietario del profilo artista (artists.user_id). */
export async function creaNotifichePerArtista(
  artistId: string,
  input: Omit<NotificaInput, "userId" | "artistId">
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("artists")
      .select("user_id")
      .eq("id", artistId)
      .maybeSingle();
    if (error) {
      logger.error("notifiche", "proprietario del profilo non letto:", error.message);
      return;
    }
    if (!data?.user_id) return;
    await creaNotifica({ ...input, userId: data.user_id, artistId });
  } catch (err) {
    logger.error("notifiche", "creaNotifichePerArtista:", err instanceof Error ? err.message : err);
  }
}

/** Notifica l'organizzatore (organizers.id → user_id). */
export async function creaNotifichePerOrganizzatore(
  organizerId: string,
  input: Omit<NotificaInput, "userId" | "artistId">
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizers")
      .select("user_id")
      .eq("id", organizerId)
      .maybeSingle();
    if (error) {
      logger.error("notifiche", "utente dell'organizzatore non letto:", error.message);
      return;
    }
    if (!data?.user_id) return;
    await creaNotifica({ ...input, userId: data.user_id });
  } catch (err) {
    logger.error("notifiche", "creaNotifichePerOrganizzatore:", err instanceof Error ? err.message : err);
  }
}

/** Le notifiche lette restano visibili (in trasparenza) per 30 giorni. */
export const GIORNI_LETTE_VISIBILI = 30;

/** Colonna assente: migration 0076 non ancora applicata. */
function colonnaMancante(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

const COLONNE = "id, kind, title, body, href, artist_id, created_at, read_at";

/**
 * Notifiche dell'utente: tutte le non lette e le lette degli ultimi 30 giorni.
 *
 * Con `artistId` (area artista) solo quelle del profilo attivo e quelle
 * dell'account senza profilo (artist_id null): ogni profilo ha le sue. Le
 * novita' degli altri profili si vedono nel selettore profilo (contaNonLettePerProfilo).
 */
export async function leggiNotifiche(
  userId: string,
  opts: { artistId?: string | null; limit?: number } = {},
): Promise<{ items: NotificaItem[]; count: number; disponibile: boolean }> {
  const vuoto = { items: [], count: 0, disponibile: false };
  const limit = opts.limit ?? 30;
  try {
    const admin = createAdminClient();
    const dal = new Date(Date.now() - GIORNI_LETTE_VISIBILI * 86_400_000).toISOString();

    let lista = admin
      .from("notifications")
      .select(COLONNE)
      .eq("user_id", userId)
      .or(`read_at.is.null,read_at.gte."${dal}"`)
      .order("created_at", { ascending: false })
      .limit(limit);
    let nonLette = admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (opts.artistId) {
      const perProfilo = `artist_id.is.null,artist_id.eq.${opts.artistId}`;
      lista = lista.or(perProfilo);
      nonLette = nonLette.or(perProfilo);
    }

    const [{ data, error }, { count, error: errCount }] = await Promise.all([lista, nonLette]);
    if (error || errCount) {
      const e = error ?? errCount;
      if (tabellaMancante(e)) segnalaTabellaMancante();
      else logger.error("notifiche", "lettura fallita:", e?.message);
      return vuoto;
    }
    const items = ((data ?? []) as Omit<NotificaItem, "link">[]).map((n) => ({
      ...n,
      link: linkNotifica(n, opts.artistId),
    }));
    return { items, count: count ?? 0, disponibile: true };
  } catch (err) {
    logger.error("notifiche", "leggiNotifiche:", err instanceof Error ? err.message : err);
    return vuoto;
  }
}

/**
 * Notifiche non lette per profilo artista dell'account (badge del selettore).
 * `null` = non leggibili (tabella mancante o errore): il chiamante ripiega.
 */
export async function contaNonLettePerProfilo(userId: string): Promise<Record<string, number> | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notifications")
      .select("artist_id")
      .eq("user_id", userId)
      .is("read_at", null)
      .not("artist_id", "is", null)
      .limit(500);
    if (error) {
      if (tabellaMancante(error)) segnalaTabellaMancante();
      else logger.error("notifiche", "conteggio per profilo:", error.message);
      return null;
    }
    const out: Record<string, number> = {};
    for (const r of (data ?? []) as { artist_id: string }[]) out[r.artist_id] = (out[r.artist_id] ?? 0) + 1;
    return out;
  } catch (err) {
    logger.error("notifiche", "contaNonLettePerProfilo:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Notifica raggruppata per chiave (es. una per conversazione): se c'e' gia'
 * una notifica NON letta con la stessa `refKey` la si aggiorna (testo e ora)
 * invece di aggiungerne un'altra. Senza la colonna ref_key (0076 non
 * applicata) si ricade su una notifica normale.
 */
export async function creaNotificaRaggruppata(
  input: NotificaInput & { refKey: string },
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: esistente, error } = await admin
      .from("notifications")
      .select("id, kind")
      .eq("user_id", input.userId)
      .eq("ref_key", input.refKey)
      .is("read_at", null)
      .maybeSingle();
    if (error) {
      if (colonnaMancante(error)) return creaNotifica(input);
      if (tabellaMancante(error)) return segnalaTabellaMancante();
      logger.error("notifiche", "lettura raggruppata:", error.message);
      return;
    }

    if (esistente) {
      // Si aggiornano testo e ora: la notifica risale in cima alla lista.
      const { error: errUpd } = await admin
        .from("notifications")
        .update({
          title: input.title,
          body: input.body ?? null,
          href: input.href ?? null,
          created_at: new Date().toISOString(),
        })
        .eq("id", esistente.id)
        .is("read_at", null);
      if (errUpd) logger.error("notifiche", "aggiornamento raggruppata:", errUpd.message);
      return;
    }

    const { error: errIns } = await admin.from("notifications").insert({
      user_id: input.userId,
      artist_id: input.artistId ?? null,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      ref_key: input.refKey,
    });
    // 23505: inserita in parallelo da un'altra richiesta, va bene cosi'.
    if (errIns && errIns.code !== "23505") {
      if (colonnaMancante(errIns)) return creaNotifica(input);
      logger.error("notifiche", "scrittura raggruppata:", errIns.message);
    }
  } catch (err) {
    logger.error("notifiche", "creaNotificaRaggruppata:", err instanceof Error ? err.message : err);
  }
}

/**
 * Notifica a tutti i superadmin (campanella e toast in /admin, in tempo reale).
 * Le email al team restano a parte (dispatchEmail + adminRecipients): questa
 * e' la sola notifica in-app.
 */
export async function creaNotificheAdmin(
  input: Omit<NotificaInput, "userId" | "artistId"> & { refKey?: string },
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("profiles").select("id").eq("role", "superadmin").limit(20);
    if (error) {
      logger.error("notifiche", "lettura superadmin:", error.message);
      return;
    }
    const ids = ((data ?? []) as { id: string }[]).map((p) => p.id);
    await Promise.all(
      ids.map((userId) =>
        input.refKey
          ? creaNotificaRaggruppata({ ...input, userId, refKey: input.refKey })
          : creaNotifica({ ...input, userId }),
      ),
    );
  } catch (err) {
    logger.error("notifiche", "creaNotificheAdmin:", err instanceof Error ? err.message : err);
  }
}
