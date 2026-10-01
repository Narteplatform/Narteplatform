"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { conversationBlockReasonSchema } from "@/lib/validators/schemas";
import { registraDecisione, MOTIVAZIONE_MIN } from "@/lib/moderation/decisioni";
import { logger } from "@/lib/logger";
import { getAccessoValido } from "@/lib/chat/access";
import { MESSAGGIO_RIMOSSO, percorsoAllegatoChat } from "@/lib/chat/removed";
import type { Role } from "@/lib/supabase/types";

type ActionErr = { ok: false; error: string };
type ActionResult<T = unknown> = ({ ok: true } & T) | ActionErr;

type ConversationParties = {
  conversationId: string;
  artist: { id: string; userId: string | null; name: string };
  organizer: { id: string; userId: string; name: string };
};

/**
 * Le stesse due righe (artista/organizzatore) su cui è costruita
 * resolveConversationRole() in lib/chat/actions.ts, ma qui servono anche i
 * nomi per comporre il messaggio system leggibile in chat.
 */
async function getConversationParties(
  conversationId: string,
): Promise<{ data: ConversationParties } | { error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .select("id, artist_id, organizer_id, artists!inner(id, user_id, stage_name), organizers!inner(id, user_id, display_name)")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Conversazione non trovata" };

  const a = (data as unknown as { artists: { id: string; user_id: string | null; stage_name: string } }).artists;
  const o = (data as unknown as { organizers: { id: string; user_id: string; display_name: string } }).organizers;
  if (!a || !o) return { error: "Conversazione non trovata" };

  return {
    data: {
      conversationId: data.id,
      artist: { id: a.id, userId: a.user_id, name: a.stage_name },
      organizer: { id: o.id, userId: o.user_id, name: o.display_name },
    },
  };
}

function revalidateChatRoutes(conversationId: string) {
  revalidatePath("/admin/chat");
  revalidatePath(`/admin/chat/${conversationId}`);
  revalidatePath("/dashboard/chat");
  revalidatePath(`/dashboard/chat/${conversationId}`);
  revalidatePath("/organizzatore/chat");
  revalidatePath(`/organizzatore/chat/${conversationId}`);
}

/**
 * Blocca una delle due parti in UNA conversazione (non l'account intero: un
 * artista bloccato qui può continuare a scrivere con altri organizzatori).
 *
 * Solo superadmin. L'idempotenza è voluta: un doppio click sullo stesso
 * bottone non deve rompersi né duplicare il messaggio di sistema in chat —
 * l'indice unico parziale su (conversation_id, blocked_user_id) where
 * lifted_at is null lo garantisce a livello DB, qui il codice 23505 viene
 * trattato come successo silenzioso.
 */
