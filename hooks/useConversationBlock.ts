"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ActiveConversationBlock } from "@/lib/chat/queries";
import type { Role } from "@/lib/supabase/types";

type Raw = {
  id: string;
  conversation_id: string;
  blocked_user_id: string;
  blocked_role: Role;
  reason: string;
  created_by: string | null;
  created_at: string;
  lifted_at: string | null;
};

function fromRaw(r: Raw): ActiveConversationBlock {
  return {
    id: r.id,
    blockedUserId: r.blocked_user_id,
    blockedRole: r.blocked_role,
    reason: r.reason,
    createdAt: r.created_at,
    createdBy: r.created_by,
  };
}

/**
 * Realtime sui blocchi (Feature C): stesso pattern di useChatChannel, ma su
 * conversation_blocks. Mantiene solo i blocchi ATTIVI (lifted_at is null),
 * così il composer si spegne/riaccende senza refresh sia sull'artista che
 * sull'organizzatore.
 */
export function useConversationBlock(
  conversationId: string | null,
  initial: ActiveConversationBlock[],
) {
  const [blocks, setBlocks] = useState<ActiveConversationBlock[]>(initial);
  const initialKey = useRef<string>("");

  useEffect(() => {
    if (initialKey.current !== conversationId) {
      setBlocks(initial);
      initialKey.current = conversationId ?? "";
    }
  }, [conversationId, initial]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const suffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`conversation-block:${conversationId}:${suffix}`);
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversation_blocks",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const raw = payload.new as Raw;
              if (raw.lifted_at) return; // blocco già chiuso al momento dell'insert (non dovrebbe succedere, ma per sicurezza)
              const b = fromRaw(raw);
              setBlocks((prev) => (prev.some((x) => x.id === b.id) ? prev : [...prev, b]));
            } else if (payload.eventType === "UPDATE") {
              const raw = payload.new as Raw;
              if (raw.lifted_at) {
                // Sbloccato: esce dall'elenco dei blocchi attivi.
                setBlocks((prev) => prev.filter((x) => x.id !== raw.id));
              } else {
                const b = fromRaw(raw);
                setBlocks((prev) => (prev.some((x) => x.id === b.id) ? prev.map((x) => (x.id === b.id ? b : x)) : [...prev, b]));
              }
            } else if (payload.eventType === "DELETE") {
              const id = (payload.old as { id?: string }).id;
              if (id) setBlocks((prev) => prev.filter((x) => x.id !== id));
            }
          },
        )
        .subscribe();
    } catch (err) {
      console.error("[chat] realtime blocco subscribe failed:", err);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("[chat] realtime blocco cleanup failed:", err);
        }
      }
    };
  }, [conversationId]);

  return { blocks };
}
