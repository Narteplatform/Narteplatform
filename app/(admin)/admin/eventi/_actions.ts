"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { eventSchema, type EventInput } from "@/lib/validators/schemas";
import { slugify } from "@/lib/utils";
import { requireAdminPageAccess } from "@/lib/admin/permissions";

// Una Server Action è un endpoint HTTP raggiungibile direttamente: il solo
// controllo del ruolo superadmin non bastava, perché un superadmin delegato
// senza accesso alla pagina "Eventi" poteva comunque invocare queste azioni
// (es. deleteEvent). requireAdminPageAccess applica anche il permesso per-pagina.

function revalidateAll() {
  revalidatePath("/admin/eventi");
  revalidatePath("/eventi");
  revalidatePath("/");
}

export async function createEvent(input: EventInput) {
  const user = await requireAdminPageAccess("eventi");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const slugBase = slugify(data.title);
  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;

  const admin = createAdminClient();
  const { error } = await admin.from("events").insert({
    title: data.title,
    slug,
    category: data.category,
    date: data.date,
    end_at: data.endAt ?? null,
    city: data.city,
    venue: data.venue ?? null,
    price: data.price ?? null,
    cover_image: data.coverImage ?? null,
    gallery: data.gallery ?? [],
    videos: data.videos ?? [],
    ticket_url: data.ticketUrl ?? null,
    description: data.description ?? null,
    featured: data.featured ?? false,
    created_by: user.id,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}

export async function updateEvent(id: string, input: EventInput) {
  await requireAdminPageAccess("eventi");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({
      title: data.title,
      category: data.category,
      date: data.date,
      end_at: data.endAt ?? null,
      city: data.city,
      venue: data.venue ?? null,
      price: data.price ?? null,
      cover_image: data.coverImage ?? null,
      gallery: data.gallery ?? [],
      videos: data.videos ?? [],
      ticket_url: data.ticketUrl ?? null,
      description: data.description ?? null,
      featured: data.featured ?? false,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}

export async function deleteEvent(id: string) {
  await requireAdminPageAccess("eventi");
  const admin = createAdminClient();
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}
