"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { feedbackSchema, platformFeedbackSchema } from "@/lib/validators/schemas";

type Result = { ok: true } | { ok: false; error: string };

export async function submitFeedback(input: {
  booking_request_id: string;
  rating: number;
  body: string;
}): Promise<Result> {
  const parsed = feedbackSchema.safeParse(input);
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

  const { error } = await admin.from("feedback").insert({
    booking_request_id: booking.id,
    organizer_id: organizer.id,
    artist_id: booking.artist_id,
    rating: parsed.data.rating,
    body: parsed.data.body,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Hai già inviato un feedback per questo evento" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/organizzatore/feedback");
  revalidatePath("/dashboard/feedback");
  revalidatePath("/admin/feedback");
  return { ok: true };
}

export async function toggleFeedbackHidden(input: { id: string }): Promise<Result> {
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

  const { data: fb } = await admin
    .from("feedback")
    .select("id, hidden")
    .eq("id", input.id)
    .maybeSingle();
  if (!fb) return { ok: false, error: "Feedback non trovato" };

  const { error } = await admin
    .from("feedback")
    .update({ hidden: !fb.hidden })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/feedback");
  revalidatePath("/dashboard/feedback");
  return { ok: true };
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

export async function deleteFeedback(input: { id: string }): Promise<Result> {
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

  const { error } = await admin.from("feedback").delete().eq("id", input.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/feedback");
  revalidatePath("/dashboard/feedback");
  return { ok: true };
}
