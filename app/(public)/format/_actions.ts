"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { formatInterestSchema, type FormatInterestInput } from "@/lib/validators/schemas";

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

  return { ok: true as const };
}
