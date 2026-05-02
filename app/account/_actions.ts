"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  accountProfileSchema,
  passwordChangeSchema,
  type AccountProfileInput,
  type PasswordChangeInput,
} from "@/lib/validators/schemas";

export async function updateAccountProfile(input: AccountProfileInput) {
  const parsed = accountProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  // Service role: la policy di update self funzionerebbe, ma per evitare
  // qualunque interferenza con le policy ricorsive sui profiles usiamo l'admin
  // client (l'id è verificato server-side).
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      avatar_url: parsed.data.avatarUrl ?? null,
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/profilo");
  revalidatePath("/dashboard/profilo");
  return { ok: true as const };
}

export async function changePassword(input: PasswordChangeInput) {
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Almeno 8 caratteri" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
