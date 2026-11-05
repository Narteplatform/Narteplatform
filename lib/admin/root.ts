import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { isRootSuperadminEmail } from "@/lib/admin/permissions";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { creaNotifica } from "@/lib/notifications";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";

/**
 * Il superadmin root (SUPERADMIN_EMAIL): id ed email.
 *
 * Serve ai processi automatici (cron) che devono firmare un'azione nel registro
 * o avvisare il responsabile. `null` se non è identificabile: in quel caso chi
 * chiama si ferma, non procede con un attore inventato.
 */
export async function trovaRoot(): Promise<{ id: string; email: string } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("id").eq("role", "superadmin").limit(20);
  if (error) {
    logger.error("admin/root", "superadmin non letti:", error.message);
    return null;
  }
  for (const p of data ?? []) {
    const { data: u, error: uErr } = await admin.auth.admin.getUserById(p.id);
    if (uErr || !u?.user?.email) continue;
    if (isRootSuperadminEmail(u.user.email)) return { id: p.id, email: u.user.email };
  }
  logger.error("admin/root", "root non trovato: verifica SUPERADMIN_EMAIL sull'ambiente.");
  return null;
}

/**
 * Avviso al solo root: notifica in-app ed email. L'email riusa la chiave
 * `contact_message` (come `avvisaTeam`): niente template nuovi su Brevo.
 * Best-effort: non solleva mai.
 */
export async function avvisaRoot(
  root: { id: string; email: string },
  input: { kind: string; titolo: string; testo: string; adminPath: string },
): Promise<void> {
  const adminUrl = `${getSiteUrl()}${input.adminPath}`;
  const esiti = await Promise.allSettled([
    creaNotifica({ userId: root.id, kind: input.kind, title: input.titolo, body: input.testo.slice(0, 300), href: input.adminPath }),
    dispatchEmail({
      key: "contact_message",
      to: root.email,
      params: {
        name: "N'arte — processo automatico",
        email: "",
        subject: input.titolo,
        message: input.testo,
        adminUrl,
      },
      subjectPreview: input.titolo,
    }),
  ]);
  for (const e of esiti) {
    if (e.status === "rejected") logger.warn("admin/root", "avviso al root non riuscito:", String(e.reason));
  }
}
