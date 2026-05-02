"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { leadSchema, type LeadInput } from "@/lib/validators/schemas";
import { sendEmail } from "@/lib/emails/send";
import BookingRequestEmail from "@/lib/emails/templates/BookingRequestEmail";

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
