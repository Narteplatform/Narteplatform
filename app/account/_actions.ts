"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { formatDateIt } from "@/lib/emails/format";
import NoticeEmail from "@/lib/emails/templates/NoticeEmail";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { allowByIp } from "@/lib/security/rate-limit";
import { LIMITI_AUTH } from "@/lib/auth/limiti";
import { authErrorMessage } from "@/lib/auth/error-messages";
import {
  mancaSecondoFattore,
  metodiDiAccesso,
  metodoUsatoDiRecente,
  verificaPasswordAttuale,
} from "@/lib/auth/riautenticazione";
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
  revalidatePath("/account");
  return { ok: true as const };
}

export type MetodiAccesso = {
  email: string;
  /** Ha un'identità email/password: per i cambi si chiede la password attuale. */
  password: boolean;
  /** Ha collegato Google. */
  google: boolean;
  /** Nuovo indirizzo in attesa di conferma, se c'è un cambio in corso. */
  emailInAttesa: string | null;
};

type Esito = { ok: true } | { ok: false; error: string };

/** Errore comune quando il secondo fattore è attivo ma la sessione non l'ha verificato. */
const SERVE_MFA =
  "Per questa operazione conferma prima il codice dell'app di autenticazione: apri «Sicurezza» e verifica il codice.";

/** Come si accede a questo account: decide quale modulo mostrare per password ed email. */
export async function leggiMetodiAccesso(): Promise<{ ok: true; metodi: MetodiAccesso } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { ok: false, error: "Non autorizzato" };
  const m = metodiDiAccesso(user);
  return {
    ok: true,
    metodi: {
      email: user.email ?? "",
      password: m.password,
      google: m.google,
      emailInAttesa: user.new_email ?? null,
    },
  };
}