export async function blockConversationUser(input: {
  conversationId: string;
  target: "artist" | "organizer";
  reason: string;
}): Promise<ActionResult<{ blockId: string }>> {
  const admin_user = await requireAdminPageAccess("chat");

  if (input.target !== "artist" && input.target !== "organizer") {
    return { ok: false, error: "Destinatario del blocco non valido" };
  }
  const parsedReason = conversationBlockReasonSchema.safeParse(input.reason);
  if (!parsedReason.success) {
    return { ok: false, error: parsedReason.error.issues[0]?.message ?? "Motivazione non valida" };
  }
  // La motivazione viene inviata all'interessato e registrata: stesso minimo
  // di lib/moderation/decisioni.ts.
  if (parsedReason.data.length < MOTIVAZIONE_MIN) {
    return { ok: false, error: `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.` };
  }

  const parties = await getConversationParties(input.conversationId);
  if ("error" in parties) return { ok: false, error: parties.error };
  const { artist, organizer } = parties.data;

  const target = input.target === "artist" ? artist : organizer;
  const blockedUserId = input.target === "artist" ? artist.userId : organizer.userId;
  const blockedRole: Role = input.target;
  if (!blockedUserId) {
    return { ok: false, error: "Questo profilo non ha un account collegato da bloccare" };
  }

  const admin = createAdminClient();
  const { data: inserted, error: insertErr } = await admin
    .from("conversation_blocks")
    .insert({
      conversation_id: input.conversationId,
      blocked_user_id: blockedUserId,
      blocked_role: blockedRole,
      reason: parsedReason.data,
      created_by: admin_user.id,
    })
    .select("id")
    .single();

  if (insertErr) {
    // 23505 = unique_violation sull'indice parziale: c'era già un blocco
    // attivo per questo utente in questa conversazione. Doppio click
    // innocuo: si ritorna quello esistente senza duplicare il messaggio.
    if (insertErr.code === "23505") {
      const { data: existing } = await admin
        .from("conversation_blocks")
        .select("id")
        .eq("conversation_id", input.conversationId)
        .eq("blocked_user_id", blockedUserId)
        .is("lifted_at", null)
        .maybeSingle();
      if (existing) {
        return { ok: true, blockId: existing.id };
      }
    }
    return { ok: false, error: insertErr.message };
  }

  const { error: msgErr } = await admin.from("messages").insert({
    conversation_id: input.conversationId,
    sender_id: admin_user.id,
    sender_role: "superadmin",
    kind: "system",
    body: `Un amministratore ha bloccato ${target.name} in questa conversazione. Motivo: ${parsedReason.data}`,
  });
  if (msgErr) {
    // Il blocco è comunque efficace (assertNotBlocked legge conversation_blocks,
    // non il messaggio): un problema sul messaggio di sistema non deve far
    // sembrare fallita l'operazione di moderazione.
    logger.error("chat", "messaggio system blocco:", msgErr.message);
  }

  // Registro e comunicazione (art. 17 DSA). Il blocco è già efficace: un
  // problema qui si segnala nei log ma non lo annulla.
  const esito = await registraDecisione({
    actorId: admin_user.id,
    targetType: "conversazione",
    targetId: input.conversationId,
    action: "blocco_chat",
    reason: parsedReason.data,
    affectedUserId: blockedUserId,
    affectedName: target.name,
    notify: {
      decision: "Abbiamo limitato la tua possibilità di scrivere in una conversazione.",
      target: `Conversazione tra ${artist.name} e ${organizer.name}`,
      consequences:
        "Non puoi inviare messaggi, offerte o allegati in questa conversazione finché il blocco non viene sollevato. Le altre conversazioni non sono toccate.",
    },
  });
  if (!esito.ok) logger.warn("chat", "decisione di blocco non registrata:", esito.error);

  revalidateChatRoutes(input.conversationId);
  return { ok: true, blockId: inserted.id };
}

/**
 * Solleva un blocco esistente. Non cancella la riga (storico di moderazione):
 * valorizza lifted_at/lifted_by/lift_note.
 */
export async function unblockConversationUser(input: {
  blockId: string;
  note?: string;
}): Promise<ActionResult> {
  const admin_user = await requireAdminPageAccess("chat");

  let note: string | null = null;
  if (input.note && input.note.trim()) {
    const parsedNote = conversationBlockReasonSchema.safeParse(input.note);
    if (!parsedNote.success) {
      return { ok: false, error: parsedNote.error.issues[0]?.message ?? "Nota non valida" };
    }
    note = parsedNote.data;
  }

  const admin = createAdminClient();
  const { data: block, error: fetchErr } = await admin
    .from("conversation_blocks")
    .select("id, conversation_id, blocked_user_id, lifted_at")
    .eq("id", input.blockId)
    .maybeSingle();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!block) return { ok: false, error: "Blocco non trovato" };
  if (block.lifted_at) {
    // Già sbloccato (doppio click): innocuo, nessuna azione ulteriore.
    return { ok: true };
  }

  const { error: updErr } = await admin
    .from("conversation_blocks")
    .update({
      lifted_at: new Date().toISOString(),
      lifted_by: admin_user.id,
      lift_note: note,
    })
    .eq("id", input.blockId)
    .is("lifted_at", null);
  if (updErr) return { ok: false, error: updErr.message };

  const parties = await getConversationParties(block.conversation_id);
  if (!("error" in parties)) {
    const { artist, organizer } = parties.data;
    const name =
      block.blocked_user_id === artist.userId
        ? artist.name
        : block.blocked_user_id === organizer.userId
        ? organizer.name
        : "l'utente";
    const suffix = note ? ` Nota: ${note}` : "";
    const { error: msgErr } = await admin.from("messages").insert({
      conversation_id: block.conversation_id,
      sender_id: admin_user.id,
      sender_role: "superadmin",
      kind: "system",
      body: `Un amministratore ha sbloccato ${name} in questa conversazione.${suffix}`,
    });
    if (msgErr) logger.error("chat", "messaggio system sblocco:", msgErr.message);

    const esito = await registraDecisione({
      actorId: admin_user.id,
      targetType: "conversazione",
      targetId: block.conversation_id,
      action: "sblocco_chat",
      reason: note ?? "Blocco sollevato dal Team senza ulteriori note",
      affectedUserId: block.blocked_user_id,
      affectedName: name,
      // Un blocco sollevato è un ripristino, non una limitazione: si registra
      // senza scrivere all'interessato, che lo vede dal messaggio in chat.
      notify: false,
    });
    if (!esito.ok) logger.warn("chat", "sblocco non registrato:", esito.error);
  }

  revalidateChatRoutes(block.conversation_id);
  return { ok: true };
}

