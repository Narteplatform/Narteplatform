"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  chatMessageSchema,
  chatOfferSchema,
  type ChatMessageInput,
  type ChatOfferInput,
} from "@/lib/validators/schemas";
import { sendBookingConfirmedEmail } from "@/lib/emails/send";
import type { Role } from "@/lib/supabase/types";
import {
  getConversationsForArtist,
  getConversationsForOrganizer,
  getConversationMeta,
  getMessages,
  type ChatMessage,
  type ChatPartyMeta,
  type ConversationItem,
} from "@/lib/chat/queries";

type ActionOk<T = Record<string, never>> = { ok: true } & T;
type ActionErr = { ok: false; error: string };
type ActionResult<T = Record<string, never>> = ActionOk<T> | ActionErr;

async function resolveSenderRole(
  bookingRequestId: string,
  userId: string,
): Promise<{ role: Role | null; isParty: boolean; isSuperadmin: boolean; bookingStatus: string | null }> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isSuperadmin = profile?.role === "superadmin";

  const { data: br } = await admin
    .from("booking_requests")
    .select("id, status, artists(user_id), organizers(user_id)")
    .eq("id", bookingRequestId)
    .maybeSingle();
  if (!br) return { role: null, isParty: false, isSuperadmin, bookingStatus: null };
  const artistUserId = (br as unknown as { artists: { user_id: string | null } | null }).artists?.user_id ?? null;
  const orgUserId = (br as unknown as { organizers: { user_id: string } | null }).organizers?.user_id ?? null;
  if (artistUserId === userId) return { role: "artist", isParty: true, isSuperadmin, bookingStatus: br.status };
  if (orgUserId === userId) return { role: "organizer", isParty: true, isSuperadmin, bookingStatus: br.status };
  return { role: null, isParty: false, isSuperadmin, bookingStatus: br.status };
}

