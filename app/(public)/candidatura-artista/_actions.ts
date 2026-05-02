"use server";

import { createAdminClient } from "@/lib/supabase/server";
import {
  artistApplicationSchema,
  type ArtistApplicationInput,
} from "@/lib/validators/schemas";
import { sendEmail } from "@/lib/emails/send";
import ApplicationReceivedEmail from "@/lib/emails/templates/ApplicationReceivedEmail";

export async function submitArtistApplication(input: ArtistApplicationInput) {
  const parsed = artistApplicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("artist_applications").insert({
      name: data.name,
      email: data.email,
      stage_name: data.stageName,
      genre: data.genre.split(",").map((g) => g.trim()).filter(Boolean),
      bio: data.bio ?? null,
      links: {
        ...(data.instagram ? { instagram: data.instagram } : {}),
        ...(data.spotify ? { spotify: data.spotify } : {}),
        ...(data.website ? { website: data.website } : {}),
      },
    });
    if (error) return { ok: false as const, error: "Errore salvataggio" };
  } catch {
    return { ok: false as const, error: "Errore server" };
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  await Promise.all([
    sendEmail({
      to: data.email,
      subject: "Candidatura ricevuta — N'arte",
      react: ApplicationReceivedEmail({
        applicantName: data.name,
        stageName: data.stageName,
      }),
    }),
    adminEmail
      ? sendEmail({
          to: adminEmail,
          subject: `Nuova candidatura: ${data.stageName}`,
          react: ApplicationReceivedEmail({
            applicantName: data.name,
            stageName: data.stageName,
            isAdminCopy: true,
          }),
          replyTo: data.email,
        })
      : Promise.resolve(),
  ]);

  return { ok: true as const };
}
