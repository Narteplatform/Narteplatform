"use server";

import { resolveActiveArtist } from "@/lib/artist/current";
import { leggiStatoOrganizzatore } from "@/lib/organizers/approvazione";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { resolveMediaUrl } from "@/lib/storage/signed";
import {
  chatMessageSchema,
  chatOfferSchema,
  type ChatMessageInput,
  type ChatOfferInput,
} from "@/lib/validators/schemas";
import { sendBookingConfirmedEmail } from "@/lib/emails/booking-notify";
import { chatAttivaPerArtista, chatAttivaPerArtisti } from "@/lib/chat/accesso";
import { logger } from "@/lib/logger";
import { notifyNewChatMessage, notifyNewChatOffer } from "@/lib/chat/notify";
import {
  creaNotificaRaggruppata,
  creaNotifichePerArtista,
  creaNotifichePerOrganizzatore,
} from "@/lib/notifications";
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
 * Paywall della chat: la trattativa in chat è inclusa nei piani Pro e Max
 * dell'ARTISTA e vale per ENTRAMBE le parti (novembre 2026).
 *
 * Con un artista Free non si chatta: la trattativa si svolge via email e
 * l'accordo si registra dalla pagina della richiesta. Prima l'organizzatore
 * poteva scrivere a un artista Free che non poteva rispondere: una
 * conversazione a senso unico che la piattaforma stessa aveva aperto.
 *
 * Usa il tier del PROFILO e non quello dell'account, così un omaggio del
 * superadmin su un singolo profilo (tier_override) sblocca la chat per quel
 * profilo. Il superadmin non scrive mai in chat, quindi non passa di qui.
 */
