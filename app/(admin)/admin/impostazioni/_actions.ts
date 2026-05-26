"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRootSuperadmin } from "@/lib/admin/permissions";
import {
  inviteSuperadminSchema,
  pagePermissionsSchema,
  ADMIN_PAGE_KEYS,
  type AdminPageKey,
} from "@/lib/validators/schemas";

type Result = { ok: true } | { ok: false; error: string };

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
