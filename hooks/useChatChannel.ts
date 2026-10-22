"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchConversationMessages } from "@/lib/chat/actions";
import type { ChatMessage } from "@/lib/chat/queries";
import type { ChatMessageKind, ChatOfferStatus, Role } from "@/lib/supabase/types";

type Raw = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_role: Role;
  kind: ChatMessageKind;
  body: string | null;
  offer_event_date: string | null;
  offer_time_slot: string | null;
  offer_budget_cents: number | null;
  offer_description: string | null;
  offer_status: ChatOfferStatus | null;
  offer_responded_at: string | null;
  offer_booking_request_id: string | null;
  read_by_artist_at: string | null;
  read_by_organizer_at: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_duration_ms: number | null;
  created_at: string;
};

function fromRaw(r: Raw): ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    senderRole: r.sender_role,
    kind: r.kind,
    body: r.body,
    offerEventDate: r.offer_event_date,
    offerTimeSlot: r.offer_time_slot,
    offerBudgetCents: r.offer_budget_cents,
    offerDescription: r.offer_description,
    offerStatus: r.offer_status,
    offerRespondedAt: r.offer_responded_at,
    offerBookingRequestId: r.offer_booking_request_id,
    readByArtistAt: r.read_by_artist_at,
    readByOrganizerAt: r.read_by_organizer_at,
    attachmentUrl: r.attachment_url ?? null,
    attachmentType: r.attachment_type ?? null,
    attachmentName: r.attachment_name ?? null,
    attachmentSize: r.attachment_size ?? null,
    attachmentDurationMs: r.attachment_duration_ms ?? null,
    createdAt: r.created_at,
  };
}

/**
 * Unisce i messaggi riletti dal server a quelli in pagina: aggiunge i mancanti
 * e aggiorna gli esistenti (stato offerta, letture), ma non toglie mai nulla.
 * Una rilettura fallita o parziale non può svuotare la chat; le cancellazioni
 * arrivano dal canale realtime.
 */
function unisci(prev: ChatMessage[], fresh: ChatMessage[]): ChatMessage[] {
  if (fresh.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of fresh) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Attesa prima di riaprire un canale caduto: cresce fino a 30 secondi. */
const RITARDI_RICONNESSIONE_MS = [1_000, 3_000, 10_000, 30_000];

/**
 * `realtime = false` per il Team: le sue letture passano dal server dopo un
 * accesso registrato (migration 0064 toglie il permesso di lettura dal
 * browser), quindi non ha senso sottoscrivere nulla. In quel caso i messaggi
 * seguono sempre l'ultimo valore letto dal server (pulsante «Aggiorna»).
 */
export function useChatChannel(
  conversationId: string | null,
  initial: ChatMessage[],
  realtime = true,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const initialKey = useRef<string>("");
  // Cambiarlo riapre il canale: è così che si riconnette dopo un errore.
  const [tentativo, setTentativo] = useState(0);
  const fallimenti = useRef(0);

  useEffect(() => {
    if (!realtime || initialKey.current !== conversationId) {
      setMessages(initial);
      initialKey.current = conversationId ?? "";
    } else {
      // Dati più freschi dal server (navigazione, refresh): si uniscono senza
      // perdere ciò che è arrivato nel frattempo dal canale.
      setMessages((prev) => unisci(prev, initial));
    }
  }, [conversationId, initial, realtime]);

  /** Rilegge la conversazione dal server e la unisce a quella in pagina. */
  const resync = useCallback(async () => {
    if (!conversationId || !realtime) return;
    try {
      const res = await fetchConversationMessages(conversationId);
      if (!res.ok) return;
      setMessages((prev) =>
        initialKey.current === conversationId ? unisci(prev, res.messages) : prev,
      );
    } catch (err) {
      console.error("[chat] rilettura messaggi:", err);
    }
  }, [conversationId, realtime]);

  useEffect(() => {
    if (!conversationId || !realtime) return;
    const supabase = createClient();
    const suffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let chiuso = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      channel = supabase.channel(`conversation:${conversationId}:${suffix}`);
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const m = fromRaw(payload.new as Raw);
              setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            } else if (payload.eventType === "UPDATE") {
              const m = fromRaw(payload.new as Raw);
              setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
            } else if (payload.eventType === "DELETE") {
              const id = (payload.old as { id?: string }).id;
              if (id) setMessages((prev) => prev.filter((x) => x.id !== id));
            }
          },
        )
        .subscribe((status) => {
          if (chiuso) return;
          if (status === "SUBSCRIBED") {
            fallimenti.current = 0;
            // Quello che è arrivato mentre il canale si apriva (o era giù) non
            // passa dal canale: lo si recupera rileggendo.
            void resync();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            void resync();
            // CHANNEL_ERROR è spesso seguito da CLOSED: una riconnessione sola.
            if (timer) return;
            const ritardo =
              RITARDI_RICONNESSIONE_MS[Math.min(fallimenti.current, RITARDI_RICONNESSIONE_MS.length - 1)];
            fallimenti.current += 1;
            timer = setTimeout(() => setTentativo((n) => n + 1), ritardo);
          }
        });
    } catch (err) {
      console.error("[chat] realtime subscribe failed:", err);
    }

    function alRitorno() {
      if (document.visibilityState === "visible") void resync();
    }
    document.addEventListener("visibilitychange", alRitorno);
    window.addEventListener("focus", alRitorno);
    window.addEventListener("online", alRitorno);

    return () => {
      chiuso = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", alRitorno);
      window.removeEventListener("focus", alRitorno);
      window.removeEventListener("online", alRitorno);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("[chat] realtime cleanup failed:", err);
        }
      }
    };
  }, [conversationId, realtime, resync, tentativo]);

  return { messages, setMessages, resync };
}
