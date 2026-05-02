"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function ensureAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") return { ok: false as const, error: "Permessi insufficienti" };
  return { ok: true as const };
}

export async function createGenre(name: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { ok: false as const, error: "Nome non valido (2-60 caratteri)" };
  }
  const admin = createAdminClient();
  const { data: max } = await admin
    .from("genres")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (max?.order_index ?? 0) + 10;
  const { error } = await admin.from("genres").insert({ name: trimmed, order_index: nextOrder });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/generi");
  return { ok: true as const };
}

export async function deleteGenre(id: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin.from("genres").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/generi");
  return { ok: true as const };
}