export async function changePassword(input: PasswordChangeAuthenticatedInput): Promise<Esito> {
  const parsed = passwordChangeAuthenticatedSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    };
  }

  if (!(await allowByIp(LIMITI_AUTH.cambioPassword))) {
    return { ok: false, error: "Troppi tentativi ravvicinati. Riprova fra un'ora." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Non autorizzato" };

  // Account senza password (solo Google): la password attuale non esiste, si
  // passa dal codice via email (inviaCodiceRiautenticazione + impostaPassword).
  if (!metodiDiAccesso(user).password) {
    return {
      ok: false,
      error: "Il tuo account usa l'accesso con Google: per impostare una password richiedi il codice via email.",
    };
  }

  if (await mancaSecondoFattore(supabase, user)) return { ok: false, error: SERVE_MFA };

  // Riprova le credenziali attuali prima di cambiarle. Avere la sessione non
  // basta: chi si è impossessato di un cookie potrebbe altrimenti cambiare la
  // password e chiudere fuori il proprietario, trasformando un accesso
  // temporaneo in una perdita definitiva dell'account. La prova avviene su un
  // client usa e getta: la sessione dell'utente (e il suo livello MFA) resta.
  if (!(await verificaPasswordAttuale(user.email, parsed.data.currentPassword))) {
    return { ok: false as const, error: "La password attuale non è corretta" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false as const, error: authErrorMessage(error.message) };

  await inviaPasswordCambiata(user.id, user.email);
  return { ok: true as const };
}

/**
 * Codice di riautenticazione via email (Supabase `reauthenticate`). Serve agli
 * account senza password — tipicamente creati con Google — per impostarne una:
 * non avendo una password attuale da ridigitare, provano di avere accesso alla
 * casella. Il codice lo manda il mailer di Supabase (modello «Reauthentication»).
 */
export async function inviaCodiceRiautenticazione(): Promise<Esito> {
  if (!(await allowByIp(LIMITI_AUTH.codiceRiautenticazione))) {
    return { ok: false, error: "Troppe richieste ravvicinate. Riprova fra un'ora." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Non autorizzato" };

  const { error } = await supabase.auth.reauthenticate();
  if (error) {
    logger.warn("account/riautenticazione", error.message);
    return { ok: false, error: authErrorMessage(error.message) };
  }
  return { ok: true };
}

const impostaPasswordSchema = z.object({
  codice: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, "Inserisci il codice che hai ricevuto via email"),
  password: z.string().min(8, "Almeno 8 caratteri").max(72),
});

/**
 * Imposta (o cambia) la password di un account senza identità email, con il
 * codice ricevuto da `inviaCodiceRiautenticazione`. Supabase verifica il codice
 * (`nonce`) quando «Secure password change» è attivo nel pannello: vedi report.
 */
export async function impostaPassword(input: { codice: string; password: string }): Promise<Esito> {
  const parsed = impostaPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  if (!(await allowByIp(LIMITI_AUTH.cambioPassword))) {
    return { ok: false, error: "Troppi tentativi ravvicinati. Riprova fra un'ora." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Non autorizzato" };
  if (metodiDiAccesso(user).password) {
    return { ok: false, error: "Il tuo account ha già una password: per cambiarla inserisci quella attuale." };
  }
  if (await mancaSecondoFattore(supabase, user)) return { ok: false, error: SERVE_MFA };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    nonce: parsed.data.codice,
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("nonce") || m.includes("reauthentication") || m.includes("otp")) {
      return { ok: false, error: "Il codice non è valido o è scaduto. Richiedine uno nuovo." };
    }
    return { ok: false, error: authErrorMessage(error.message) };
  }

  await inviaPasswordCambiata(user.id, user.email);
  return { ok: true };
}

const cambioEmailSchema = z.object({
  nuovaEmail: z.string().trim().toLowerCase().email("Inserisci un indirizzo email valido").max(254),
  passwordAttuale: z.string().max(72).optional(),
});

/** Minuti entro cui un accesso con Google vale come conferma d'identità. */
const MINUTI_RIACCESSO_GOOGLE = 10;

/**
 * Cambio dell'indirizzo email.
 *
 * RIAUTENTICAZIONE. Con password: la password attuale (verificata senza
 * toccare la sessione). Account solo Google: un accesso con Google negli ultimi
 * minuti, letto dagli AMR firmati del token. Il codice di `reauthenticate`
 * qui non serve: Supabase lo controlla solo sui cambi di password, quindi non
 * proverebbe niente.
 *
 * CONFERMA. Con il «cambio email sicuro» di Supabase arriva una conferma a
 * ENTRAMBI gli indirizzi; il cambio avviene solo dopo. I link portano a
 * /auth/confirm. Allineare l'indirizzo su Stripe e Brevo NON è fatto qui.
 */
export async function cambiaEmail(input: {
  nuovaEmail: string;
  passwordAttuale?: string;
}): Promise<Esito | { ok: false; error: string; riaccedi: true }> {
  const parsed = cambioEmailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  if (!(await allowByIp(LIMITI_AUTH.cambioEmail))) {
    return { ok: false, error: "Troppe richieste ravvicinate. Riprova fra un'ora." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Non autorizzato" };

  const nuova = parsed.data.nuovaEmail;
  if (nuova === user.email.trim().toLowerCase()) {
    return { ok: false, error: "È già l'indirizzo del tuo account." };
  }
  if (await mancaSecondoFattore(supabase, user)) return { ok: false, error: SERVE_MFA };

  const metodi = metodiDiAccesso(user);
  if (metodi.password) {
    const pw = parsed.data.passwordAttuale ?? "";
    if (!pw) return { ok: false, error: "Inserisci la password attuale." };
    if (!(await verificaPasswordAttuale(user.email, pw))) {
      return { ok: false, error: "La password attuale non è corretta" };
    }
  } else if (!(await metodoUsatoDiRecente(supabase, user, "oauth", MINUTI_RIACCESSO_GOOGLE))) {
    return {
      ok: false,
      riaccedi: true,
      error: "Per sicurezza conferma la tua identità accedendo di nuovo con Google, poi ripeti il cambio.",
    };
  }

  const { error } = await supabase.auth.updateUser(
    { email: nuova },
    { emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent("/account")}` }
  );
  if (error) return { ok: false, error: authErrorMessage(error.message) };

  logger.debug("account/email", `cambio email richiesto per ${user.id}`);
  revalidatePath("/account");
  return { ok: true };
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
