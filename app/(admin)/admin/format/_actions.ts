"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { formatSchema, type FormatInput } from "@/lib/validators/schemas";
import { slugify } from "@/lib/utils";
import { requireAdminPageAccess } from "@/lib/admin/permissions";

// Una Server Action è un endpoint HTTP raggiungibile direttamente: il solo
// controllo del ruolo superadmin non bastava, perché un superadmin delegato
// senza accesso alla pagina "Format" poteva comunque invocare queste azioni.
// requireAdminPageAccess applica anche il permesso per-pagina (chiave dedicata
// "format" in ADMIN_PAGE_KEYS, distinta da "eventi").

function revalidateAll(slug?: string) {
  revalidatePath("/admin/format");
  revalidatePath("/format");
  if (slug) revalidatePath(`/format/${slug}`);
}

export async function createFormat(input: FormatInput) {
  await requireAdminPageAccess("format");
  const parsed = formatSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const slugBase = data.slug?.trim() || slugify(data.title);
  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;

  const admin = createAdminClient();
  const { error } = await admin.from("formats").insert({
    title: data.title,
    slug,
    tagline: data.tagline ?? null,
    description: data.description ?? null,
    cover_image: data.cover_image ?? null,
    gallery: data.gallery ?? [],
    videos: data.videos ?? [],
    icon: data.icon ?? null,
    order_index: data.order_index ?? 0,
    details: data.details ?? {},
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
    published: data.published ?? true,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidateAll(slug);
  return { ok: true as const };
}

export async function updateFormat(id: string, input: FormatInput) {
  await requireAdminPageAccess("format");
  const parsed = formatSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
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
      details: data.details ?? {},
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
  await requireAdminPageAccess("format");
  const admin = createAdminClient();
  const { error } = await admin.from("formats").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}
