"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { conversationBlockReasonSchema } from "@/lib/validators/schemas";
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
  const admin_user = await requireRole(["superadmin"]);

  if (input.target !== "artist" && input.target !== "organizer") {
    return { ok: false, error: "Destinatario del blocco non valido" };
  }
  const parsedReason = conversationBlockReasonSchema.safeParse(input.reason);
  if (!parsedReason.success) {
    return { ok: false, error: parsedReason.error.issues[0]?.message ?? "Motivazione non valida" };
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
    console.error("[chat] messaggio system blocco:", msgErr);
  }

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
  const admin_user = await requireRole(["superadmin"]);

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
    if (msgErr) console.error("[chat] messaggio system sblocco:", msgErr);
  }

  revalidateChatRoutes(block.conversation_id);
  return { ok: true };
}
