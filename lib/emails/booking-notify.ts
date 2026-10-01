import "server-only";

import { createElement } from "react";

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
import BookingStatusEmail from "@/lib/emails/templates/BookingStatusEmail";

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
    requestId,
    artistId: req.artist_id,
    // Dati grezzi per il componente React di ripiego (identico a prima).
    raw: {
      artistName: artist?.stage_name ?? "Artista",
      organizerName: organizer?.display_name ?? "",
      venueName: venue?.name ?? null,
      eventDate: req.event_date,
      notesArtist: req.notes_artist,
    },
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
      bookingUrl: `${ctx.base}/dashboard/leads`,
    },
    subjectPreview: `Richiesta annullata: ${ctx.params.organizerName} · ${ctx.params.eventDate}`,
  });
}

type BookingContext = NonNullable<Awaited<ReturnType<typeof loadContext>>>;
type StatusKind = "accepted" | "confirmed" | "declined" | "cancelled_by_admin";

/** Link per ruolo del destinatario: l'artista e l'organizzatore hanno aree diverse. */
function linksFor(base: string, role: "artist" | "organizer") {
  return role === "artist"
    ? { chatUrl: `${base}/dashboard/chat`, bookingUrl: `${base}/dashboard/leads` }
    : { chatUrl: `${base}/organizzatore/chat`, bookingUrl: `${base}/organizzatore/richieste` };
}

/**
 * Invia una notifica di stato a uno o più destinatari. Con più destinatari
 * parte una email ciascuno: i link nel corpo puntano all'area di ciascuno e
 * nessuno vede l'indirizzo dell'altro.
 */
async function notifyStatus(
  ctx: BookingContext,
  opts: {
    key: "booking_accepted" | "booking_confirmed" | "booking_declined" | "booking_cancelled_admin";
    kind: StatusKind;
    subject: string;
    template: string;
    message: string;
    cancellationReason?: string;
    recipients: { email: string; role: "artist" | "organizer" }[];
    meta: Record<string, string>;
  }
) {
  const results = await Promise.all(
    opts.recipients.map((r) =>
      dispatchEmail({
        key: opts.key,
        to: r.email,
        params: { ...ctx.params, message: opts.message, ...linksFor(ctx.base, r.role) },
        meta: opts.meta,
        fallback: {
          subject: opts.subject,
          template: opts.template,
          react: createElement(BookingStatusEmail, {
            kind: opts.kind,
            ...ctx.raw,
            cancellationReason: opts.cancellationReason,
          }),
        },
      })
    )
  );
  return { ok: results.some((r) => r.ok) };
}

function bothRecipients(ctx: BookingContext) {
  const out: { email: string; role: "artist" | "organizer" }[] = [];
  if (ctx.artistEmail) out.push({ email: ctx.artistEmail, role: "artist" });
  if (ctx.organizerEmail) out.push({ email: ctx.organizerEmail, role: "organizer" });
  return out;
}

/**
 * Artista ha accettato (richiesta o offerta in chat) → all'organizzatore, che
 * deve confermare la data dalla propria area.
 */
export async function sendBookingAcceptedEmail(requestId: string) {
  const ctx = await loadContext(requestId);
  if (!ctx?.organizerEmail) return { ok: false as const };
  return notifyStatus(ctx, {
    key: "booking_accepted",
    kind: "accepted",
    subject: `${ctx.raw.artistName} ha accettato: conferma la data`,
    template: "BookingAccepted",
    message: ctx.notesArtist,
    recipients: [{ email: ctx.organizerEmail, role: "organizer" }],
    meta: { requestId, artistId: ctx.artistId },
  });
}

/** Data confermata da entrambe le parti → artista e organizzatore. */
export async function sendBookingConfirmedEmail(requestId: string) {
  const ctx = await loadContext(requestId);
  if (!ctx) return { ok: false as const };
  const recipients = bothRecipients(ctx);
  if (recipients.length === 0) return { ok: false as const };
  return notifyStatus(ctx, {
    key: "booking_confirmed",
    kind: "confirmed",
    subject: `Data confermata: ${ctx.raw.artistName} · ${ctx.raw.eventDate}`,
    template: "BookingConfirmed",
    message: ctx.notesArtist,
    recipients,
    meta: { requestId, artistId: ctx.artistId },
  });
}

/** Artista non disponibile → organizzatore. */
export async function sendBookingDeclinedEmail(requestId: string) {
  const ctx = await loadContext(requestId);
  if (!ctx?.organizerEmail) return { ok: false as const };
  return notifyStatus(ctx, {
    key: "booking_declined",
    kind: "declined",
    subject: `${ctx.raw.artistName} non disponibile per la data richiesta`,
    template: "BookingDeclined",
    message: ctx.notesArtist,
    recipients: [{ email: ctx.organizerEmail, role: "organizer" }],
    meta: { requestId, artistId: ctx.artistId },
  });
}

/** Annullamento deciso dal superadmin → artista e organizzatore. */
export async function sendBookingCancelledByAdminEmail(requestId: string, reason: string) {
  const ctx = await loadContext(requestId);
  if (!ctx) return { ok: false as const };
  const recipients = bothRecipients(ctx);
  if (recipients.length === 0) return { ok: false as const };
  return notifyStatus(ctx, {
    key: "booking_cancelled_admin",
    kind: "cancelled_by_admin",
    subject: `Data annullata da N'arte · ${ctx.raw.eventDate}`,
    template: "BookingCancelledByAdmin",
    message: toPlainText(reason),
    cancellationReason: reason,
    recipients,
    meta: { requestId, artistId: ctx.artistId, reason },
  });
}
