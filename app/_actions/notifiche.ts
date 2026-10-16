"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

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

export async function segnaTutteLette(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false };
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", auth.user.id)
      .is("read_at", null);
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
