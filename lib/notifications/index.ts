import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { NotificaItem } from "@/lib/notifications/types";

export type { NotificaItem, NotificheIniziali } from "@/lib/notifications/types";

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

export async function leggiNonLette(
  userId: string,
  limit = 20
): Promise<{ items: NotificaItem[]; count: number; disponibile: boolean }> {
  const vuoto = { items: [], count: 0, disponibile: false };
  try {
    const admin = createAdminClient();
    const { data, error, count } = await admin
      .from("notifications")
      .select("id, kind, title, body, href, created_at", { count: "exact" })
      .eq("user_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (tabellaMancante(error)) segnalaTabellaMancante();
      else logger.error("notifiche", "lettura fallita:", error.message);
      return vuoto;
    }
    const items = data ?? [];
    return { items, count: count ?? items.length, disponibile: true };
  } catch (err) {
    logger.error("notifiche", "leggiNonLette:", err instanceof Error ? err.message : err);
    return vuoto;
  }
}
