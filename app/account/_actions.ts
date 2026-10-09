"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { formatDateIt } from "@/lib/emails/format";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import {
  accountProfileSchema,
  passwordChangeAuthenticatedSchema,
  type AccountProfileInput,
  type PasswordChangeAuthenticatedInput,
} from "@/lib/validators/schemas";

export async function updateAccountProfile(input: AccountProfileInput) {
  const parsed = accountProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  // Service role: la policy di update self funzionerebbe, ma per evitare
  // qualunque interferenza con le policy ricorsive sui profiles usiamo l'admin
  // client (l'id è verificato server-side).
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      avatar_url: parsed.data.avatarUrl ?? null,
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/profilo");
  revalidatePath("/dashboard/profilo-artista");
  revalidatePath("/organizzatore/profilo");
  return { ok: true as const };
}

export async function changePassword(input: PasswordChangeAuthenticatedInput) {
  const parsed = passwordChangeAuthenticatedSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Non autorizzato" };

  // Riprova le credenziali attuali prima di cambiarle. Avere la sessione non
  // basta: chi si è impossessato di un cookie potrebbe altrimenti cambiare la
  // password e chiudere fuori il proprietario, trasformando un accesso
  // temporaneo in una perdita definitiva dell'account.
  const { error: verifica } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifica) {
    return { ok: false as const, error: "La password attuale non è corretta" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false as const, error: error.message };

  await inviaPasswordCambiata(user.id, user.email);
  return { ok: true as const };
}

/** Oltre questa età dell'ultimo aggiornamento l'utente non ha «appena» cambiato la password. */
const FINESTRA_CAMBIO_MS = 5 * 60 * 1000;

/**
 * Avviso di password modificata. Best effort: non solleva mai, un'email persa
 * non deve far fallire il cambio. Il nome viene letto da `profiles` (errore
 * controllato: se la lettura fallisce si ricade sulla parte locale dell'email).
 */
async function inviaPasswordCambiata(userId: string, email: string): Promise<void> {
  try {
    let nome = email.split("@")[0] || "";
    const admin = createAdminClient();
    const { data: profilo, error } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      logger.warn("account/password", "nome non letto:", error.message);
    } else if (profilo?.full_name?.trim()) {
      nome = profilo.full_name.trim();
    }

    const adesso = new Date();
    const ora = adesso.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    });
    const giorno = formatDateIt(
      new Date(adesso.toLocaleString("en-US", { timeZone: "Europe/Rome" }))
    );
    const whenLabel = `${giorno} alle ${ora}`;
    const supportUrl = `${getSiteUrl()}/contatti`;

    await dispatchEmail({
      key: "password_changed",
      to: email,
      params: { name: nome, whenLabel, supportUrl },
      fallback: {
        subject: "La tua password è stata modificata",
        template: "PasswordChanged",
        react: createElement(NoticeEmail, {
          preview: "La password del tuo account è stata modificata.",
          heading: "Password modificata",
          paragraphs: [
            `Ciao ${nome}, la password del tuo account N'arte è stata modificata il ${whenLabel}.`,
            "Non sei stato tu? Scrivici subito: blocchiamo l'account e ti aiutiamo a riprenderne il controllo.",
          ],
          button: { label: "Contattaci", href: supportUrl },
        }),
      },
    });
  } catch (e) {
    logger.warn("account/password", "avviso non inviato:", e instanceof Error ? e.message : String(e));
  }
}

/**
 * Avviso di password cambiata dopo il recupero. Il cambio avviene nel browser
 * (`ResetPasswordForm`), quindi l'email parte da qui, con la sessione di
 * recupero ancora aperta. Poiché è raggiungibile da qualunque utente in
 * sessione, scrive solo all'indirizzo dell'utente stesso e solo se l'account è
 * stato aggiornato da meno di 5 minuti: non è un modo per far partire email a
 * piacere. Non solleva.
 */
export async function notificaPasswordCambiata(): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user?.email) return;
    const aggiornato = Date.parse(user.updated_at ?? "");
    if (!Number.isFinite(aggiornato) || Date.now() - aggiornato > FINESTRA_CAMBIO_MS) return;
    await inviaPasswordCambiata(user.id, user.email);
  } catch (e) {
    logger.warn("account/password", "avviso non inviato:", e instanceof Error ? e.message : String(e));
  }
}
