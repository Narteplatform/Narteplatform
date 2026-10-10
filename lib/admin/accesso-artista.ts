import "server-only";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { dispatchEmail } from "@/lib/emails/dispatch";
import ArtistApprovedEmail from "@/lib/emails/templates/ArtistApprovedEmail";
import { logger } from "@/lib/logger";

/**
 * Account e link d'accesso per un artista appena approvato, SENZA email di
 * Supabase.
 *
 * Prima si usava `auth.admin.inviteUserByEmail`, che crea l'utente e spedisce
 * da sé l'invito standard di Supabase («You have been invited…»): l'artista
 * riceveva quella al posto — o prima — della mail N'arte. `generateLink` fa
 * le stesse due cose (crea l'utente se manca, produce il link firmato) ma non
 * invia nulla: l'unica email che parte è quella di `inviaBenvenutoArtista`.
 *
 * Se l'indirizzo ha già un account, l'invito fallisce e si ripiega su un link
 * di recupero, che porta comunque a impostare la password e accedere.
 * L'utente arriva dal link stesso: niente `listUsers()`, che legge solo la
 * prima pagina di utenti e oltre i 50 account non trovava più nessuno.
 */
export async function preparaAccessoArtista(
  email: string,
  nomeCompleto: string
): Promise<{ ok: true; userId: string; actionLink: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const redirectTo = `${getSiteUrl()}/reset-password`;

  const invito = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo, data: { full_name: nomeCompleto } },
  });
  if (!invito.error && invito.data?.user?.id && invito.data.properties?.action_link) {
    return { ok: true, userId: invito.data.user.id, actionLink: invito.data.properties.action_link };
  }

  const recupero = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (!recupero.error && recupero.data?.user?.id && recupero.data.properties?.action_link) {
    return { ok: true, userId: recupero.data.user.id, actionLink: recupero.data.properties.action_link };
  }

  const motivo = recupero.error?.message ?? invito.error?.message ?? "link non generato";
  logger.error("accesso-artista", `account per ${email} non preparato: ${motivo}`);
  return { ok: false, error: `Non riesco a creare l'accesso per ${email}: ${motivo}` };
}

/** Email di benvenuto con il template N'arte su Brevo (Resend solo come rete). */
export async function inviaBenvenutoArtista(input: {
  email: string;
  nome: string;
  nomeArte: string;
  actionLink: string;
}): Promise<boolean> {
  const res = await dispatchEmail({
    key: "artist_approved",
    to: input.email,
    params: {
      applicantName: input.nome,
      stageName: input.nomeArte,
      actionUrl: input.actionLink,
      profileUrl: `${getSiteUrl()}/dashboard/profili`,
    },
    fallback: {
      subject: "Candidatura approvata — N'arte",
      template: "ArtistApproved",
      react: createElement(ArtistApprovedEmail, {
        applicantName: input.nome,
        stageName: input.nomeArte,
        actionUrl: input.actionLink,
      }),
    },
  });
  if (!res.ok) logger.warn("accesso-artista", `benvenuto a ${input.email} non consegnato (${res.provider})`);
  return res.ok;
}
