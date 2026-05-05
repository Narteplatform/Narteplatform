"use server";

import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { leadSchema, type LeadInput } from "@/lib/validators/schemas";
import { sendEmail } from "@/lib/emails/send";
import BookingRequestEmail from "@/lib/emails/templates/BookingRequestEmail";

// =========================================
// submitArtistInterest — pubblico (no auth)
// Usato dal BookingCalendar nella pagina artista: l'utente clicca una
// data libera, lascia i propri dati e crea un lead.
// =========================================
export const artistInterestSchema = z.object({
  artistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  timeSlot: z.string().max(80).optional().or(z.literal("").transform(() => undefined)),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(30).optional().or(z.literal("").transform(() => undefined)),
  location: z.string().max(160).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().min(5).max(2000),
});
export type ArtistInterestInput = z.infer<typeof artistInterestSchema>;

export async function submitArtistInterest(input: ArtistInterestInput) {
  try {
    const parsed = artistInterestSchema.safeParse(input);
    if (!parsed.success) {
      console.error("[submitArtistInterest] zod fail", parsed.error.flatten());
      return { ok: false as const, error: "Dati non validi" };
    }
    const data = parsed.data;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[submitArtistInterest] SUPABASE_SERVICE_ROLE_KEY mancante");
      return { ok: false as const, error: "Configurazione server mancante (service role)" };
    }

    const admin = createAdminClient();
    const { data: artist, error: artistErr } = await admin
      .from("artists")
      .select("id, stage_name, status, user_id")
      .eq("id", data.artistId)
      .maybeSingle();
    if (artistErr) {
      console.error("[submitArtistInterest] artist lookup error", artistErr);
      return { ok: false as const, error: artistErr.message };
    }
    if (!artist || artist.status !== "approved")
      return { ok: false as const, error: "Artista non disponibile" };

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
        console.error("[submitArtistInterest] insert (full) error", error);
        lastError = { message: error.message, code: error.code };
        // Retry senza event_time se la colonna non esiste sul DB di prod
        if (error.code === "42703" || /event_time/i.test(error.message)) {
          const retry = await admin
            .from("leads")
            .insert(basePayload)
            .select("id")
            .single();
          if (retry.error) {
            console.error("[submitArtistInterest] insert (retry) error", retry.error);
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
      return { ok: false as const, error: lastError?.message ?? "Errore salvataggio" };
    }

    // Notifiche email best-effort (non bloccano)
    let artistEmail: string | null = null;
    if (artist.user_id) {
      try {
        const { data: artistUser } = await admin.auth.admin.getUserById(artist.user_id);
        artistEmail = artistUser?.user?.email ?? null;
      } catch (e) {
        console.error("[submitArtistInterest] getUserById error", e);
        artistEmail = null;
      }
    }
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    await Promise.allSettled([
      artistEmail
        ? sendEmail({
            to: artistEmail,
            subject: `Nuova richiesta booking — ${data.date}`,
            replyTo: data.email,
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
        : Promise.resolve(),
      adminEmail
        ? sendEmail({
            to: adminEmail,
            subject: `[N'arte] Nuovo lead per ${artist.stage_name}`,
            replyTo: data.email,
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
        : Promise.resolve(),
    ]);

    return { ok: true as const, leadId: lead.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore inatteso";
    console.error("[submitArtistInterest] unhandled", e);
    return { ok: false as const, error: msg };
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
