import { Resend } from "resend";
import type { ReactElement } from "react";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import BookingStatusEmail from "@/lib/emails/templates/BookingStatusEmail";
import type { Json } from "@/lib/supabase/types";

const FROM = process.env.RESEND_FROM_EMAIL || "N'arte <noreply@narte.it>";

// Lazy init: il client Resend richiede la chiave nel constructor. Durante
// la build di Vercel (collect page data) il modulo viene valutato senza
// env runtime → istanziarlo top-level rompe il build se la chiave manca.
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

type SendEmailOpts = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
  template?: string;
  meta?: Json;
};

async function logEmail(row: {
  to: string[];
  subject: string;
  template?: string;
  status: "sent" | "failed" | "skipped";
  providerId?: string | null;
  error?: string | null;
  meta?: Json;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("email_log").insert({
      to_addresses: row.to,
      subject: row.subject,
      template: row.template ?? null,
      status: row.status,
      provider_id: row.providerId ?? null,
      error: row.error ?? null,
      meta: row.meta ?? {},
    });
  } catch (e) {
    console.error("[email_log] impossibile salvare riga", e);
  }
}

export async function sendEmail(opts: SendEmailOpts) {
  const toArr = Array.isArray(opts.to) ? opts.to : [opts.to];
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY mancante — email non inviata", opts.subject);
    await logEmail({
      to: toArr,
      subject: opts.subject,
      template: opts.template,
      status: "skipped",
      error: "RESEND_API_KEY mancante",
      meta: opts.meta,
    });
    return { ok: false as const, skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: toArr,
      subject: opts.subject,
      react: opts.react,
      replyTo: opts.replyTo,
    });
    if (error) {
      console.error("[email] errore Resend", error);
      await logEmail({
        to: toArr,
        subject: opts.subject,
        template: opts.template,
        status: "failed",
        error: typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : JSON.stringify(error),
        meta: opts.meta,
      });
      return { ok: false as const, error };
    }
    await logEmail({
      to: toArr,
      subject: opts.subject,
      template: opts.template,
      status: "sent",
      providerId: data?.id ?? null,
      meta: opts.meta,
    });
    return { ok: true as const, id: data?.id };
  } catch (err) {
    console.error("[email] eccezione", err);
    await logEmail({
      to: toArr,
      subject: opts.subject,
      template: opts.template,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      meta: opts.meta,
    });
    return { ok: false as const, error: err };
  }
}

// =========================================
// Booking workflow emails (handshake)
// =========================================

async function loadBookingContext(requestId: string) {
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("booking_requests")
    .select(
      "id, event_date, time_slot, budget_offer, message, status, notes_artist, artist_id, organizer_id, venue_id"
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return null;
  const [{ data: artist }, { data: organizer }, venueRes] = await Promise.all([
    admin
      .from("artists")
      .select("stage_name, user_id")
      .eq("id", req.artist_id)
      .maybeSingle(),
    admin
      .from("organizers")
      .select("display_name, user_id")
      .eq("id", req.organizer_id)
      .maybeSingle(),
    req.venue_id
      ? admin.from("venues").select("name, city").eq("id", req.venue_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const venue = venueRes?.data ?? null;
  const artistUser = artist?.user_id
    ? await admin.auth.admin.getUserById(artist.user_id)
    : null;
  const organizerUser = organizer?.user_id
    ? await admin.auth.admin.getUserById(organizer.user_id)
    : null;
  return {
    req,
    artist,
    organizer,
    venue,
    artistEmail: artistUser?.data?.user?.email ?? null,
    organizerEmail: organizerUser?.data?.user?.email ?? null,
  };
}

export async function sendBookingAcceptedEmail(requestId: string) {
  const ctx = await loadBookingContext(requestId);
  if (!ctx?.organizerEmail) return { ok: false as const };
  return sendEmail({
    to: ctx.organizerEmail,
    subject: `Risposta da ${ctx.artist?.stage_name ?? "artista"} — in trattativa`,
    template: "BookingAccepted",
    meta: { requestId, artistId: ctx.req.artist_id },
    react: createElement(BookingStatusEmail, {
      kind: "accepted",
      artistName: ctx.artist?.stage_name ?? "Artista",
      organizerName: ctx.organizer?.display_name ?? "",
      venueName: ctx.venue?.name ?? null,
      eventDate: ctx.req.event_date,
      notesArtist: ctx.req.notes_artist,
    }),
  });
}

export async function sendBookingConfirmedEmail(requestId: string) {
  const ctx = await loadBookingContext(requestId);
  if (!ctx) return { ok: false as const };
  const recipients = [ctx.artistEmail, ctx.organizerEmail].filter(Boolean) as string[];
  if (recipients.length === 0) return { ok: false as const };
  return sendEmail({
    to: recipients,
    subject: `Data confermata: ${ctx.artist?.stage_name ?? "artista"} · ${ctx.req.event_date}`,
    template: "BookingConfirmed",
    meta: { requestId, artistId: ctx.req.artist_id },
    react: createElement(BookingStatusEmail, {
      kind: "confirmed",
      artistName: ctx.artist?.stage_name ?? "Artista",
      organizerName: ctx.organizer?.display_name ?? "",
      venueName: ctx.venue?.name ?? null,
      eventDate: ctx.req.event_date,
      notesArtist: ctx.req.notes_artist,
    }),
  });
}

export async function sendBookingDeclinedEmail(requestId: string) {
  const ctx = await loadBookingContext(requestId);
  if (!ctx?.organizerEmail) return { ok: false as const };
  return sendEmail({
    to: ctx.organizerEmail,
    subject: `${ctx.artist?.stage_name ?? "Artista"} non disponibile per la data richiesta`,
    template: "BookingDeclined",
    meta: { requestId, artistId: ctx.req.artist_id },
    react: createElement(BookingStatusEmail, {
      kind: "declined",
      artistName: ctx.artist?.stage_name ?? "Artista",
      organizerName: ctx.organizer?.display_name ?? "",
      venueName: ctx.venue?.name ?? null,
      eventDate: ctx.req.event_date,
      notesArtist: ctx.req.notes_artist,
    }),
  });
}

export async function sendBookingCancelledByAdminEmail(requestId: string, reason: string) {
  const ctx = await loadBookingContext(requestId);
  if (!ctx) return { ok: false as const };
  const recipients = [ctx.artistEmail, ctx.organizerEmail].filter(Boolean) as string[];
  if (recipients.length === 0) return { ok: false as const };
  return sendEmail({
    to: recipients,
    subject: `Data annullata da N'arte · ${ctx.req.event_date}`,
    template: "BookingCancelledByAdmin",
    meta: { requestId, artistId: ctx.req.artist_id, reason },
    react: createElement(BookingStatusEmail, {
      kind: "cancelled_by_admin",
      artistName: ctx.artist?.stage_name ?? "Artista",
      organizerName: ctx.organizer?.display_name ?? "",
      venueName: ctx.venue?.name ?? null,
      eventDate: ctx.req.event_date,
      notesArtist: ctx.req.notes_artist,
      cancellationReason: reason,
    }),
  });
}
