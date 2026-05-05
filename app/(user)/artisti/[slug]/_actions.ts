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
  const parsed = artistInterestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, stage_name, status, user_id")
    .eq("id", data.artistId)
    .maybeSingle();
  if (!artist || artist.status !== "approved")
    return { ok: false as const, error: "Artista non disponibile" };

  const slotLine = data.timeSlot ? `\nSlot orario: ${data.timeSlot}` : "";
  const composedMessage = `Richiesta dalla pagina artista per il ${data.date}.${slotLine}\nNome: ${data.name}\n\n${data.message}`;
  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      artist_id: artist.id,
      event_date: data.date,
      event_time: data.timeSlot ?? null,
      event_location: data.location ?? "Da definire",
      message: composedMessage,
      contact_email: data.email,
      contact_phone: data.phone ?? null,
    })
    .select("id")
    .single();
  if (error || !lead) return { ok: false as const, error: error?.message ?? "Errore salvataggio" };

  // Notifiche email (best-effort: non bloccano il successo della richiesta)
  let artistEmail: string | null = null;
  if (artist.user_id) {
    try {
      const { data: artistUser } = await admin.auth.admin.getUserById(artist.user_id);
      artistEmail = artistUser?.user?.email ?? null;
    } catch {
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
            eventLocation: data.location ?? "Da definire",
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
            eventLocation: data.location ?? "Da definire",
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
