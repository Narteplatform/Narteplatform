"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { formatInterestSchema, type FormatInterestInput } from "@/lib/validators/schemas";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";

export async function submitFormatInterest(input: FormatInterestInput) {
  const parsed = formatInterestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Dati non validi. Controlla i campi e riprova." };
  }
  const data = parsed.data;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("leads").insert({
      artist_id: null,
      contact_name: data.name,
      contact_email: data.email,
      message: data.phone
        ? `Tel: ${data.phone}\n\n${data.message}`
        : data.message,
      source: "format",
      status: "new",
    });
    if (error) {
      return { ok: false as const, error: "Errore durante il salvataggio. Riprova." };
    }
  } catch {
    return { ok: false as const, error: "Errore server. Riprova più tardi." };
  }

  // Finora questo form non avvisava nessuno: il lead finiva in tabella e lì
  // restava, senza che nessuno sapesse di doverlo ricontattare.
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await dispatchEmail({
      key: "public_lead_admin",
      to: adminEmail,
      replyTo: data.email,
      params: {
        source: "Format",
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        message: data.message,
        adminUrl: `${getSiteUrl()}/admin/leads`,
      },
      subjectPreview: `Nuovo lead (Format): ${data.name}`,
    }).catch((e) => console.error("[email] lead format:", e));
  }

  return { ok: true as const };
}
