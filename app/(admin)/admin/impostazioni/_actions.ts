"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRootSuperadmin } from "@/lib/admin/permissions";
import {
  inviteSuperadminSchema,
  pagePermissionsSchema,
  ADMIN_PAGE_KEYS,
  type AdminPageKey,
} from "@/lib/validators/schemas";

type Result = { ok: true } | { ok: false; error: string };

/** Genera una password robusta (lettere, cifre, simboli) lato server. */
function generateStrongPassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;
  const bytes = randomBytes(length);
  const required = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length],
  ];
  const rest: string[] = [];
  for (let i = required.length; i < length; i++) {
    rest.push(all[bytes[i] % all.length]);
  }
  // Mescola in modo deterministico usando ulteriori byte casuali.
  const chars = [...required, ...rest];
  const shuffle = randomBytes(chars.length);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffle[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export async function inviteSuperadmin(formData: FormData): Promise<Result> {
  await requireRootSuperadmin();
  const parsed = inviteSuperadminSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const { email, full_name } = parsed.data;
  const admin = createAdminClient();

  // Magic link invite. Imposta role=superadmin in raw_user_meta_data:
  // il trigger handle_new_user() già legge questo campo (vedi 0008).
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: "superadmin",
      full_name: full_name ?? null,
    },
  });
  if (error) return { ok: false, error: error.message };

  // Pre-imposta permessi default per il nuovo admin (overview + profilo).
  const newUserId = data.user?.id;
  if (newUserId) {
    const defaultPages: AdminPageKey[] = ["overview", "profilo"];
    await admin.from("admin_page_permissions").upsert(
      defaultPages.map((p) => ({
        user_id: newUserId,
        page_key: p,
        can_view: true,
      }))
    );
    // Logga invito
    await admin.from("email_log").insert({
      to_addresses: [email],
      subject: "Invito superadmin N'arte",
      template: "supabase_invite",
      status: "sent",
      meta: { kind: "superadmin_invite", target_user_id: newUserId },
    });
  }

  revalidatePath("/admin/impostazioni");
  return { ok: true };
}

export async function updatePagePermissions(formData: FormData): Promise<Result> {
  await requireRootSuperadmin();
  const pageKeysRaw = formData.getAll("page_keys").map(String);
  const parsed = pagePermissionsSchema.safeParse({
    user_id: formData.get("user_id"),
    page_keys: pageKeysRaw,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const { user_id, page_keys } = parsed.data;
  const admin = createAdminClient();

  // Strategy: cancella tutto, reinserisci quelle spuntate. Overview+profilo forzate.
  const finalSet = new Set<AdminPageKey>(["overview", "profilo", ...page_keys]);

  await admin.from("admin_page_permissions").delete().eq("user_id", user_id);
  if (finalSet.size > 0) {
    const rows = Array.from(finalSet).map((p) => ({
      user_id,
      page_key: p,
      can_view: true,
    }));
    const { error } = await admin.from("admin_page_permissions").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin");
  return { ok: true };
}

export async function removeSuperadmin(formData: FormData): Promise<Result> {
  await requireRootSuperadmin();
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { ok: false, error: "user_id mancante" };
  const admin = createAdminClient();

  // Non degradare il root.
  const { data: target } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Utente non trovato" };

  // Degrada a 'user' (non eliminiamo l'account).
  const { error } = await admin
    .from("profiles")
    .update({ role: "user" })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await admin.from("admin_page_permissions").delete().eq("user_id", userId);

  revalidatePath("/admin/impostazioni");
  return { ok: true };
}

export const ALL_PAGE_KEYS = ADMIN_PAGE_KEYS;

// =========================================
// Credenziali consulente
// =========================================

type CredentialsResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

const consultantCredentialsSchema = z
  .object({
    consultantId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    email: z.string().email("Email non valida").optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.consultantId || d.email, {
    message: "Seleziona un consulente o inserisci un'email",
  });

/**
 * Genera le credenziali di accesso per un consulente:
 * - se viene passato `consultantId` (consulente esistente senza user_id) crea
 *   l'account auth e lo collega a quel record;
 * - altrimenti crea (o riusa) un record consulente per l'email indicata.
 * Imposta profiles.role='consultant' e consultants.user_id. La password
 * generata viene restituita UNA SOLA VOLTA per la visualizzazione in UI.
 * Solo il root superadmin può eseguire questa azione.
 */
export async function generateConsultantCredentials(input: {
  consultantId?: string;
  email?: string;
}): Promise<CredentialsResult> {
  await requireRootSuperadmin();
  const parsed = consultantCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const admin = createAdminClient();

  // Risolvi il consulente target: per id oppure per email (creando il record se serve).
  let consultantId = parsed.data.consultantId ?? null;
  let consultantName = "Consulente";
  let email = parsed.data.email ?? null;

  if (consultantId) {
    const { data: existing } = await admin
      .from("consultants")
      .select("id, name, email, user_id")
      .eq("id", consultantId)
      .maybeSingle();
    const row = existing as
      | { id: string; name: string; email: string | null; user_id: string | null }
      | null;
    if (!row) return { ok: false, error: "Consulente non trovato" };
    if (row.user_id) return { ok: false, error: "Account già collegato a questo consulente" };
    consultantName = row.name;
    email = email ?? row.email;
    if (!email) {
      return { ok: false, error: "Email mancante: aggiungila al consulente o indicala qui" };
    }
  } else {
    if (!email) return { ok: false, error: "Email obbligatoria" };
    // Riusa un consulente esistente con questa email se non ha ancora un account.
    const { data: byEmail } = await admin
      .from("consultants")
      .select("id, name, user_id")
      .eq("email", email)
      .maybeSingle();
    const row = byEmail as { id: string; name: string; user_id: string | null } | null;
    if (row) {
      if (row.user_id) return { ok: false, error: "Account già collegato a questo consulente" };
      consultantId = row.id;
      consultantName = row.name;
    } else {
      const { data: created, error: createErr } = await admin
        .from("consultants")
        .insert({ name: email.split("@")[0], email, is_active: true })
        .select("id, name")
        .single();
      if (createErr || !created) {
        return { ok: false, error: createErr?.message ?? "Errore creazione consulente" };
      }
      consultantId = (created as { id: string; name: string }).id;
      consultantName = (created as { id: string; name: string }).name;
    }
  }

  // Crea l'account auth con password generata server-side.
  const password = generateStrongPassword(16);
  const { data: createdUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "consultant", full_name: consultantName },
  });
  if (authErr || !createdUser?.user) {
    return { ok: false, error: authErr?.message ?? "Errore creazione account" };
  }
  const userId = createdUser.user.id;

  // Imposta esplicitamente il ruolo e collega il consulente.
  await admin
    .from("profiles")
    .update({ role: "consultant", full_name: consultantName })
    .eq("id", userId);

  const { error: linkErr } = await admin
    .from("consultants")
    .update({ user_id: userId, email, updated_at: new Date().toISOString() })
    .eq("id", consultantId);
  if (linkErr) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: linkErr.message };
  }

  revalidatePath("/admin/impostazioni");
  revalidatePath("/admin/consulenza");
  revalidatePath("/admin/consulenza/consulenti");
  return { ok: true, email, password };
}
