"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatSchema, type FormatInput } from "@/lib/validators/schemas";
import { slugify } from "@/lib/utils";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "superadmin")
    return { ok: false as const, error: "Permessi insufficienti" };
  return { ok: true as const, user, db: admin };
}

function revalidateAll(slug?: string) {
  revalidatePath("/admin/format");
  revalidatePath("/format");
  if (slug) revalidatePath(`/format/${slug}`);
}

export async function createFormat(input: FormatInput) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = formatSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const slugBase = data.slug?.trim() || slugify(data.title);
  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;

  const { error } = await ctx.db.from("formats").insert({
    title: data.title,
    slug,
    tagline: data.tagline ?? null,
    description: data.description ?? null,
    cover_image: data.cover_image ?? null,
    gallery: data.gallery ?? [],
    videos: data.videos ?? [],
    icon: data.icon ?? null,
    order_index: data.order_index ?? 0,
    details: data.details ?? null,
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
    published: data.published ?? true,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidateAll(slug);
  return { ok: true as const };
}

export async function updateFormat(id: string, input: FormatInput) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = formatSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const { error } = await ctx.db
    .from("formats")
    .update({
      title: data.title,
      tagline: data.tagline ?? null,
      description: data.description ?? null,
      cover_image: data.cover_image ?? null,
      gallery: data.gallery ?? [],
      videos: data.videos ?? [],
      icon: data.icon ?? null,
      order_index: data.order_index ?? 0,
      details: data.details ?? null,
      seo_title: data.seo_title ?? null,
      seo_description: data.seo_description ?? null,
      published: data.published ?? true,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}

export async function deleteFormat(id: string) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const { error } = await ctx.db.from("formats").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}