const CHAT_BUCKET = "chat-attachments";

/**
 * Rimuove UN messaggio (o allegato) da una conversazione, con motivazione.
 *
 * Solo con un accesso motivato valido alla conversazione. Il messaggio non si
 * cancella: il testo diventa «Messaggio rimosso dal team N'arte» e gli
 * `attachment_*` si azzerano; l'allegato esce dal bucket privato. Offerte e
 * messaggi di sistema non si toccano da qui. Il mittente riceve la decisione
 * con il modo per contestarla.
 */
export async function rimuoviMessaggioChat(input: {
  conversationId: string;
  messageId: string;
  motivo: string;
}): Promise<ActionResult<{ notified: boolean }>> {
  const admin_user = await requireAdminPageAccess("chat");

  const ids = z.object({ conversationId: z.string().uuid(), messageId: z.string().uuid() }).safeParse(input);
  if (!ids.success) return { ok: false, error: "Dati non validi" };
  const motivo = (input.motivo ?? "").trim();
  if (motivo.length < MOTIVAZIONE_MIN) {
    return { ok: false, error: `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.` };
  }
  if (motivo.length > 1000) return { ok: false, error: "La motivazione è troppo lunga (massimo 1000 caratteri)." };
  const { conversationId, messageId } = ids.data;

  // Senza accesso motivato e ancora valido non si interviene sulla conversazione.
  const accesso = await getAccessoValido(admin_user.id, conversationId);
  if (accesso.stato !== "valido") {
    return { ok: false, error: "Serve un accesso motivato ancora valido a questa conversazione." };
  }

  const admin = createAdminClient();
  const { data: msg, error: readErr } = await admin
    .from("messages")
    .select("id, conversation_id, sender_id, kind, body, attachment_url")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!msg) return { ok: false, error: "Messaggio non trovato" };
  if (msg.kind === "offer" || msg.kind === "system") {
    return { ok: false, error: "Offerte e messaggi di sistema non si rimuovono da qui." };
  }
  if (msg.body === MESSAGGIO_RIMOSSO && !msg.attachment_url) {
    return { ok: false, error: "Il messaggio è già stato rimosso." };
  }

  const { error: updErr } = await admin
    .from("messages")
    .update({
      kind: "text",
      body: MESSAGGIO_RIMOSSO,
      attachment_url: null,
      attachment_type: null,
      attachment_name: null,
      attachment_size: null,
      attachment_duration_ms: null,
    })
    .eq("id", msg.id)
    .eq("conversation_id", conversationId);
  if (updErr) return { ok: false, error: updErr.message };

  // L'allegato esce dal bucket. Il messaggio è già stato aggiornato: un errore
  // qui si segnala nei log ma non annulla la rimozione.
  if (msg.attachment_url) {
    const path = percorsoAllegatoChat(msg.attachment_url, conversationId);
    if (!path) {
      logger.warn("chat", "allegato non riconducibile a un percorso del bucket: file NON cancellato", {
        messageId: msg.id,
      });
    } else {
      const { error: rmErr } = await admin.storage.from(CHAT_BUCKET).remove([path]);
      if (rmErr) logger.error("chat", "allegato rimosso dal messaggio ma non dal bucket:", rmErr.message);
    }
  }

  const parties = await getConversationParties(conversationId);
  const destinazione =
    "data" in parties ? `Conversazione tra ${parties.data.artist.name} e ${parties.data.organizer.name}` : "Conversazione";
  const esito = await registraDecisione({
    actorId: admin_user.id,
    targetType: "messaggio",
    targetId: msg.id,
    action: "messaggio_rimosso",
    reason: motivo,
    affectedUserId: msg.sender_id,
    notify: msg.sender_id
      ? {
          decision: msg.attachment_url
            ? "Abbiamo rimosso un allegato che avevi inviato in una conversazione."
            : "Abbiamo rimosso un messaggio che avevi inviato in una conversazione.",
          target: destinazione,
          consequences: "Al suo posto la conversazione mostra «Messaggio rimosso dal team N'arte».",
        }
      : false,
  });
  if (!esito.ok) logger.warn("chat", "rimozione messaggio non registrata:", esito.error);

  revalidateChatRoutes(conversationId);
  return { ok: true, notified: esito.ok ? esito.notified : false };
}
