"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { resolveMediaUrl } from "@/lib/storage/signed";
import {
  chatMessageSchema,
  chatOfferSchema,
  type ChatMessageInput,
  type ChatOfferInput,
} from "@/lib/validators/schemas";
import { sendBookingAcceptedEmail, sendBookingConfirmedEmail } from "@/lib/emails/send";
import { logger } from "@/lib/logger";
import { notifyNewChatMessage, notifyNewChatOffer } from "@/lib/chat/notify";
import { getEntitlements } from "@/lib/billing/entitlements";
import type { Role } from "@/lib/supabase/types";
import {
  getConversationsForArtist,
  getConversationsForOrganizer,
  getConversationMeta,
  getMessages,
  getConversationByPair,
  type ChatMessage,
  type ChatPartyMeta,
  type ConversationItem,
} from "@/lib/chat/queries";

type ActionErr = { ok: false; error: string };
type ActionResult<T = unknown> = ({ ok: true } & T) | ActionErr;

async function resolveConversationRole(
  conversationId: string,
  userId: string,
): Promise<{ role: Role | null; isParty: boolean; isSuperadmin: boolean; artistId: string | null }> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isSuperadmin = profile?.role === "superadmin";

  const { data: c } = await admin
    .from("conversations")
    .select("id, artist_id, artists!inner(user_id), organizers!inner(user_id)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!c) return { role: null, isParty: false, isSuperadmin, artistId: null };
  const artistId = (c as unknown as { artist_id: string | null }).artist_id ?? null;
  const artistUserId = (c as unknown as { artists: { user_id: string | null } | null }).artists?.user_id ?? null;
  const orgUserId = (c as unknown as { organizers: { user_id: string } | null }).organizers?.user_id ?? null;
  if (artistUserId === userId) return { role: "artist", isParty: true, isSuperadmin, artistId };
  if (orgUserId === userId) return { role: "organizer", isParty: true, isSuperadmin, artistId };
  return { role: null, isParty: false, isSuperadmin, artistId };
}

/**
 * Blocco per persona dentro UNA conversazione (Feature C, moderazione
 * superadmin): legge blocked_user_id, non sender_role, perché lo stesso
 * artista può restare bloccato solo con questo organizzatore e libero con
 * tutti gli altri. Va controllato PRIMA del paywall (assertArtistCanChat):
 * un artista bloccato deve vedere il vero motivo, non l'invito a fare
 * upgrade al piano.
 *
 * Fail-open sulla sola UX in caso di errore di lettura: la tabella
 * conversation_blocks (migration 0055) è additiva e può non esistere ancora
 * sul DB finché non viene applicata a mano da SQL editor. Finché manca, il
 * blocco semplicemente non ha effetto — esattamente come una tabella vuota —
 * invece di rompere l'invio dei messaggi per tutti.
 */
async function assertNotBlocked(conversationId: string, userId: string): Promise<ActionResult | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("conversation_blocks")
    .select("reason")
    .eq("conversation_id", conversationId)
    .eq("blocked_user_id", userId)
    .is("lifted_at", null)
    .maybeSingle();
  if (error) {
    console.error("[chat] verifica blocco conversazione:", error);
    return null;
  }
  if (!data) return null;
  return {
    ok: false,
    error: `Un amministratore ti ha bloccato in questa conversazione. Motivo: ${data.reason}`,
  };
}

/**
 * Paywall della chat: la negoziazione è inclusa nei piani Pro e Max.
 *
 * Vale SOLO per l'artista. L'organizzatore non paga mai e non va mai fermato:
 * la conversazione si apre comunque, lui scrive senza attriti e l'artista Free
 * riceve la mail di notifica. Il paywall scatta quando l'artista prova a
 * rispondere — cioè nel momento di massimo valore percepito, con un ingaggio
 * vero dall'altra parte del messaggio.
 *
 * Usa il tier dell'ARTISTA e non quello dell'account, così un omaggio del
 * superadmin su un singolo profilo (tier_override) sblocca la chat per quel
 * profilo.
 */
async function assertArtistCanChat(
  role: Role | null,
  artistId: string | null,
  isSuperadmin: boolean,
): Promise<ActionResult | null> {
  if (role !== "artist" || isSuperadmin || !artistId) return null;
  const ent = await getEntitlements(artistId);
  if (ent.canUseChat) return null;
  return {
    ok: false,
    error:
      "La chat con locali e organizzatori è inclusa nei piani Pro e Max. Passa a Pro per rispondere.",
  };
}

