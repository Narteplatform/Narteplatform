"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { leadSchema, type LeadInput } from "@/lib/validators/schemas";
import { sendEmail } from "@/lib/emails/send";
import BookingRequestEmail from "@/lib/emails/templates/BookingRequestEmail";
import {
  artistInterestSchema,
  type ArtistInterestInput,
} from "./_schema";

// =========================================
// submitArtistInterest — pubblico (no auth)
// Usato dal BookingCalendar nella pagina artista: l'utente clicca una
// data libera, lascia i propri dati e crea un lead.
// =========================================

const isProd = process.env.NODE_ENV === "production";

function newRid(): string {
  // crypto.randomUUID è disponibile su Node 19+
  try {
    return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function publicError(rid: string, message: string): { ok: false; error: string; rid: string } {
  return { ok: false as const, rid, error: isProd ? `${message} [${rid}]` : message };
}

export async function submitArtistInterest(input: ArtistInterestInput) {
  const rid = newRid();
  try {
    console.log("[booking]", rid, "step=start", { artistId: input?.artistId, date: input?.date });

    const parsed = artistInterestSchema.safeParse(input);
    if (!parsed.success) {
      console.error("[booking]", rid, "step=zod-fail", parsed.error.flatten());
      return publicError(rid, "Dati non validi");
    }
    const data = parsed.data;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[booking]", rid, "step=env-missing", "SUPABASE_SERVICE_ROLE_KEY");
      return publicError(rid, "Configurazione server mancante");
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error("[booking]", rid, "step=admin-client-fail", e);
      return publicError(rid, "Configurazione server mancante");
    }

    const { data: artist, error: artistErr } = await admin
      .from("artists")
      .select("id, stage_name, status, is_public, user_id")
      .eq("id", data.artistId)
      .maybeSingle();
    if (artistErr) {
      console.error("[booking]", rid, "step=artist-lookup-fail", artistErr);
      return publicError(rid, isProd ? "Artista non disponibile" : artistErr.message);
    }
    if (!artist || !artist.is_public) {
      console.warn("[booking]", rid, "step=artist-not-approved", {
        found: !!artist,
        status: artist?.status,
      });
      return publicError(rid, "Artista non disponibile");
    }

    const slotLine = data.timeSlot ? `\nSlot orario: ${data.timeSlot}` : "";
    const composedMessage = `Richiesta dalla pagina artista per il ${data.date}.${slotLine}\nNome: ${data.name}\n\n${data.message}`;
    const eventLocation = data.location ?? "Da definire";

    type LeadInsertRow = {
      artist_id: string;
      event_date: string;
      event_location: string;
      message: string;
      contact_email: string;
      contact_phone: string | null;
      event_time?: string | null;
    };
    const basePayload: LeadInsertRow = {
      artist_id: artist.id,
      event_date: data.date,
      event_location: eventLocation,
      message: composedMessage,
      contact_email: data.email,
      contact_phone: data.phone ?? null,
    };
    const fullPayload: LeadInsertRow = {
      ...basePayload,
      event_time: data.timeSlot ?? null,
    };

    let lead: { id: string } | null = null;
    let lastError: { message: string; code?: string } | null = null;
    {
      const { data: row, error } = await admin
        .from("leads")
        .insert(fullPayload)
        .select("id")
        .single();
      if (error) {
        console.error("[booking]", rid, "step=lead-insert-fail", error);
        lastError = { message: error.message, code: error.code };
        // Retry senza event_time se la colonna non esiste sul DB di prod
        if (error.code === "42703" || /event_time/i.test(error.message)) {
          console.log("[booking]", rid, "step=lead-insert-retry-without-event_time");
          const retry = await admin
            .from("leads")
            .insert(basePayload)
            .select("id")
            .single();
          if (retry.error) {
            console.error("[booking]", rid, "step=lead-insert-retry-fail", retry.error);
            lastError = { message: retry.error.message, code: retry.error.code };
          } else {
            lead = retry.data;
            lastError = null;
          }
        }
      } else {
        lead = row;
      }
    }
    if (!lead) {
      return publicError(rid, isProd ? "Errore salvataggio" : (lastError?.message ?? "Errore salvataggio"));
    }
    console.log("[booking]", rid, "step=lead-inserted", { leadId: lead.id });

    // Notifiche email best-effort (non bloccano)
    let artistEmail: string | null = null;
    if (artist.user_id) {
      try {
        const { data: artistUser } = await admin.auth.admin.getUserById(artist.user_id);
        artistEmail = artistUser?.user?.email ?? null;
      } catch (e) {
        console.error("[booking]", rid, "step=get-artist-email-fail", e);
        artistEmail = null;
      }
    }
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    const results = await Promise.allSettled([
      artistEmail
        ? sendEmail({
            to: artistEmail,
            subject: `Nuova richiesta booking — ${data.date}`,
            replyTo: data.email,
            template: "BookingRequestArtist",
            react: BookingRequestEmail({
              artistName: artist.stage_name,
              requesterName: data.name,
              eventDate: data.date,
              eventLocation,
              budget: null,
              message: composedMessage,
              contactEmail: data.email,
              contactPhone: data.phone ?? null,
            }),
          })
        : Promise.resolve({ ok: false as const, skipped: true }),
      adminEmail
        ? sendEmail({
            to: adminEmail,
            subject: `[N'arte] Nuovo lead per ${artist.stage_name}`,
            replyTo: data.email,
            template: "BookingRequestAdmin",
            react: BookingRequestEmail({
              artistName: artist.stage_name,
              requesterName: data.name,
              eventDate: data.date,
              eventLocation,
              budget: null,
              message: composedMessage,
              contactEmail: data.email,
              contactPhone: data.phone ?? null,
              isAdminCopy: true,
            }),
          })
        : Promise.resolve({ ok: false as const, skipped: true }),
    ]);
    console.log("[booking]", rid, "step=emails-sent", {
      artist: results[0].status,
      admin: results[1].status,
    });

    return { ok: true as const, rid, leadId: lead.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore inatteso";
    console.error("[booking]", rid, "step=unhandled", e);
    return publicError(rid, isProd ? "Errore inatteso" : msg);
  }
}

export async function submitLead(input: LeadInput) {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Devi essere loggato" };

  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, stage_name, user_id")
    .eq("id", data.artistId)
    .single();

  if (!artist) return { ok: false as const, error: "Artista non trovato" };

  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      artist_id: data.artistId,
      requester_user_id: user.id,
      event_date: data.eventDate,
      event_location: data.eventLocation,
      budget: data.budget ?? null,
      message: data.message,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone ?? null,
    })
    .select("id")
    .single();

  if (error || !lead) return { ok: false as const, error: "Errore salvataggio lead" };

  let artistEmail: string | null = null;
  if (artist.user_id) {
    const { data: artistUser } = await admin.auth.admin.getUserById(artist.user_id);
    artistEmail = artistUser?.user?.email ?? null;
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  await Promise.all([
    artistEmail
      ? sendEmail({
          to: artistEmail,
          subject: `Nuova richiesta booking — ${data.eventLocation}`,
          replyTo: data.contactEmail,
          template: "LeadArtist",
          react: BookingRequestEmail({
            artistName: artist.stage_name,
            eventDate: data.eventDate,
            eventLocation: data.eventLocation,
            budget: data.budget,
            message: data.message,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
          }),
        })
      : Promise.resolve(),
    adminEmail
      ? sendEmail({
          to: adminEmail,
          subject: `[N'arte] Nuovo lead per ${artist.stage_name}`,
          replyTo: data.contactEmail,
          template: "LeadAdmin",
          react: BookingRequestEmail({
            artistName: artist.stage_name,
            eventDate: data.eventDate,
            eventLocation: data.eventLocation,
            budget: data.budget,
            message: data.message,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            isAdminCopy: true,
          }),
        })
      : Promise.resolve(),
  ]);

  return { ok: true as const, leadId: lead.id };
}
