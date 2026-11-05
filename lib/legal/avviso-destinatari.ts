import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { isUtenteSospeso } from "@/lib/auth/sospeso";

/** Chiave in site_settings che segna l'invio già fatto per quella data. */
export const chiaveInvioAvviso = (data: string) => `legale.avviso_inviato.${data.replace(/-/g, "")}`;

/** Destinatari del preavviso: tutti gli account con email, non bloccati. */
export async function destinatariAvviso(): Promise<{ ok: true; email: string[] } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const email: string[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { ok: false, error: error.message };
    for (const u of data.users) {
      if (u.email && !isUtenteSospeso(u)) email.push(u.email.toLowerCase());
    }
    if (data.users.length < 1000) break;
  }
  return { ok: true, email: [...new Set(email)] };
}
