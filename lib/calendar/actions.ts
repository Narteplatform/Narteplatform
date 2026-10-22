"use server";

import { createClient } from "@/lib/supabase/server";
import { linkCalendario, type EsitoLink } from "@/lib/calendar/feed";

/**
 * Link iCal personale dell'utente collegato, creato al primo uso. Con
 * `rigenera` il vecchio link smette di funzionare (per chi l'ha condiviso per
 * errore). Artisti e organizzatori: il calendario contiene le date confermate
 * dell'account, qualunque sia il ruolo.
 */
export async function ottieniLinkCalendario(rigenera = false): Promise<EsitoLink> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };
  return linkCalendario(user.id, rigenera === true);
}