export async function sendMessage(input: ChatMessageInput): Promise<ActionResult> {
  const parsed = chatMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { role, isParty, bookingStatus } = await resolveSenderRole(parsed.data.booking_request_id, user.id);
  if (!isParty || !role) return { ok: false, error: "Non sei parte di questa trattativa" };
  if (bookingStatus !== "in_trattativa" && bookingStatus !== "confermata") {
    return { ok: false, error: "Chat non disponibile" };
  }

  // Rate limit semplice: nessun messaggio nello stesso secondo dallo stesso sender
  const admin = createAdminClient();
  const since = new Date(Date.now() - 500).toISOString();
  const { data: recent } = await admin
    .from("booking_messages")
    .select("id")
    .eq("booking_request_id", parsed.data.booking_request_id)
    .eq("sender_id", user.id)
    .gt("created_at", since)
    .limit(1);
  if ((recent?.length ?? 0) > 0) return { ok: false, error: "Troppo veloce, riprova" };

  const { error } = await admin.from("booking_messages").insert({
    booking_request_id: parsed.data.booking_request_id,
    sender_id: user.id,
    sender_role: role,
    kind: "text",
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendOffer(input: ChatOfferInput): Promise<ActionResult> {
  const parsed = chatOfferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati offerta non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { role, isParty, bookingStatus } = await resolveSenderRole(parsed.data.booking_request_id, user.id);
  if (!isParty || !role) return { ok: false, error: "Non sei parte di questa trattativa" };
  if (bookingStatus !== "in_trattativa") return { ok: false, error: "Trattativa non aperta" };

  const admin = createAdminClient();
  // Marca offerte pending precedenti come superseded
  await admin
    .from("booking_messages")
    .update({ offer_status: "superseded" })
    .eq("booking_request_id", parsed.data.booking_request_id)
    .eq("kind", "offer")
    .eq("offer_status", "pending");

  const { error } = await admin.from("booking_messages").insert({
    booking_request_id: parsed.data.booking_request_id,
    sender_id: user.id,
    sender_role: role,
    kind: "offer",
    offer_event_date: parsed.data.event_date,
    offer_time_slot: parsed.data.time_slot,
    offer_budget: parsed.data.budget,
    offer_status: "pending",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function respondToOffer(messageId: string, action: "accept" | "reject"): Promise<ActionResult> {
  if (action !== "accept" && action !== "reject") {
    return { ok: false, error: "Azione non valida" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const admin = createAdminClient();

  if (action === "reject") {
    const { data: msg } = await admin
      .from("booking_messages")
      .select("id, booking_request_id, sender_id, kind, offer_status")
      .eq("id", messageId)
      .maybeSingle();
    if (!msg) return { ok: false, error: "Offerta non trovata" };
    if (msg.kind !== "offer" || msg.offer_status !== "pending") {
      return { ok: false, error: "Offerta non più valida" };
    }
    if (msg.sender_id === user.id) {
      return { ok: false, error: "Non puoi rispondere alla tua offerta" };
    }
    const { isParty, bookingStatus } = await resolveSenderRole(msg.booking_request_id, user.id);
    if (!isParty) return { ok: false, error: "Non autorizzato" };
    if (bookingStatus !== "in_trattativa") return { ok: false, error: "Trattativa non aperta" };

    const { error: updErr } = await admin
      .from("booking_messages")
      .update({ offer_status: "rejected", offer_responded_at: new Date().toISOString() })
      .eq("id", messageId);
    if (updErr) return { ok: false, error: updErr.message };
    return { ok: true };
  }

  // Accept: chiama funzione transazionale
  const { data, error } = await admin.rpc("accept_chat_offer", { message_id: messageId, actor: user.id });
  if (error) return { ok: false, error: error.message };
  const res = (data as unknown as { ok: boolean; error?: string } | null) ?? null;
  if (!res || !res.ok) return { ok: false, error: res?.error ?? "Errore nell'accettazione" };

  const { data: msg } = await admin
    .from("booking_messages")
    .select("booking_request_id")
    .eq("id", messageId)
    .maybeSingle();
  if (msg?.booking_request_id) {
    await sendBookingConfirmedEmail(msg.booking_request_id).catch((e) =>
      console.error("email confirmed (chat):", e),
    );
  }

  revalidatePath("/dashboard/calendario");
  revalidatePath("/organizzatore/calendario");
  revalidatePath("/dashboard/chat");
  revalidatePath("/organizzatore/chat");
  revalidatePath("/admin/chat");
  revalidatePath("/artisti");
  return { ok: true };
}

type AttachmentKind = "image" | "document" | "voice";

export async function sendAttachment(input: {
  booking_request_id: string;
  kind: AttachmentKind;
  url: string;
  type: string;
  name: string;
  size: number;
  duration_ms?: number;
}): Promise<ActionResult> {
  if (!["image", "document", "voice"].includes(input.kind)) {
    return { ok: false, error: "Tipo allegato non valido" };
  }
  if (typeof input.size !== "number" || input.size <= 0 || input.size > 25 * 1024 * 1024) {
    return { ok: false, error: "File troppo grande (max 25 MB)" };
  }
  if (!input.url || !input.url.startsWith("http")) {
    return { ok: false, error: "URL allegato non valido" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { role, isParty, bookingStatus } = await resolveSenderRole(input.booking_request_id, user.id);
  if (!isParty || !role) return { ok: false, error: "Non sei parte di questa trattativa" };
  if (bookingStatus !== "in_trattativa" && bookingStatus !== "confermata") {
    return { ok: false, error: "Chat non disponibile" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("booking_messages").insert({
    booking_request_id: input.booking_request_id,
    sender_id: user.id,
    sender_role: role,
    kind: input.kind,
    body: null,
    attachment_url: input.url,
    attachment_type: input.type.slice(0, 120),
    attachment_name: input.name.slice(0, 200),
    attachment_size: input.size,
    attachment_duration_ms: input.duration_ms ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchDockConversations(): Promise<
  | { ok: true; conversations: ConversationItem[]; role: "artist" | "organizer" }
  | ActionErr
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "artist") {
    const conversations = await getConversationsForArtist(user.id);
    return { ok: true, conversations, role: "artist" };
  }
  if (profile?.role === "organizer") {
    const conversations = await getConversationsForOrganizer(user.id);
    return { ok: true, conversations, role: "organizer" };
  }
  return { ok: false, error: "Ruolo non supportato per il dock" };
}

export async function fetchDockConversation(
  bookingRequestId: string,
): Promise<
  | { ok: true; meta: ChatPartyMeta; messages: ChatMessage[]; currentUserId: string; viewerRole: "artist" | "organizer" }
  | ActionErr
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { role, isParty } = await resolveSenderRole(bookingRequestId, user.id);
  if (!isParty || !role) return { ok: false, error: "Non autorizzato" };

  const meta = await getConversationMeta(bookingRequestId);
  if (!meta) return { ok: false, error: "Trattativa non trovata" };
  const messages = await getMessages(bookingRequestId);
  return { ok: true, meta, messages, currentUserId: user.id, viewerRole: role };
}

export async function markConversationRead(bookingRequestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { role, isParty } = await resolveSenderRole(bookingRequestId, user.id);
  if (!isParty || !role) return { ok: false, error: "Non autorizzato" };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  if (role === "artist") {
    await admin
      .from("booking_messages")
      .update({ read_by_artist_at: now })
      .eq("booking_request_id", bookingRequestId)
      .neq("sender_role", "artist")
      .is("read_by_artist_at", null);
  } else {
    await admin
      .from("booking_messages")
      .update({ read_by_organizer_at: now })
      .eq("booking_request_id", bookingRequestId)
      .neq("sender_role", "organizer")
      .is("read_by_organizer_at", null);
  }
  return { ok: true };
}
