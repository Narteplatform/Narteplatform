import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import type { EventoCalendario } from "@/lib/calendar/ics";

/**
 * Link iCal personale (migration 0074, tabella `calendar_feeds`).
 *
 * Il token nel link è l'unica protezione: chi lo conosce vede le date
 * confermate di quell'utente. Per questo è lungo (32 byte casuali), si legge
 * solo con la service role e si può rigenerare, invalidando il link vecchio.
 */

const AREA = "calendario";

/** 42P01/PGRST205: la tabella non c'è ancora (migration 0074 non applicata). */
function tabellaAssente(code: string | undefined): boolean {
  return code === "42P01" || code === "PGRST205";
}

function nuovoToken(): string {
  return randomBytes(32).toString("base64url");
}

export type LinkCalendario = {
  /** https://… — da incollare in «Aggiungi calendario › Da URL». */
  https: string;
  /** webcal://… — apre l'app Calendario (Apple, Outlook). */
  webcal: string;
  /** Apre Google Calendar con la richiesta di aggiungere il calendario. */
  google: string;
};

export type EsitoLink =
  | { ok: true; link: LinkCalendario }
  | { ok: false; error: string; nonDisponibile?: boolean };

function costruisciLink(token: string): LinkCalendario {
  const https = `${getSiteUrl()}/api/calendario/${token}`;
  const webcal = https.replace(/^https?:\/\//, "webcal://");
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  };
}

/** Il link dell'utente, creandolo alla prima richiesta. Con `rigenera` lo sostituisce. */
export async function linkCalendario(userId: string, rigenera = false): Promise<EsitoLink> {
  const admin = createAdminClient();

  if (!rigenera) {
    const { data, error } = await admin
      .from("calendar_feeds")
      .select("token")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      if (tabellaAssente(error.code)) {
        return { ok: false, nonDisponibile: true, error: "Il collegamento al calendario non è ancora attivo." };
      }
      logger.error(AREA, "lettura token:", error.message);
      return { ok: false, error: "Non riesco a leggere il tuo link. Riprova tra poco." };
    }
    if (data) return { ok: true, link: costruisciLink(data.token) };
  }

  const token = nuovoToken();
  const { error } = await admin
    .from("calendar_feeds")
    .upsert({ user_id: userId, token, created_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    if (tabellaAssente(error.code)) {
      return { ok: false, nonDisponibile: true, error: "Il collegamento al calendario non è ancora attivo." };
    }
    logger.error(AREA, "scrittura token:", error.message);
    return { ok: false, error: "Non riesco a creare il link. Riprova tra poco." };
  }
  return { ok: true, link: costruisciLink(token) };
}

export type Feed = { nome: string; eventi: EventoCalendario[] };

/**
 * Le date confermate del proprietario del token: come artista (tutti i suoi
 * profili) e/o come organizzatore. `null` = token sconosciuto.
 * Ogni errore di lettura è un errore, mai un calendario vuoto: un feed vuoto
 * farebbe sparire tutte le date dal calendario di chi lo ha collegato.
 */
export async function feedDaToken(token: string): Promise<Feed | null> {
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return null;
  const admin = createAdminClient();

  const { data: riga, error } = await admin
    .from("calendar_feeds")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(`calendar_feeds: ${error.message}`);
  if (!riga) return null;
  const userId = riga.user_id;

  const [artistiRes, orgRes] = await Promise.all([
    admin.from("artists").select("id, stage_name, slug").eq("user_id", userId),
    admin.from("organizers").select("id, display_name").eq("user_id", userId).maybeSingle(),
  ]);
  if (artistiRes.error) throw new Error(`artists: ${artistiRes.error.message}`);
  if (orgRes.error) throw new Error(`organizers: ${orgRes.error.message}`);
  const artisti = artistiRes.data ?? [];
  const org = orgRes.data;

  // Le date degli ultimi 400 giorni e tutte le future.
  const dal = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  const colonne = "id, event_date, time_slot, artist_id, organizer_id, venue_id";

  const [comeArtista, comeOrganizzatore] = await Promise.all([
    artisti.length > 0
      ? admin
          .from("booking_requests")
          .select(colonne)
          .in("artist_id", artisti.map((a) => a.id))
          .eq("status", "confermata")
          .gte("event_date", dal)
      : Promise.resolve({ data: [], error: null }),
    org
      ? admin
          .from("booking_requests")
          .select(colonne)
          .eq("organizer_id", org.id)
          .eq("status", "confermata")
          .gte("event_date", dal)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (comeArtista.error) throw new Error(`booking (artista): ${comeArtista.error.message}`);
  if (comeOrganizzatore.error) throw new Error(`booking (organizzatore): ${comeOrganizzatore.error.message}`);

  const prenotazioni = new Map<string, NonNullable<typeof comeArtista.data>[number]>();
  for (const b of [...(comeArtista.data ?? []), ...(comeOrganizzatore.data ?? [])]) prenotazioni.set(b.id, b);
  const righe = [...prenotazioni.values()];

  const artistIds = [...new Set(righe.map((b) => b.artist_id))];
  const venueIds = [...new Set(righe.map((b) => b.venue_id).filter((v): v is string => !!v))];
  const orgIds = [...new Set(righe.map((b) => b.organizer_id))];
  const [aRes, vRes, oRes] = await Promise.all([
    artistIds.length
      ? admin.from("artists").select("id, stage_name, slug").in("id", artistIds)
      : Promise.resolve({ data: [], error: null }),
    venueIds.length
      ? admin.from("venues").select("id, name, address, city").in("id", venueIds)
      : Promise.resolve({ data: [], error: null }),
    orgIds.length
      ? admin.from("organizers").select("id, display_name").in("id", orgIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (aRes.error || vRes.error || oRes.error) {
    throw new Error(`nomi: ${(aRes.error ?? vRes.error ?? oRes.error)?.message}`);
  }
  const nomiArtisti = new Map((aRes.data ?? []).map((a) => [a.id, a]));
  const strutture = new Map((vRes.data ?? []).map((v) => [v.id, v]));
  const nomiOrg = new Map((oRes.data ?? []).map((o) => [o.id, o.display_name]));
  const mieiArtisti = new Set(artisti.map((a) => a.id));
  const sito = getSiteUrl();

  const eventi: EventoCalendario[] = righe.map((b) => {
    const artista = nomiArtisti.get(b.artist_id);
    const struttura = b.venue_id ? strutture.get(b.venue_id) : undefined;
    const suono = mieiArtisti.has(b.artist_id);
    const dove = struttura?.name ?? nomiOrg.get(b.organizer_id) ?? null;
    return {
      uid: `booking-${b.id}@narte`,
      data: b.event_date,
      fascia: b.time_slot,
      titolo: suono
        ? `${artisti.length > 1 ? `${artista?.stage_name ?? "Live"}: ` : ""}live${dove ? ` @ ${dove}` : ""}`
        : `${artista?.stage_name ?? "Artista"} live${struttura ? ` @ ${struttura.name}` : ""}`,
      luogo: struttura ? [struttura.name, struttura.address, struttura.city].filter(Boolean).join(", ") : null,
      descrizione: "Data confermata su N'arte.",
      url: suono ? `${sito}/dashboard/calendario` : `${sito}/organizzatore/richieste/${b.id}`,
    };
  });

  const nome =
    artisti.length === 1 && !org
      ? `N'arte · ${artisti[0].stage_name}`
      : org && artisti.length === 0
      ? `N'arte · ${org.display_name ?? "Le mie date"}`
      : "N'arte · Le mie date";
  return { nome, eventi };
}
