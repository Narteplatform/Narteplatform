"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { eventSchema, type EventInput } from "@/lib/validators/schemas";
import { slugify } from "@/lib/utils";

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  // Lettura ruolo via service-role per evitare ricorsione policy.
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

function revalidateAll() {
  revalidatePath("/admin/eventi");
  revalidatePath("/eventi");
  revalidatePath("/");
}

export async function createEvent(input: EventInput) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const slugBase = slugify(data.title);
  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;

  const { error } = await ctx.db.from("events").insert({
    title: data.title,
    slug,
    category: data.category,
    date: data.date,
    city: data.city,
    venue: data.venue ?? null,
    price: data.price ?? null,
    cover_image: data.coverImage ?? null,
    ticket_url: data.ticketUrl ?? null,
    description: data.description ?? null,
    featured: data.featured ?? false,
    created_by: ctx.user.id,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}

export async function updateEvent(id: string, input: EventInput) {
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  const { error } = await ctx.db
    .from("events")
    .update({
      title: data.title,
      category: data.category,
      date: data.date,
      city: data.city,
      venue: data.venue ?? null,
      price: data.price ?? null,
      cover_image: data.coverImage ?? null,
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
  const ctx = await ensureAdmin();
  if (!ctx.ok) return ctx;
  const { error } = await ctx.db.from("events").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}