export async function openOrCreateConversation(
  artistId: string,
  organizerId?: string,
): Promise<ActionResult<{ conversationId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const admin = createAdminClient();
  let orgId = organizerId;
  if (!orgId) {
    const { data: o } = await admin
      .from("organizers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!o) return { ok: false, error: "Profilo organizzatore non trovato" };
    orgId = o.id;
  }

  // Verifica esistenza artista
  const { data: a } = await admin.from("artists").select("id").eq("id", artistId).maybeSingle();
  if (!a) return { ok: false, error: "Artista non trovato" };

  // RPC security definer
  const userClient = await createClient();
  const { data, error } = await userClient.rpc("get_or_create_conversation", {
    p_artist_id: artistId,
    p_organizer_id: orgId,
  });
  if (error) {
    // Fallback admin (l'utente potrebbe non avere user_id su artist legacy)
    const existing = await getConversationByPair(artistId, orgId);
    if (existing) return { ok: true, conversationId: existing };
    return { ok: false, error: error.message };
  }
  return { ok: true, conversationId: data as unknown as string };
}

export async function sendMessage(input: ChatMessageInput): Promise<ActionResult> {
  const parsed = chatMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { role, isParty, isSuperadmin, artistId } = await resolveConversationRole(
    parsed.data.conversation_id,
    user.id,
  );
  if (!isParty || !role) return { ok: false, error: "Non sei parte di questa conversazione" };
  const blocked = await assertNotBlocked(parsed.data.conversation_id, user.id);
  if (blocked) return blocked;
  const gate = await assertArtistCanChat(role, artistId, isSuperadmin);
  if (gate) return gate;

  const admin = createAdminClient();
  const since = new Date(Date.now() - 500).toISOString();
  const { data: recent } = await admin
    .from("messages")
    .select("id")
    .eq("conversation_id", parsed.data.conversation_id)
    .eq("sender_id", user.id)
    .gt("created_at", since)
    .limit(1);
  if ((recent?.length ?? 0) > 0) return { ok: false, error: "Troppo veloce, riprova" };

  const { error } = await admin.from("messages").insert({
    conversation_id: parsed.data.conversation_id,
    sender_id: user.id,
    sender_role: role,
    kind: "text",
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: error.message };

  // Avvisa la controparte. Non blocca la risposta: il messaggio è già salvato
  // e un problema di posta non deve far fallire l'invio in chat.
  await notifyNewChatMessage(parsed.data.conversation_id, role).catch((e) =>
    console.error("[chat] notifica nuovo messaggio:", e)
  );

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

  const { role, isParty, isSuperadmin, artistId } = await resolveConversationRole(
    parsed.data.conversation_id,
    user.id,
  );
  if (!isParty || !role) return { ok: false, error: "Non sei parte di questa conversazione" };
  const blocked = await assertNotBlocked(parsed.data.conversation_id, user.id);
  if (blocked) return blocked;
  const gate = await assertArtistCanChat(role, artistId, isSuperadmin);
  if (gate) return gate;

  const admin = createAdminClient();

  // L'offerta va collegata alla richiesta aperta fra le due parti. Senza questo
  // collegamento accept_offer_v2 creava un SECONDO booking già confermato e
  // lasciava orfana la trattativa da cui la chat era nata.
  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("artist_id, organizer_id")
    .eq("id", parsed.data.conversation_id)
    .maybeSingle();
  if (convErr || !conv) return { ok: false, error: "Conversazione non trovata" };
  const { data: aperta, error: apertaErr } = await admin
    .from("booking_requests")
    .select("id")
    .eq("artist_id", conv.artist_id)
    .eq("organizer_id", conv.organizer_id)
    .in("status", ["pending", "in_trattativa", "accettata"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (apertaErr) return { ok: false, error: apertaErr.message };

  await admin
    .from("messages")
    .update({ offer_status: "superseded" })
    .eq("conversation_id", parsed.data.conversation_id)
    .eq("kind", "offer")
    .eq("offer_status", "pending");

  const { error } = await admin.from("messages").insert({
    offer_booking_request_id: aperta?.id ?? null,
    conversation_id: parsed.data.conversation_id,
    sender_id: user.id,
    sender_role: role,
    kind: "offer",
    offer_event_date: parsed.data.event_date,
    offer_time_slot: parsed.data.time_slot,
    offer_budget_cents: parsed.data.budget_cents,
    offer_description: parsed.data.description ?? null,
    offer_status: "pending",
  });
  if (error) return { ok: false, error: error.message };

  // Un'offerta è l'evento più importante della trattativa: va notificata
  // sempre, anche se poco fa era già partita una notifica di messaggio.
  await notifyNewChatOffer(parsed.data.conversation_id, role, {
    amount: parsed.data.budget_cents != null ? parsed.data.budget_cents / 100 : null,
    eventDate: parsed.data.event_date ?? null,
  }).catch((e) => console.error("[chat] notifica offerta:", e));

  return { ok: true };
}

export async function respondToOffer(
  messageId: string,
  action: "accept" | "reject",
): Promise<ActionResult<{ bookingRequestId?: string }>> {
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
      .from("messages")
      .select("id, conversation_id, sender_id, kind, offer_status")
      .eq("id", messageId)
      .maybeSingle();
    if (!msg) return { ok: false, error: "Offerta non trovata" };
    if (msg.kind !== "offer" || msg.offer_status !== "pending") {
      return { ok: false, error: "Offerta non più valida" };
    }
    if (msg.sender_id === user.id) {
      return { ok: false, error: "Non puoi rispondere alla tua offerta" };
    }
    const { isParty, role, isSuperadmin, artistId } = await resolveConversationRole(
      msg.conversation_id,
      user.id,
    );
    if (!isParty) return { ok: false, error: "Non autorizzato" };
    const blocked = await assertNotBlocked(msg.conversation_id, user.id);
    if (blocked) return blocked;
    const gate = await assertArtistCanChat(role, artistId, isSuperadmin);
    if (gate) return gate;

    const { error: updErr } = await admin
      .from("messages")
      .update({ offer_status: "rejected", offer_responded_at: new Date().toISOString() })
      .eq("id", messageId);
    if (updErr) return { ok: false, error: updErr.message };
    return { ok: true };
  }

  // Accettare un'offerta crea un booking confermato: è l'atto conclusivo della
  // negoziazione, quindi passa dallo stesso paywall del resto della chat.
  // accept_offer_v2 è security definer e non conosce i piani: il gate va qui.
  {
    const { data: msg } = await admin
      .from("messages")
      .select("conversation_id")
      .eq("id", messageId)
      .maybeSingle();
    if (!msg) return { ok: false, error: "Offerta non trovata" };
    const convId = (msg as { conversation_id: string }).conversation_id;
    const { role, isSuperadmin, artistId } = await resolveConversationRole(convId, user.id);
    const blocked = await assertNotBlocked(convId, user.id);
    if (blocked) return blocked;
    const gate = await assertArtistCanChat(role, artistId, isSuperadmin);
    if (gate) return gate;
  }

  // Accept via RPC security definer
  const { data, error } = await supabase.rpc("accept_offer_v2", { p_message_id: messageId });
  if (error) return { ok: false, error: error.message };
  const res =
    (data as unknown as {
      ok: boolean;
      error?: string;
      booking_request_id?: string;
      stato?: "accettata" | "confermata";
    } | null) ?? null;
  if (!res || !res.ok) return { ok: false, error: res?.error ?? "Errore nell'accettazione" };

  // Doppia conferma (0070): se ha accettato l'artista la richiesta è
  // «accettata» e l'organizzatore riceve l'invito a confermare la data; se ha
  // accettato l'organizzatore la data è confermata e partono le conferme.
  // Senza `stato` (DB ancora alla 0061) vale il comportamento precedente.
  if (res.booking_request_id) {
    const invio =
      res.stato === "accettata"
        ? sendBookingAcceptedEmail(res.booking_request_id)
        : sendBookingConfirmedEmail(res.booking_request_id);
    await invio.catch((e) =>
      logger.error("chat", "email dopo accettazione offerta:", e instanceof Error ? e.message : String(e)),
    );
  }

  revalidatePath("/dashboard/calendario");
  revalidatePath("/organizzatore/calendario");
  revalidatePath("/dashboard/chat");
  revalidatePath("/organizzatore/chat");
  revalidatePath("/admin/chat");
  revalidatePath("/artisti");
  return { ok: true, bookingRequestId: res.booking_request_id };
}

type AttachmentKind = "image" | "document" | "voice";

/**
 * Il valore è il percorso di un file caricato in QUESTA conversazione?
 *
 * lib/chat/upload.ts costruisce `<conversationId>/<uuid>-<nome>`. Legare il
 * controllo alla conversazione, e non solo al bucket, impedisce anche di
 * allegare a una trattativa un file caricato in un'altra.
 *
 * Gli URL assoluti restano accettati solo se puntano al nostro storage: è il
 * formato che si salvava prima che il bucket diventasse privato.
 */
function isAllegatoDiQuestaConversazione(raw: string, conversationId: string): boolean {
  if (/^https?:\/\//i.test(raw)) {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      return host.endsWith(".supabase.co") || host.endsWith(".b-cdn.net");
    } catch {
      return false;
    }
  }
  if (raw.includes("..") || raw.startsWith("/")) return false;
  return raw.startsWith(`${conversationId}/`);
}

export async function sendAttachment(input: {
  conversation_id: string;
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
  // L'allegato deve stare sul NOSTRO storage, dentro la cartella di QUESTA
  // conversazione. Con il vecchio controllo "inizia per http" una parte poteva
  // far puntare l'allegato a un dominio qualsiasi: l'altra vedeva un'anteprima
  // che sembra nostra, ma a servirla era un terzo — che sapeva così quando e da
  // dove veniva aperta, e poteva cambiarne il contenuto dopo l'invio.
  if (!input.url || !isAllegatoDiQuestaConversazione(input.url, input.conversation_id)) {
    return { ok: false, error: "Allegato non valido" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { role, isParty, isSuperadmin, artistId } = await resolveConversationRole(
    input.conversation_id,
    user.id,
  );
  if (!isParty || !role) return { ok: false, error: "Non sei parte di questa conversazione" };
  const blocked = await assertNotBlocked(input.conversation_id, user.id);
  if (blocked) return blocked;
  const gate = await assertArtistCanChat(role, artistId, isSuperadmin);
  if (gate) return gate;

  const admin = createAdminClient();
  const { error } = await admin.from("messages").insert({
    conversation_id: input.conversation_id,
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
  conversationId: string,
): Promise<
  | { ok: true; meta: ChatPartyMeta; messages: ChatMessage[]; currentUserId: string; viewerRole: "artist" | "organizer" }
  | ActionErr
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { role, isParty } = await resolveConversationRole(conversationId, user.id);
  if (!isParty || (role !== "artist" && role !== "organizer")) {
    return { ok: false, error: "Non autorizzato" };
  }

  const meta = await getConversationMeta(conversationId);
  if (!meta) return { ok: false, error: "Conversazione non trovata" };
  const messages = await getMessages(conversationId);
  return { ok: true, meta, messages, currentUserId: user.id, viewerRole: role };
}

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { role, isParty } = await resolveConversationRole(conversationId, user.id);
  if (!isParty || !role) return { ok: false, error: "Non autorizzato" };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  if (role === "artist") {
    await admin
      .from("messages")
      .update({ read_by_artist_at: now })
      .eq("conversation_id", conversationId)
      .neq("sender_role", "artist")
      .is("read_by_artist_at", null);
  } else {
    await admin
      .from("messages")
      .update({ read_by_organizer_at: now })
      .eq("conversation_id", conversationId)
      .neq("sender_role", "organizer")
      .is("read_by_organizer_at", null);
  }
  return { ok: true };
}

/**
 * Firma l'allegato di un messaggio arrivato in tempo reale.
 *
 * I messaggi caricati con la pagina arrivano già firmati da getMessages. Quelli
 * che arrivano dopo, dal canale realtime, no: postgres_changes consegna la riga
 * grezza, e in colonna c'è il percorso nel bucket privato, che il browser non
 * sa aprire. Senza questa funzione, un allegato ricevuto a chat aperta
 * resterebbe un riquadro vuoto fino al ricaricamento della pagina.
 *
 * Il controllo di appartenenza c'è lo stesso: si firma solo un allegato di una
 * conversazione di cui si fa parte.
 */
export async function signMessageAttachment(
  messageId: string
): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const admin = createAdminClient();
  const { data: msg, error } = await admin
    .from("messages")
    .select("conversation_id, attachment_url")
    .eq("id", messageId)
    .maybeSingle();
  if (error || !msg?.attachment_url) return { ok: false, error: "Allegato non trovato" };

  const { isParty, isSuperadmin } = await resolveConversationRole(
    msg.conversation_id,
    user.id
  );
  if (!isParty && !isSuperadmin) {
    return { ok: false, error: "Non sei parte di questa conversazione" };
  }

  return { ok: true, url: await resolveMediaUrl("chat-attachments", msg.attachment_url) };
}