async function assertArtistCanChat(
  role: Role | null,
  artistId: string | null,
  isSuperadmin: boolean,
): Promise<ActionResult | null> {
  if (isSuperadmin || !artistId) return null;
  if (role !== "artist" && role !== "organizer") return null;
  if (await chatAttivaPerArtista(artistId)) return null;
  return {
    ok: false,
    error:
      role === "artist"
        ? "La chat con locali e organizzatori è inclusa nei piani Pro e Max. Con il piano Free tratti via email: trovi l'indirizzo dell'organizzatore nella richiesta."
        : "Questo artista è sul piano Free: la chat non è disponibile e la trattativa prosegue via email. Trovi il suo indirizzo nella richiesta.",
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

  // Un organizzatore non ancora approvato dal team (migration 0071) non può
  // aprire conversazioni. Stato tollerante: senza colonna o senza riga vale
  // «approved», come prima. Per un artista (nessuna riga organizers) non cambia nulla.
  if ((await leggiStatoOrganizzatore(user.id)) !== "approved") {
    return { ok: false, error: "Il tuo account organizzatore è in attesa di approvazione." };
  }

  // Verifica esistenza artista
  const { data: a, error: aErr } = await admin
    .from("artists")
    .select("id, user_id")
    .eq("id", artistId)
    .maybeSingle();
  if (aErr) return { ok: false, error: aErr.message };
  if (!a) return { ok: false, error: "Artista non trovato" };
  const chiamaArtista = a.user_id === user.id;

  // La chat è dei piani Pro e Max dell'artista, per entrambe le parti.
  if (!(await chatAttivaPerArtista(artistId))) {
    return {
      ok: false,
      error: chiamaArtista
        ? "La chat è inclusa nei piani Pro e Max. Con il piano Free tratti con l'organizzatore via email."
        : "Questo artista è sul piano Free: la trattativa si svolge via email, non in chat.",
    };
  }

  // L'organizzatore entra in chat solo dopo che l'artista ha avviato la
  // trattativa («Inizia trattativa»), o se la conversazione esiste già.
  if (!chiamaArtista) {
    const esistente = await getConversationByPair(artistId, orgId);
    if (!esistente) {
      const { count, error: cErr } = await admin
        .from("booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("artist_id", artistId)
        .eq("organizer_id", orgId)
        .in("status", ["in_trattativa", "accettata", "confermata"]);
      if (cErr) return { ok: false, error: cErr.message };
      if ((count ?? 0) === 0) {
        return {
          ok: false,
          error: "La chat si apre quando l'artista avvia la trattativa sulla tua richiesta.",
        };
      }
    }
  }

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

  // Avvisa la controparte dopo la risposta: il messaggio è già salvato, e
  // aspettare la posta prima di restituire faceva sembrare l'invio bloccato.
  const conversationId = parsed.data.conversation_id;
  after(() =>
    notifyNewChatMessage(conversationId, role).catch((e) =>
      console.error("[chat] notifica nuovo messaggio:", e)
    )
  );
  after(() => notificaMessaggioChat(conversationId, role, parsed.data.body));

  return { ok: true };
}

/**
 * Notifica in-app di un messaggio di chat, UNA per conversazione: finche'
 * il destinatario non la legge, i messaggi successivi aggiornano la stessa
 * («3 nuovi messaggi») invece di riempire la lista. Best-effort, mai lancia.
 */
async function notificaMessaggioChat(
  conversationId: string,
  actorRole: Role | null,
  anteprima: string,
): Promise<void> {
  try {
    if (actorRole !== "artist" && actorRole !== "organizer") return;
    const admin = createAdminClient();
    const { data: conv, error } = await admin
      .from("conversations")
      .select("artist_id, organizer_id, artists(stage_name, user_id), organizers(display_name, user_id)")
      .eq("id", conversationId)
      .maybeSingle();
    if (error || !conv) {
      if (error) logger.error("chat", "notifica messaggio, conversazione non letta:", error.message);
      return;
    }
    const a = conv.artists as unknown as { stage_name: string; user_id: string | null } | null;
    const o = conv.organizers as unknown as { display_name: string; user_id: string | null } | null;
    const versoArtista = actorRole === "organizer";
    const userId = versoArtista ? a?.user_id : o?.user_id;
    if (!userId) return;

    const campoLetto = versoArtista ? "read_by_artist_at" : "read_by_organizer_at";
    const { count } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("sender_role", actorRole)
      .is(campoLetto, null);
    const n = Math.max(1, count ?? 1);
    const mittente = versoArtista ? (o?.display_name ?? "Un organizzatore") : (a?.stage_name ?? "L'artista");
    const testo = anteprima.length > 140 ? `${anteprima.slice(0, 137)}…` : anteprima;

    await creaNotificaRaggruppata({
      userId,
      artistId: versoArtista ? conv.artist_id : null,
      kind: "messaggio_chat",
      refKey: `chat:${conversationId}`,
      title: versoArtista ? `${mittente} ti ha scritto` : `${mittente} ti ha risposto`,
      body: n > 1 ? `${n} nuovi messaggi · «${testo}»` : `«${testo}»`,
      href: versoArtista ? `/dashboard/chat/${conversationId}` : `/organizzatore/chat/${conversationId}`,
    });
  } catch (e) {
    logger.error("chat", "notifica messaggio:", e instanceof Error ? e.message : String(e));
  }
}

/**
 * Campanella della controparte di chi ha agito in chat (best-effort, mai
 * lancia). Artista → notifica l'organizzatore, organizzatore → l'artista;
 * ogni altro ruolo (superadmin) non genera notifiche.
 */
async function notificaControparte(
  conversationId: string,
  actorRole: Role | null,
  n: { kind: string; title: string; body?: string },
): Promise<void> {
  try {
    if (actorRole !== "artist" && actorRole !== "organizer") return;
    const admin = createAdminClient();
    const { data: conv, error } = await admin
      .from("conversations")
      .select("artist_id, organizer_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) {
      logger.error("chat", "notifica controparte, conversazione non letta:", error.message);
      return;
    }
    if (!conv) return;
    if (actorRole === "artist") {
      await creaNotifichePerOrganizzatore(conv.organizer_id, { ...n, href: `/organizzatore/chat/${conversationId}` });
    } else {
      await creaNotifichePerArtista(conv.artist_id, { ...n, href: `/dashboard/chat/${conversationId}` });
    }
  } catch (e) {
    logger.error("chat", "notifica controparte:", e instanceof Error ? e.message : String(e));
  }
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

  // Campanella: nuova offerta (o contro-offerta) per la controparte.
  void notificaControparte(parsed.data.conversation_id, role, {
    kind: "offerta_ricevuta",
    title: "Nuova offerta in chat",
    body:
      parsed.data.budget_cents != null
        ? `Ti hanno proposto ${(parsed.data.budget_cents / 100).toLocaleString("it-IT")} €. Apri la chat per rispondere.`
        : "Apri la chat per rispondere.",
  });

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

    void notificaControparte(msg.conversation_id, role, {
      kind: "offerta_rifiutata",
      title: "Offerta rifiutata",
      body: "La controparte ha rifiutato la tua offerta. Puoi inviarne una nuova dalla chat.",
    });
    return { ok: true };
  }

  // Accettare un'offerta conferma la data al prezzo dell'offerta: è l'atto
  // conclusivo della trattativa, quindi passa dallo stesso paywall del resto
  // della chat (dalla 0080 lo controlla anche accept_offer_v2).
  let acceptConvId: string | null = null;
  let acceptRole: Role | null = null;
  let offerta: { budgetCents: number | null; senderId: string | null; createdAt: string } | null = null;
  {
    const { data: msg, error: msgErr } = await admin
      .from("messages")
      .select("conversation_id, offer_budget_cents, sender_id, created_at")
      .eq("id", messageId)
      .maybeSingle();
    if (msgErr) return { ok: false, error: msgErr.message };
    if (!msg) return { ok: false, error: "Offerta non trovata" };
    const convId = msg.conversation_id;
    const { role, isSuperadmin, artistId } = await resolveConversationRole(convId, user.id);
    acceptConvId = convId;
    acceptRole = role;
    offerta = { budgetCents: msg.offer_budget_cents, senderId: msg.sender_id, createdAt: msg.created_at };
    const blocked = await assertNotBlocked(convId, user.id);
    if (blocked) return blocked;
    const gate = await assertArtistCanChat(role, artistId, isSuperadmin);
    if (gate) return gate;
    if (msg.offer_budget_cents == null) {
      return {
        ok: false,
        error: "L'offerta non indica un compenso: chiedi di inviarne una con il prezzo.",
      };
    }
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

  // Dalla 0080 chi accetta conferma sempre la data e la funzione registra il
  // compenso. Prima della 0080, se accetta l'artista la richiesta resta
  // «accettata» e l'organizzatore conferma dal widget («Conferma data a …»);
  // se accetta l'organizzatore la data è confermata ma il compenso no: lo si
  // completa qui, solo se ancora vuoto e solo su quella richiesta confermata.
  const confermata = res.stato !== "accettata";
  if (res.booking_request_id && confermata && offerta?.budgetCents != null) {
    const { error: fpErr } = await admin
      .from("booking_requests")
      .update({
        final_price: offerta.budgetCents / 100,
        final_price_proposed_by: offerta.senderId,
        final_price_proposed_at: offerta.createdAt,
        final_price_confirmed_by: user.id,
        final_price_confirmed_at: new Date().toISOString(),
      })
      .eq("id", res.booking_request_id)
      .eq("status", "confermata")
      .is("final_price", null);
    if (fpErr) logger.error("chat", "compenso dopo accettazione offerta:", fpErr.message);
  }

  if (res.booking_request_id && confermata) {
    await sendBookingConfirmedEmail(res.booking_request_id).catch((e) =>
      logger.error("chat", "email dopo accettazione offerta:", e instanceof Error ? e.message : String(e)),
    );
  } else if (acceptConvId && !confermata) {
    // Solo prima della 0080: l'organizzatore deve confermare dal widget.
    const convId = acceptConvId;
    const ruolo = acceptRole;
    if (ruolo) {
      after(() =>
        notifyNewChatMessage(convId, ruolo).catch((e) =>
          console.error("[chat] notifica offerta accettata:", e),
        ),
      );
    }
  }

  if (acceptConvId) {
    void notificaControparte(acceptConvId, acceptRole, {
      kind: "offerta_accettata",
      title: confermata ? "Offerta accettata: data confermata" : "Offerta accettata: conferma la data",
      body: confermata
        ? "L'accordo è confermato da entrambi e la data è bloccata nel calendario al prezzo dell'offerta."
        : "L'artista ha accettato la tua offerta. Conferma la data dal riquadro dell'offerta in chat.",
    });
  }

  revalidatePath("/dashboard/calendario");
  revalidatePath("/organizzatore/calendario");
  revalidatePath("/dashboard/chat");
  revalidatePath("/organizzatore/chat");
  revalidatePath("/admin/chat");
  revalidatePath("/artisti");
  revalidatePath("/dashboard/leads");
  revalidatePath("/organizzatore/richieste");
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
  const anteprima =
    input.kind === "image" ? "📷 Foto" : input.kind === "voice" ? "🎙️ Vocale" : `📎 ${input.name.slice(0, 80)}`;
  after(() => notificaMessaggioChat(input.conversation_id, role, anteprima));
  return { ok: true };
}

/**
 * Rilettura dei messaggi di una conversazione, per riallineare la chat aperta.
 *
 * La lista in pagina si aggiorna col canale realtime, ma il canale cade senza
 * avvisare (scheda in background, telefono in standby, rete che cambia) e da
 * quel momento nemmeno i propri messaggi comparivano più fino al ricaricamento.
 * Il client la chiama dopo ogni invio, alla (ri)connessione del canale e quando
 * la scheda torna visibile. Sola lettura.
 */
export async function fetchConversationMessages(
  conversationId: string,
): Promise<{ ok: true; messages: ChatMessage[] } | ActionErr> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { isParty } = await resolveConversationRole(conversationId, user.id);
  if (!isParty) return { ok: false, error: "Non autorizzato" };

  return { ok: true, messages: await getMessages(conversationId) };
}

/**
 * Conversazioni per dock e toast. `scope: "active"` (dock) limita l'artista al
 * profilo attivo; `"all"` (toast) le include tutte, cosi' un messaggio a un
 * altro profilo dell'account viene comunque segnalato.
 */
export async function fetchDockConversations(
  scope: "active" | "all" = "active",
): Promise<
  | {
      ok: true;
      conversations: ConversationItem[];
      role: "artist" | "organizer";
      activeArtistId?: string | null;
    }
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
    const active = await resolveActiveArtist(user.id);
    const tutte = await getConversationsForArtist(
      user.id,
      scope === "active" && active ? { artistId: active.id } : {},
    );
    // La chat è dei profili Pro/Max: quelle di un profilo Free non compaiono
    // nel dock né nei toast (l'artista Free tratta via email).
    const attive = await chatAttivaPerArtisti(tutte.map((c) => c.artistId));
    const conversations = tutte.filter((c) => attive.get(c.artistId) === true);
    return { ok: true, conversations, role: "artist", activeArtistId: active?.id ?? null };
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
  if (role === "artist" && !(await chatAttivaPerArtista(meta.artist.id))) {
    return { ok: false, error: "La chat è inclusa nei piani Pro e Max." };
  }
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
  // Chat letta = notifica della chat letta, anche se la si e' aperta senza
  // passare dalla campanella. Senza la colonna ref_key (0076) non fa nulla.
  const { error: errNotifica } = await admin
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", user.id)
    .eq("ref_key", `chat:${conversationId}`)
    .is("read_at", null);
  if (errNotifica && errNotifica.code !== "42703" && errNotifica.code !== "PGRST204" && errNotifica.code !== "42P01") {
    logger.warn("chat", "notifica chat non segnata come letta:", errNotifica.message);
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
