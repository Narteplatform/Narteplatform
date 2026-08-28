"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { guardPublicForm } from "@/lib/security/form-guard";
import { LIMITI } from "@/lib/security/rate-limit";
import {
  artistApplicationSchema,
  type ArtistApplicationInput,
} from "@/lib/validators/schemas";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
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

  // Soglia più stretta degli altri moduli: una candidatura è un atto raro e
  // pesante (porta con sé un video), e qui è anche il punto in cui uno script
  // potrebbe generare centinaia di righe da valutare a mano.
  const guard = await guardPublicForm(input, LIMITI.candidatura, {
    email: data.email,
    area: "candidatura-artista",
  });
  if (!guard.ok) return { ok: false as const, error: guard.error };

  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("artist_applications").insert({
      name: data.name,
      email: data.email,
      stage_name: data.stageName,
      genre: data.genres,
      instruments: data.instruments ?? [],
      bio: data.bio ?? null,
      links: {
        ...(data.instagram ? { instagram: data.instagram } : {}),
        ...(data.spotify ? { spotify: data.spotify } : {}),
        ...(data.website ? { website: data.website } : {}),
      },
      video_url: data.video_url ?? null,
      video_path: data.video_path ?? null,
    });
    if (error) return { ok: false as const, error: "Errore salvataggio candidatura" };
  } catch {
    return { ok: false as const, error: "Errore server" };
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  // I parametri Brevo e il componente Resend convivono di proposito: finché
  // la chiave non è elencata in BREVO_ENABLED_KEYS parte il secondo, e se
  // Brevo fallisce si ricade comunque su di lui. Vedi lib/emails/dispatch.ts.
  const params = {
    applicantName: data.name,
    stageName: data.stageName,
    email: data.email,
    genres: data.genres.join(", "),
    adminUrl: `${getSiteUrl()}/admin/artisti`,
  };

  await Promise.all([
    dispatchEmail({
      key: "application_received",
      to: data.email,
      params,
      fallback: {
        subject: "Candidatura ricevuta — N'arte",
        template: "ApplicationReceived",
        react: ApplicationReceivedEmail({
          applicantName: data.name,
          stageName: data.stageName,
        }),
      },
    }),
    adminEmail
      ? dispatchEmail({
          key: "application_received_admin",
          to: adminEmail,
          params,
          replyTo: data.email,
          fallback: {
            subject: `Nuova candidatura: ${data.stageName}`,
            template: "ApplicationReceivedAdmin",
            react: ApplicationReceivedEmail({
              applicantName: data.name,
              stageName: data.stageName,
              isAdminCopy: true,
            }),
          },
        })
      : Promise.resolve(),
  ]);

  return { ok: true as const };
}
