import "server-only";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { ADMIN_PAGE_KEYS, type AdminPageKey } from "@/lib/validators/schemas";

/**
 * Identifica il superadmin "root" tramite la variabile d'ambiente
 * SUPERADMIN_EMAIL (allineata al GUC `app.superadmin_email`).
 */
export function isRootSuperadminEmail(email: string | null | undefined): boolean {
  const root = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!root) return false;
  return (email ?? "").trim().toLowerCase() === root;
}

/**
 * Ritorna le page_key visibili per l'utente corrente lato admin.
 * Root superadmin: tutte. Altri superadmin: solo quelle marcate can_view.
 */
export async function getAllowedAdminPages(
  userId: string,
  email: string | null | undefined
): Promise<Set<AdminPageKey>> {
  if (isRootSuperadminEmail(email)) {
    return new Set<AdminPageKey>(ADMIN_PAGE_KEYS);
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_page_permissions")
    .select("page_key, can_view")
    .eq("user_id", userId);
  const allowed = new Set<AdminPageKey>();
  // Sempre accessibili: overview e profilo
  allowed.add("overview");
  allowed.add("profilo");
  for (const row of data ?? []) {
    if (row.can_view && (ADMIN_PAGE_KEYS as readonly string[]).includes(row.page_key)) {
      allowed.add(row.page_key as AdminPageKey);
    }
  }

  // Rete di sicurezza contro il blocco accidentale.
  //
  // Questo superadmin non risulta root e non ha deleghe proprie. Prima che i
  // gate arrivassero anche nelle Server Actions la cosa era innocua: vedeva
  // poche voci di menu ma poteva operare. Ora no, e le due strade per finire
  // qui per sbaglio sono concrete: SUPERADMIN_EMAIL non configurata
  // sull'ambiente di produzione, oppure un dominio email scritto diversamente.
  // Il risultato sarebbe il proprietario chiuso fuori dal proprio pannello,
  // senza nessuno che possa riaprirglielo — perché riaprirlo si fa da /admin.
  //
  // Se nel sistema non esiste NESSUNA delega, il controllo granulare non è in
  // uso: si torna al comportamento di prima (superadmin pieno) e lo si segnala
  // nei log. Appena si crea la prima delega da /admin/impostazioni, il sistema
  // si attiva e questa scorciatoia smette di applicarsi.
  if (allowed.size === 2) {
    const { count } = await admin
      .from("admin_page_permissions")
      .select("user_id", { head: true, count: "exact" });
    if ((count ?? 0) === 0) {
      logger.warn(
        "admin/permissions",
        "Superadmin senza deleghe e non riconosciuto come root: verifica SUPERADMIN_EMAIL sull'ambiente. Accesso concesso per non bloccare l'amministrazione."
      );
      return new Set<AdminPageKey>(ADMIN_PAGE_KEYS);
    }
  }

  return allowed;
}

/**
 * Guard server-side: ridireziona a /admin se l'utente non può vedere la pagina.
 * Da usare nelle pagine admin gate per pagina specifica.
 */
export async function requireAdminPageAccess(page: AdminPageKey) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile?.role !== "superadmin") redirect("/");
  const allowed = await getAllowedAdminPages(user.id, user.email ?? null);
  if (!allowed.has(page)) redirect("/admin");
  return user;
}

/**
 * Guard per la sezione impostazioni: solo root.
 */
export async function requireRootSuperadmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile?.role !== "superadmin" || !isRootSuperadminEmail(user.email)) {
    redirect("/admin");
  }
  return user;
}
