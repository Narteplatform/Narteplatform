"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/chat/queries";
import type { ChatMessageKind, ChatOfferStatus, Role } from "@/lib/supabase/types";

type Raw = {
  id: string;
  booking_request_id: string;
  sender_id: string | null;
  sender_role: Role;
  kind: ChatMessageKind;
  body: string | null;
  offer_event_date: string | null;
  offer_time_slot: string | null;
  offer_budget: number | null;
  offer_status: ChatOfferStatus | null;
  offer_responded_at: string | null;
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
    bookingRequestId: r.booking_request_id,
    senderId: r.sender_id,
    senderRole: r.sender_role,
    kind: r.kind,
    body: r.body,
    offerEventDate: r.offer_event_date,
    offerTimeSlot: r.offer_time_slot,
    offerBudget: r.offer_budget,
    offerStatus: r.offer_status,
    offerRespondedAt: r.offer_responded_at,
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

export function useChatChannel(bookingRequestId: string | null, initial: ChatMessage[]) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const initialKey = useRef<string>("");

  useEffect(() => {
    if (initialKey.current !== bookingRequestId) {
      setMessages(initial);
      initialKey.current = bookingRequestId ?? "";
    }
  }, [bookingRequestId, initial]);

  useEffect(() => {
    if (!bookingRequestId) return;
    const supabase = createClient();
    const suffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`booking:${bookingRequestId}:${suffix}`);
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "booking_messages",
            filter: `booking_request_id=eq.${bookingRequestId}`,
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
        .subscribe();
    } catch (err) {
      console.error("[chat] realtime subscribe failed:", err);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("[chat] realtime cleanup failed:", err);
        }
      }
    };
  }, [bookingRequestId]);

  return { messages, setMessages };
}
