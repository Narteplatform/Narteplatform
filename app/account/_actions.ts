"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  accountProfileSchema,
  passwordChangeAuthenticatedSchema,
  type AccountProfileInput,
  type PasswordChangeAuthenticatedInput,
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
  revalidatePath("/dashboard/profilo-artista");
  revalidatePath("/organizzatore/profilo");
  return { ok: true as const };
}

export async function changePassword(input: PasswordChangeAuthenticatedInput) {
  const parsed = passwordChangeAuthenticatedSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Non autorizzato" };

  // Riprova le credenziali attuali prima di cambiarle. Avere la sessione non
  // basta: chi si è impossessato di un cookie potrebbe altrimenti cambiare la
  // password e chiudere fuori il proprietario, trasformando un accesso
  // temporaneo in una perdita definitiva dell'account.
  const { error: verifica } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifica) {
    return { ok: false as const, error: "La password attuale non è corretta" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
