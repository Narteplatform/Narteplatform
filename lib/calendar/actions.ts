"use server";

import { createClient } from "@/lib/supabase/server";
import { linkCalendario, linkCalendarioProfilo, type EsitoLink } from "@/lib/calendar/feed";
import { resolveActiveArtist } from "@/lib/artist/current";

/**
 * Link iCal personale dell'utente collegato, creato al primo uso. Con
 * `rigenera` il vecchio link smette di funzionare (per chi l'ha condiviso per
 * errore). Artisti e organizzatori: il calendario contiene le date confermate
 * dell'account, qualunque sia il ruolo.
 */
export async function ottieniLinkCalendario(
  rigenera = false,
  ambito: "account" | "profilo" = "account",
): Promise<EsitoLink> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };
  // Area artista: un link per il profilo ATTIVO (verificato come posseduto
  // da resolveActiveArtist), cosi' ogni profilo ha il suo calendario.
  if (ambito === "profilo") {
    const attivo = await resolveActiveArtist(user.id);
    if (attivo) return linkCalendarioProfilo(user.id, attivo.id, rigenera === true);
  }
  return linkCalendario(user.id, rigenera === true);
}
