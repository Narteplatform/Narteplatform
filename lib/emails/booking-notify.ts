import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
import {
  bookingStatusLabel,
  formatDateIt,
  formatEuro,
  organizerRoleLabel,
  toPlainText,
} from "@/lib/emails/format";
import type { BookingStatusParams } from "@/lib/brevo/registry";

/**
 * Notifiche di stato di una richiesta di booking, nel formato dei template
 * Brevo.
 *
 * Sta separato da `lib/emails/send.ts` perché carica più dati di quanti
 * servissero ai vecchi template Resend: i design chiedono indirizzo, città,
 * ruolo dell'organizzatore e cachet, che la vecchia query non leggeva.
 */

/**
 * Carica il contesto completo di una richiesta.
 *
 * Ogni lettura controlla il proprio `error` e in caso di problema esce con
 * `null`: derivare un invio da una query fallita significa mandare un'email
 * con i campi vuoti alla persona sbagliata.
 */
async function loadContext(requestId: string) {
  const admin = createAdminClient();

  const { data: req, error: reqError } = await admin
    .from("booking_requests")
    .select(
      "id, event_date, time_slot, budget_offer, final_price, message, status, notes_artist, cancellation_reason, artist_id, organizer_id, venue_id"
    )
    .eq("id", requestId)
    .maybeSingle();
  if (reqError || !req) {
    console.error("[booking-notify] richiesta non leggibile", reqError);
    return null;
  }

  const [artistRes, organizerRes, venueRes] = await Promise.all([
    admin.from("artists").select("stage_name, user_id").eq("id", req.artist_id).maybeSingle(),
    admin
      .from("organizers")
      .select("display_name, user_id, is_private")
      .eq("id", req.organizer_id)
      .maybeSingle(),
    req.venue_id
      ? admin.from("venues").select("name, city, address").eq("id", req.venue_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (artistRes.error || organizerRes.error) {
    console.error("[booking-notify] artista o organizzatore non leggibili", {
      artist: artistRes.error,
      organizer: organizerRes.error,
    });
    return null;
  }

  const artist = artistRes.data;
  const organizer = organizerRes.data;
  const venue = venueRes.data;

  // Il referente è il nome sul profilo dell'utente organizzatore, che può
  // essere diverso dal nome del locale ("Duel Club" / "Marco Esposito").
  const { data: contactProfile } = organizer?.user_id
    ? await admin.from("profiles").select("full_name").eq("id", organizer.user_id).maybeSingle()
    : { data: null };

  const artistAccount = artist?.user_id
    ? await admin.auth.admin.getUserById(artist.user_id)
    : null;
  const organizerAccount = organizer?.user_id
    ? await admin.auth.admin.getUserById(organizer.user_id)
    : null;

  const base = getSiteUrl();

  const params: BookingStatusParams = {
    artistName: artist?.stage_name ?? "",
    organizerName: venue?.name ?? organizer?.display_name ?? "",
    contactName: contactProfile?.full_name ?? organizer?.display_name ?? "",
    roleLabel: organizerRoleLabel(organizer?.is_private),
    eventDate: formatDateIt(req.event_date),
    // `time_slot` è testo libero: contiene già "22:00 – 01:00" o simili.
    eventTime: req.time_slot ?? "",
    // Non esistono ancora colonne per questi campi (vedi lib/brevo/registry.ts).
    soundcheck: "",
    eventType: "",
    city: venue?.city ?? "",
    address: venue?.address ?? "",
    priceLabel: formatEuro(req.final_price ?? req.budget_offer),
    durationLabel: "",
    statusLabel: bookingStatusLabel(req.status),
    message: "",
    chatUrl: "",
    bookingUrl: "",
  };

  return {
    params,
    base,
    notesArtist: toPlainText(req.notes_artist),
    cancellationReason: toPlainText(req.cancellation_reason),
    artistEmail: artistAccount?.data?.user?.email ?? null,
    organizerEmail: organizerAccount?.data?.user?.email ?? null,
  };
}

/**
 * Richiesta annullata dall'organizzatore → all'artista.
 *
 * Finora questa email non esisteva: l'artista vedeva la data tornare libera
 * in calendario senza sapere perché, o peggio la teneva bloccata credendola
 * ancora valida.
 */
export async function sendBookingCancelledByOrganizerEmail(requestId: string) {
  const ctx = await loadContext(requestId);
  if (!ctx?.artistEmail) return { ok: false as const };

  return dispatchEmail({
    key: "booking_cancelled_organizer",
    to: ctx.artistEmail,
    params: {
      ...ctx.params,
      message: ctx.cancellationReason,
      chatUrl: `${ctx.base}/dashboard/chat`,
      bookingUrl: `${ctx.base}/dashboard/richieste`,
    },
    subjectPreview: `Richiesta annullata: ${ctx.params.organizerName} · ${ctx.params.eventDate}`,
  });
}
