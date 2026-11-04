"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { resolveActiveArtist } from "@/lib/artist/current";

/**
 * Segna come lette le notifiche dell'utente. Usa il client utente: è la RLS
 * (0073) a garantire che si tocchino solo le proprie righe, e il grant di
 * colonna a garantire che si aggiorni solo `read_at`.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function segnaLetta(id: string): Promise<{ ok: boolean }> {
  if (typeof id !== "string" || !UUID_RE.test(id)) return { ok: false };
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false };
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .is("read_at", null);
    if (error) {
      logger.warn("notifiche", "segnaLetta:", error.message);
      return { ok: false };
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.error("notifiche", "segnaLetta:", err instanceof Error ? err.message : err);
    return { ok: false };
  }
}

/**
 * Segna come lette tutte le notifiche visibili. Nell'area artista sono solo
 * quelle del profilo attivo (piu' quelle senza profilo): le novita' degli
 * altri profili restano da leggere, come i loro badge nel selettore.
 */
export async function segnaTutteLette(area: "artist" | "organizer" | "admin" = "organizer"): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false };
    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", auth.user.id)
      .is("read_at", null);
    if (area === "artist") {
      const active = await resolveActiveArtist(auth.user.id);
      if (active) query = query.or(`artist_id.is.null,artist_id.eq.${active.id}`);
    }
    const { error } = await query;
    if (error) {
      logger.warn("notifiche", "segnaTutteLette:", error.message);
      return { ok: false };
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.error("notifiche", "segnaTutteLette:", err instanceof Error ? err.message : err);
    return { ok: false };
  }
}
