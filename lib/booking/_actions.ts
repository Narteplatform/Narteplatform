"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { finalPriceProposeSchema } from "@/lib/validators/schemas";

type Result =
  | { ok: true; status: "proposed" | "confirmed" | "reset" }
  | { ok: false; error: string };

/**
 * Risolve il ruolo dell'utente corrente rispetto al booking:
 * 'artist' se è il proprietario artista, 'organizer' se è l'organizzatore.
 * superadmin può agire come artist (fallback).
 */
async function resolveBookingRole(bookingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("booking_requests")
    .select(
      "id, status, organizer_id, artist_id, final_price, final_price_proposed_by, final_price_confirmed_by, final_price_proposed_at, final_price_confirmed_at"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;

  const [{ data: organizer }, { data: artist }, { data: profile }] = await Promise.all([
    admin.from("organizers").select("id, user_id").eq("id", booking.organizer_id).maybeSingle(),
    admin.from("artists").select("id, user_id").eq("id", booking.artist_id).maybeSingle(),
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  let role: "organizer" | "artist" | null = null;
  if (organizer?.user_id === user.id) role = "organizer";
  else if (artist?.user_id === user.id) role = "artist";
  else if (profile?.role === "superadmin") role = "artist";

  return role ? { user, booking, role } : null;
}

export async function proposeFinalPrice(input: { booking_id: string; price: number }): Promise<Result> {
  const parsed = finalPriceProposeSchema.safeParse({
    booking_id: input.booking_id,
    price: input.price,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const ctx = await resolveBookingRole(parsed.data.booking_id);
  if (!ctx) return { ok: false, error: "Non autorizzato" };
  if (ctx.booking.status !== "confermata") {
    return { ok: false, error: "Disponibile solo per booking confermati" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("booking_requests")
    .update({
      final_price: parsed.data.price,
      final_price_proposed_by: ctx.user.id,
      final_price_proposed_at: new Date().toISOString(),
      // reset conferma se la proposta viene aggiornata
      final_price_confirmed_by: null,
      final_price_confirmed_at: null,
    })
    .eq("id", parsed.data.booking_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/leads");
  revalidatePath("/organizzatore/richieste");
  revalidatePath("/organizzatore");
  return { ok: true, status: "proposed" };
}

export async function confirmFinalPrice(input: { booking_id: string }): Promise<Result> {
  const ctx = await resolveBookingRole(input.booking_id);
  if (!ctx) return { ok: false, error: "Non autorizzato" };
  if (ctx.booking.status !== "confermata") {
    return { ok: false, error: "Disponibile solo per booking confermati" };
  }
  if (ctx.booking.final_price == null) {
    return { ok: false, error: "Nessun prezzo proposto da confermare" };
  }
  if (ctx.booking.final_price_proposed_by === ctx.user.id) {
    return { ok: false, error: "Deve confermare l'altra parte" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("booking_requests")
    .update({
      final_price_confirmed_by: ctx.user.id,
      final_price_confirmed_at: new Date().toISOString(),
    })
    .eq("id", input.booking_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/leads");
  revalidatePath("/organizzatore/richieste");
  revalidatePath("/organizzatore");
  return { ok: true, status: "confirmed" };
}

export async function resetFinalPrice(input: { booking_id: string }): Promise<Result> {
  const ctx = await resolveBookingRole(input.booking_id);
  if (!ctx) return { ok: false, error: "Non autorizzato" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("booking_requests")
    .update({
      final_price: null,
      final_price_proposed_by: null,
      final_price_proposed_at: null,
      final_price_confirmed_by: null,
      final_price_confirmed_at: null,
    })
    .eq("id", input.booking_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/leads");
  revalidatePath("/organizzatore/richieste");
  return { ok: true, status: "reset" };
}
