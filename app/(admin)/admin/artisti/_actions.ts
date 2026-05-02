"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

async function ensureAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "superadmin") return { ok: false as const, error: "Permessi insufficienti" };
  return { ok: true as const, user };
}

export async function approveApplication(applicationId: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;

  const admin = createAdminClient();
  const { data: app, error: appErr } = await admin
    .from("artist_applications")
    .select("*")
    .eq("id", applicationId)
    .single();
  if (appErr || !app) return { ok: false as const, error: "Candidatura non trovata" };

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`;
  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(app.email, {
    redirectTo,
    data: { full_name: app.name },
  });
  if (inviteErr && !inviteErr.message.toLowerCase().includes("already")) {
    return { ok: false as const, error: inviteErr.message };
  }

  let userId = invite?.user?.id ?? null;
  if (!userId) {
    const { data: list } = await admin.auth.admin.listUsers();
    userId = list.users.find((u) => u.email?.toLowerCase() === app.email.toLowerCase())?.id ?? null;
  }

  if (userId) {
    await admin.from("profiles").update({ role: "artist" }).eq("id", userId);
  }

  const slugBase = slugify(app.stage_name);
  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
  const { error: insertErr } = await admin.from("artists").insert({
    user_id: userId,
    stage_name: app.stage_name,
    slug,
    bio: app.bio,
    genre: app.genre,
    social_links: app.links,
    status: "approved",
  });
  if (insertErr) return { ok: false as const, error: insertErr.message };

  await admin.from("artist_applications").update({ status: "approved" }).eq("id", applicationId);

  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function rejectApplication(applicationId: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_applications")
    .update({ status: "rejected" })
    .eq("id", applicationId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/artisti");
  return { ok: true as const };
}

export async function updateArtistStatus(artistId: string, status: "pending" | "approved" | "rejected") {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();
  const { error } = await admin.from("artists").update({ status }).eq("id", artistId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function createArtistManual(input: {
  stage_name: string;
  email?: string;
  city?: string;
  genre?: string;
  bio?: string;
  cover_image?: string;
}) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const admin = createAdminClient();

  let userId: string | null = null;
  if (input.email) {
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`;
    const { data: invite } = await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo,
      data: { full_name: input.stage_name },
    });
    userId = invite?.user?.id ?? null;
    if (!userId) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email?.toLowerCase() === input.email!.toLowerCase())?.id ?? null;
    }
    if (userId) await admin.from("profiles").update({ role: "artist" }).eq("id", userId);
  }

  const slug = `${slugify(input.stage_name)}-${Date.now().toString(36).slice(-4)}`;
  const { error } = await admin.from("artists").insert({
    user_id: userId,
    stage_name: input.stage_name,
    slug,
    city: input.city ?? null,
    genre: input.genre ? input.genre.split(",").map((g) => g.trim()).filter(Boolean) : [],
    bio: input.bio ?? null,
    cover_image: input.cover_image ?? null,
    status: "approved",
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/artisti");
  revalidatePath("/artisti");
  return { ok: true as const };
}
