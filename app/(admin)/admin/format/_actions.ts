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


/**
 * Collega un video a un format già salvato, subito dopo il caricamento.
 * Stesso motivo dell'omologa per gli eventi: senza, il video resta appeso nel
 * modulo e un errore di validazione su un altro campo lo fa perdere.
 * Si APPENDE leggendo l'array corrente, non si riscrive da fuori.
 */
export async function attachFormatVideo(formatId: string, url: string) {
  await requireAdminPageAccess("format");
  if (!formatId || !url) return { ok: false as const, error: "Parametri mancanti" };

  const admin = createAdminClient();
  const { data: format, error: letturaErr } = await admin
    .from("formats")
    .select("videos")
    .eq("id", formatId)
    .maybeSingle();
  if (letturaErr) return { ok: false as const, error: letturaErr.message };
  if (!format) return { ok: false as const, error: "Format non trovato" };

  const attuali = Array.isArray(format.videos) ? (format.videos as string[]) : [];
  if (attuali.includes(url)) return { ok: true as const };

  const { error } = await admin
    .from("formats")
    .update({ videos: [...attuali, url] })
    .eq("id", formatId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/format");
  revalidatePath("/format");
  return { ok: true as const };
}
