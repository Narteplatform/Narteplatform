"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { fetchDockConversations } from "@/lib/chat/actions";
import { activeArtistFromCookie } from "@/lib/artist/active-cookie-client";
import type { ConversationItem } from "@/lib/chat/queries";
import type { ChatMessageKind, Role } from "@/lib/supabase/types";

type Raw = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_role: Role;
  kind: ChatMessageKind;
  body: string | null;
  attachment_name: string | null;
  created_at: string;
};

function previewBody(r: Raw): string {
  if (r.kind === "image") return "📷 Foto";
  if (r.kind === "document") return `📎 ${r.attachment_name ?? "Documento"}`;
  if (r.kind === "voice") return "🎙️ Vocale";
  if (r.kind === "offer") return "💰 Nuova offerta";
  if (r.kind === "system") return r.body ?? "Aggiornamento";
  return r.body ?? "Nuovo messaggio";
}

export function useUnreadToasts(currentUserId: string) {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const convByIdRef = useRef<Map<string, ConversationItem>>(new Map());
  // Profilo attivo secondo il server, ripiego se il cookie non c'e' ancora.
  const serverActiveRef = useRef<string | null>(null);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    convByIdRef.current = new Map(conversations.map((c) => [c.conversationId, c]));
  }, [conversations]);

  useEffect(() => {
    let cancelled = false;
    const reload = async () => {
      const res = await fetchDockConversations("all");
      if (cancelled) return;
      if (res.ok) {
        setConversations(res.conversations);
        serverActiveRef.current = res.activeArtistId ?? null;
      }
    };
    reload();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const suffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`unread-toasts:${currentUserId}:${suffix}`);
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const r = payload.new as Raw;
            if (!r) return;
            if (r.sender_id === currentUserId) return;
            const conv = convByIdRef.current.get(r.conversation_id);
            if (!conv) {
              // Nuova conversation: aggiorna lista in background, no toast (avoid spam)
              fetchDockConversations("all").then((res) => {
                if (res.ok) setConversations(res.conversations);
              });
              return;
            }
            // Sopprimi se utente è già nella chat aperta
            const p = pathRef.current ?? "";
            if (p.includes(`/chat/${r.conversation_id}`)) return;

            const inArtistArea = !p.startsWith("/organizzatore");
            // Account con piu' profili: il messaggio puo' essere per un profilo
            // diverso da quello attivo. Si avvisa comunque, dicendo per quale
            // profilo, e il clic passa prima a quel profilo.
            const activeId = activeArtistFromCookie() ?? serverActiveRef.current;
            const otherProfile =
              inArtistArea && r.sender_role === "organizer" && activeId !== null && conv.artistId !== activeId;
            toast(otherProfile ? `${conv.counterpartName} · per «${conv.artistName}»` : conv.counterpartName, {
              description: previewBody(r),
              duration: otherProfile ? 7000 : 4500,
              action: {
                label: "Apri",
                onClick: () => {
                  if (!inArtistArea) {
                    window.location.href = `/organizzatore/chat/${r.conversation_id}`;
                    return;
                  }
                  const chat = `/dashboard/chat/${r.conversation_id}`;
                  window.location.href = otherProfile
                    ? `/dashboard/profili/passa?to=${conv.artistId}&next=${encodeURIComponent(chat)}`
                    : chat;
                },
              },
            });
          },
        )
        .subscribe();
    } catch (err) {
      console.error("[unread-toasts] subscribe failed:", err);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("[unread-toasts] cleanup failed:", err);
        }
      }
    };
  }, [currentUserId]);
}
