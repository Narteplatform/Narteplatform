"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { getOwnedArtists } from "@/lib/artist/current";
import { feedbackSchema, platformFeedbackSchema } from "@/lib/validators/schemas";
import {
  applicaModerazione,
  colonnaMancante,
  revalidateArtistProfile,
} from "@/lib/feedback/moderation";

type Result = { ok: true } | { ok: false; error: string };

const submitSchema = feedbackSchema.extend({
  // Casella I1: dichiarazione obbligatoria dell'autore (Regolamento recensioni).
  declared: z.literal(true, {
    message: "Devi confermare la dichiarazione per inviare la recensione",
  }),
});

const replySchema = z.object({
  feedbackId: z.string().uuid(),
  text: z
    .string()
    .trim()
    .min(2, "Almeno 2 caratteri")
    .max(1000, "Massimo 1000 caratteri"),
});

export async function submitFeedback(input: {
  booking_request_id: string;
  rating: number;
  body: string;
  declared: true;
}): Promise<Result> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };

  const admin = createAdminClient();
  // Verifica organizer
  const { data: organizer } = await admin
    .from("organizers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!organizer) return { ok: false, error: "Solo gli organizzatori possono lasciare feedback" };

  const { data: booking } = await admin
    .from("booking_requests")
    .select("id, organizer_id, artist_id, status, event_date")
    .eq("id", parsed.data.booking_request_id)
    .maybeSingle();
  if (!booking) return { ok: false, error: "Booking non trovato" };
  if (booking.organizer_id !== organizer.id) return { ok: false, error: "Non autorizzato" };
  if (booking.status !== "confermata") {
    return { ok: false, error: "Solo per eventi confermati" };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (booking.event_date >= today) {
    return { ok: false, error: "Disponibile solo dopo la data dell'evento" };
  }

  const riga = {
    booking_request_id: booking.id,
    organizer_id: organizer.id,
    artist_id: booking.artist_id,
    rating: parsed.data.rating,
    body: parsed.data.body,
  };
  let { error } = await admin
    .from("feedback")
    .insert({ ...riga, declared_at: new Date().toISOString() });
  if (error && colonnaMancante(error)) {
    // Migration 0066 non ancora applicata: la dichiarazione è già stata
    // pretesa dal form, manca solo dove archiviarne la data.
    ({ error } = await admin.from("feedback").insert(riga));
  }
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Hai già inviato un feedback per questo evento" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/organizzatore/feedback");
  revalidatePath("/dashboard/feedback");
  revalidatePath("/admin/feedback");
  await revalidateArtistProfile(booking.artist_id);
  return { ok: true };
}

const motivoSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(10, "La motivazione deve avere almeno 10 caratteri").max(1000),
});

async function moderaRecensione(
  azione: "nascondi" | "ripristina" | "elimina",
  id: string,
  reason: string
): Promise<Result> {
  const parsed = motivoSchema.safeParse({ id, reason });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const user = await requireAdminPageAccess("recensioni");
  return applicaModerazione({
    feedbackId: parsed.data.id,
    azione,
    reason: parsed.data.reason,
    actorId: user.id,
  });
}

/**
 * Nasconde una recensione visibile o ripristina una nascosta.
 * La motivazione è obbligatoria e viene registrata e comunicata a autore e artista.
 */
export async function toggleFeedbackHidden(id: string, reason: string): Promise<Result> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("feedback").select("hidden").eq("id", id).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Feedback non trovato" };
  return moderaRecensione(data.hidden ? "ripristina" : "nascondi", id, reason);
}

/**
 * Cancellazione LOGICA: la riga resta (deleted_at) e la stessa data non si può
 * recensire di nuovo. Con motivazione obbligatoria.
 */
export async function deleteFeedback(id: string, reason: string): Promise<Result> {
  return moderaRecensione("elimina", id, reason);
}

/**
 * Risposta pubblica dell'artista a una recensione (una sola, sovrascrivibile).
 * Nessun gate di piano per scrivere: è visibile sul profilo solo dove lo è la
 * recensione.
 */
export async function replyToFeedback(feedbackId: string, text: string): Promise<Result> {
  const parsed = replySchema.safeParse({ feedbackId, text });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };

  const fb = await leggiRecensionePropria(user.id, parsed.data.feedbackId);
  if (!fb.ok) return fb;

  const admin = createAdminClient();
  const { error } = await admin
    .from("feedback")
    .update({ artist_reply: parsed.data.text, artist_reply_at: new Date().toISOString() })
    .eq("id", fb.id);
  if (error) {
    if (colonnaMancante(error)) {
      return { ok: false, error: "La risposta pubblica non è ancora attiva. Riprova tra poco." };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/feedback");
  await revalidateArtistProfile(fb.artistId);
  return { ok: true };
}

/** Rimuove la propria risposta pubblica. Agisce solo sulla risposta dell'artista. */
export async function removeFeedbackReply(feedbackId: string): Promise<Result> {
  const parsed = z.string().uuid().safeParse(feedbackId);
  if (!parsed.success) return { ok: false, error: "Dati non validi" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };

  const fb = await leggiRecensionePropria(user.id, parsed.data);
  if (!fb.ok) return fb;

  const admin = createAdminClient();
  const { error } = await admin
    .from("feedback")
    .update({ artist_reply: null, artist_reply_at: null })
    .eq("id", fb.id);
  if (error) {
    if (colonnaMancante(error)) return { ok: false, error: "Funzione non ancora attiva." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/feedback");
  await revalidateArtistProfile(fb.artistId);
  return { ok: true };
}

/** Verifica che la recensione riguardi uno dei profili artista dell'utente. */
async function leggiRecensionePropria(
  userId: string,
  feedbackId: string
): Promise<{ ok: true; id: string; artistId: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feedback")
    .select("id, artist_id")
    .eq("id", feedbackId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Recensione non trovata" };
  const posseduti = await getOwnedArtists(userId);
  if (!posseduti.some((a) => a.id === data.artist_id)) {
    return { ok: false, error: "Non autorizzato" };
  }
  return { ok: true, id: data.id, artistId: data.artist_id };
}

export async function submitPlatformFeedback(input: {
  category?: "generale" | "bug" | "suggerimento" | "altro";
  subject?: string;
  body: string;
  rating?: number;
}): Promise<Result> {
  const parsed = platformFeedbackSchema.safeParse({
    category: input.category ?? "generale",
    subject: input.subject ?? "",
    body: input.body,
    rating: input.rating ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile?.role ?? "user") as
    | "superadmin"
    | "artist"
    | "user"
    | "organizer"
    | "consultant";
  if (role !== "artist" && role !== "organizer") {
    return { ok: false, error: "Solo artisti e organizzatori possono inviare feedback" };
  }

  const { error } = await admin.from("platform_feedback").insert({
    user_id: user.id,
    role,
    category: parsed.data.category,
    subject: parsed.data.subject ?? null,
    body: parsed.data.body,
    rating: parsed.data.rating ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/feedback");
  revalidatePath("/organizzatore/feedback");
  revalidatePath("/admin/feedback");
  return { ok: true };
}

export async function updatePlatformFeedbackStatus(input: {
  id: string;
  status: "new" | "read" | "archived";
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "superadmin") return { ok: false, error: "Solo superadmin" };

  const { error } = await admin
    .from("platform_feedback")
    .update({ status: input.status })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/feedback");
  return { ok: true };
}

export async function deletePlatformFeedback(input: { id: string }): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato" };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "superadmin") return { ok: false, error: "Solo superadmin" };

  const { error } = await admin.from("platform_feedback").delete().eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/feedback");
  return { ok: true };
}
