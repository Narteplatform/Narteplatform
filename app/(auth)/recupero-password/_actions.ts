"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendTransactional } from "@/lib/brevo/send";
import { passwordResetRequestSchema } from "@/lib/validators/schemas";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Invio del link di recupero password.
 *
 * Due strade, scelte a runtime:
 *
 * 1. **Brevo** (preferita) — il link viene generato qui con
 *    `admin.generateLink`, poi spedito con il template `password_reset`, che
 *    vive in `lib/brevo/templates/account.ts` come tutte le altre email della
 *    piattaforma. Stesso mittente, stessa impaginazione, stessa riga in
 *    `email_log`.
 * 2. **Mailer di Supabase** (ripiego) — se il template non è ancora stato
 *    creato su Brevo o manca la chiave API, `sendTransactional` non spedisce e
 *    torna `skipped`: allora si passa da `resetPasswordForEmail`, che manda
 *    l'email di default di Supabase. Brutta ma funzionante.
 *
 * È il ripiego a rendere questa funzione utilizzabile oggi, con Brevo ancora
 * da configurare: il giorno in cui il dominio è verificato e
 * `BREVO_TEMPLATE_PASSWORD_RESET` è valorizzata, il ramo 1 si attiva da solo.
 * Nessuna riga di codice da cambiare.
 *
 * ⚠️ La risposta è sempre la stessa, esista o no l'account: qualunque
 * differenza — di testo o di tempo — renderebbe questo modulo un modo per
 * scoprire chi è iscritto a N'arte.
 */

/** Deve corrispondere alla scadenza impostata su Supabase (Auth → Sessions). */
const EXPIRES_LABEL = "60 minuti";

/** Finestra di cortesia per non trasformare il modulo in un mortaio di email. */
const THROTTLE_MINUTES = 3;

type Result = { ok: true } | { ok: false; error: string };

export async function requestPasswordReset(email: string): Promise<Result> {
  const parsed = passwordResetRequestSchema.safeParse({ email });
  if (!parsed.success) {
    return { ok: false, error: "Inserisci un indirizzo email valido." };
  }
  const address = parsed.data.email.trim().toLowerCase();
  const redirectTo = `${getSiteUrl()}/reset-password`;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    // Senza service-role non si può generare il link: si prova comunque la
    // via di Supabase, che non ne ha bisogno.
    return await fallback(address, redirectTo);
  }

  // Freno per indirizzo, basato sulle righe già scritte in `email_log`: usa
  // quello che c'è invece di introdurre uno store nuovo. Se la lettura
  // fallisce non si blocca la richiesta — il freno è una cortesia, non una
  // misura di sicurezza.
  try {
    const since = new Date(Date.now() - THROTTLE_MINUTES * 60_000).toISOString();
    const { data: recent } = await admin
      .from("email_log")
      .select("id")
      .eq("template", "password_reset")
      .contains("to_addresses", [address])
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      // Silenzio: chi ha già ricevuto il link non deve sapere di essere stato
      // frenato, e chi sta tentando indirizzi altrui non deve capire nulla.
      return { ok: true };
    }
  } catch {
    // ignorata di proposito
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: address,
    options: { redirectTo },
  });

  // Indirizzo sconosciuto: `generateLink` fallisce. Si esce come se fosse
  // andato tutto bene.
  if (error || !data?.properties?.action_link) {
    return { ok: true };
  }

  const name =
    (data.user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "ciao";

  const sent = await sendTransactional({
    key: "password_reset",
    to: address,
    params: {
      name,
      actionUrl: data.properties.action_link,
      expiresLabel: EXPIRES_LABEL,
    },
    subjectPreview: "Reimposta la tua password",
  });

  // Qualunque esito diverso da "spedita" fa scattare il ripiego, non solo
  // `skipped`: finché il dominio non è verificato Brevo può anche rifiutare
  // il mittente e rispondere con un errore. In entrambi i casi il link è
  // stato generato ma nessuno lo ha ricevuto, e senza ripiego la persona
  // resterebbe fuori senza capire perché.
  if (!sent.ok) {
    return await fallback(address, redirectTo);
  }

  return { ok: true };
}

async function fallback(address: string, redirectTo: string): Promise<Result> {
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(address, { redirectTo });
  } catch {
    // Anche qui si tace: l'esito visibile non deve dipendere dall'esistenza
    // dell'account né dallo stato del provider.
  }
  return { ok: true };
}
