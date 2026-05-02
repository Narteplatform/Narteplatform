"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { contactSchema, type ContactInput } from "@/lib/validators/schemas";
import { sendEmail } from "@/lib/emails/send";
import ContactMessageEmail from "@/lib/emails/templates/ContactMessageEmail";

export async function submitContact(input: ContactInput) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Dati non validi" };
  }
  const data = parsed.data;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject ?? null,
      message: data.message,
    });
    if (error) {
      return { ok: false as const, error: "Errore salvataggio messaggio" };
    }
  } catch (e) {
    return { ok: false as const, error: "Errore server" };
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `Nuovo messaggio da ${data.name}`,
      replyTo: data.email,
      react: ContactMessageEmail({
        name: data.name,
        email: data.email,
        subject: data.subject ?? null,
        message: data.message,
      }),
    });
  }

  return { ok: true as const };
}
