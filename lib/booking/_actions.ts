"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { finalPriceProposeSchema } from "@/lib/validators/schemas";
import { notifyFinalPrice } from "@/lib/chat/notify";

type Result =
  | { ok: true; status: "proposed" | "confirmed" | "reset" }
  | { ok: false; error: string };

/**
 * Risolve il ruolo dell'utente corrente rispetto al booking:
 * 'artist' se è il proprietario artista, 'organizer' se è l'organizzatore.
 *
 * Il superadmin NON può agire sul compenso. Il riquadro «Compenso concordato –
 * promemoria» è un'annotazione fra le due parti: se il Team potesse proporlo o
 * confermarlo al posto di una di loro, N'arte entrerebbe nella parte economica
 * dell'accordo, che è esattamente ciò che i termini escludono.
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

  const [{ data: organizer }, { data: artist }] = await Promise.all([
    admin.from("organizers").select("id, user_id").eq("id", booking.organizer_id).maybeSingle(),
    admin.from("artists").select("id, user_id").eq("id", booking.artist_id).maybeSingle(),
  ]);

  let role: "organizer" | "artist" | null = null;
  if (organizer?.user_id === user.id) role = "organizer";
  else if (artist?.user_id === user.id) role = "artist";

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
  // Best effort: notifyFinalPrice non solleva.
  await notifyFinalPrice(parsed.data.booking_id, "proposed", ctx.user.id);
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
  await notifyFinalPrice(input.booking_id, "confirmed", ctx.user.id);
  return { ok: true, status: "confirmed" };
}

export async function resetFinalPrice(input: { booking_id: string }): Promise<Result> {
  const ctx = await resolveBookingRole(input.booking_id);
  if (!ctx) return { ok: false, error: "Non autorizzato" };
  // Una proposta non ancora confermata si può ritirare. Un importo confermato
  // da entrambi no: una sola parte non può cancellare ciò che è stato annotato
  // insieme. Per cambiarlo si fa una nuova proposta, che l'altra parte deve
  // confermare di nuovo.
  if (ctx.booking.final_price_confirmed_at) {
    return {
      ok: false,
      error: "Il compenso è già stato confermato da entrambi: per cambiarlo proponi un nuovo importo.",
    };
  }
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
