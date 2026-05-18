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
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    };
  }
  const data = parsed.data;

  try {
    const supabase = createAdminClient();

    // Crea account auth con email + password (email pre-confermata).
    // Profile parte con role='user' (default). Diventa 'artist' all'approvazione.
    const { error: createErr } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (createErr) {
      const msg = (createErr.message ?? "").toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("exist") ||
        msg.includes("registered") ||
        msg.includes("duplicate")
      ) {
        return {
          ok: false as const,
          error: "Email già registrata. Effettua l'accesso con la password esistente.",
        };
      }
      console.error("[application] createUser error", createErr);
      return { ok: false as const, error: "Impossibile creare l'account. Riprova." };
    }

    const { error } = await supabase.from("artist_applications").insert({
      name: data.name,
      email: data.email,
      stage_name: data.stageName,
      genre: data.genres,
      bio: data.bio ?? null,
      links: {
        ...(data.instagram ? { instagram: data.instagram } : {}),
        ...(data.spotify ? { spotify: data.spotify } : {}),
        ...(data.website ? { website: data.website } : {}),
      },
    });
    if (error) return { ok: false as const, error: "Errore salvataggio candidatura" };
  } catch (e) {
    console.error("[application] server error", e);
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
