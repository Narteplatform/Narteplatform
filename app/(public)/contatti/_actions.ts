"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { contactSchema, type ContactInput } from "@/lib/validators/schemas";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
import ContactMessageEmail from "@/lib/emails/templates/ContactMessageEmail";

export async function submitContact(input: ContactInput) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Dati non validi" };
  }
  const data = parsed.data;

  try {
    const supabase = createAdminClient();

    // Salvataggio in contact_messages (retrocompatibilità)
    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject ?? null,
      message: data.message,
    });
    if (error) {
      return { ok: false as const, error: "Errore salvataggio messaggio" };
    }

    // Inserimento lead (source='contatti') — non blocca la risposta se fallisce
    const leadMessage = data.subject
      ? `${data.subject}\n\n${data.message}`
      : data.message;
    await supabase.from("leads").insert({
      artist_id: null,
      contact_name: data.name,
      contact_email: data.email,
      message: leadMessage,
      source: "contatti",
      status: "new",
    });
  } catch (e) {
    return { ok: false as const, error: "Errore server" };
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const params = {
    name: data.name,
    email: data.email,
    subject: data.subject ?? "",
    message: data.message,
    adminUrl: `${getSiteUrl()}/admin/leads`,
  };

  // Nessun invio blocca la risposta all'utente: il messaggio è già salvato,
  // un problema di posta non deve trasformarsi in un errore a schermo.
  await Promise.allSettled([
    adminEmail
      ? dispatchEmail({
          key: "contact_message",
          to: adminEmail,
          params,
          replyTo: data.email,
          fallback: {
            subject: `Nuovo messaggio da ${data.name}`,
            template: "ContactMessage",
            react: ContactMessageEmail({
              name: data.name,
              email: data.email,
              subject: data.subject ?? null,
              message: data.message,
            }),
          },
        })
      : Promise.resolve(),
    // Ricevuta al mittente: prima non esisteva, chi scriveva restava senza
    // conferma che il messaggio fosse partito davvero. Nasce su Brevo e non
    // ha un componente Resend: finché la chiave non è attiva non parte,
    // esattamente come oggi, ma resta tracciata in email_log.
    dispatchEmail({
      key: "contact_receipt",
      to: data.email,
      params,
      subjectPreview: "Abbiamo ricevuto il tuo messaggio — N'arte",
    }),
  ]);

  return { ok: true as const };
}
