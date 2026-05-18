"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { fetchDockConversation, fetchDockConversations } from "@/lib/chat/actions";
import { useChatDock } from "./ChatDockProvider";
import { ConversationList } from "./ConversationList";
import { ChatPanel } from "./ChatPanel";
import type { ConversationItem, ChatMessage, ChatPartyMeta } from "@/lib/chat/queries";

type ActiveData = {
  meta: ChatPartyMeta;
  messages: ChatMessage[];
  currentUserId: string;
  viewerRole: "artist" | "organizer";
};

export function ChatDock() {
  const { state, openDock, closeDock, toggleDock, openConversation, clearConversation } = useChatDock();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [active, setActive] = useState<ActiveData | null>(null);
  const [loading, setLoading] = useState(false);

  const reloadList = useCallback(async () => {
    const res = await fetchDockConversations();
    if (res.ok) setConversations(res.conversations);
  }, []);

  useEffect(() => {
    reloadList();
  }, [reloadList]);

  useEffect(() => {
    const supabase = createClient();
    const suffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`dock:messages:${suffix}`);
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          () => {
            reloadList();
          },
        )
        .subscribe();
    } catch (err) {
      console.error("[chat-dock] realtime subscribe failed:", err);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("[chat-dock] realtime cleanup failed:", err);
        }
      }
    };
  }, [reloadList]);

  useEffect(() => {
    if (!state.activeId) {
      setActive(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchDockConversation(state.activeId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setActive({
          meta: res.meta,
          messages: res.messages,
          currentUserId: res.currentUserId,
          viewerRole: res.viewerRole,
        });
      } else {
        setActive(null);
        clearConversation();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state.activeId, clearConversation]);

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <>
      <AnimatePresence>
        {!state.open && (
          <motion.button
            type="button"
            onClick={openDock}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full bg-azzurro text-white shadow-[0_8px_30px_rgba(26,107,173,0.35)] hover:bg-azzurro-dark transition-colors"
            aria-label="Apri chat"
          >
            <MessageCircle className="size-6" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-corallo text-white text-[10px] font-bold size-5 ring-2 ring-background">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[70] bg-surface border border-border shadow-2xl flex flex-col overflow-hidden
              bottom-0 right-0 left-0 top-0 md:bottom-5 md:right-5 md:left-auto md:top-auto
              md:w-[380px] md:h-[560px] md:rounded-2xl"
            role="dialog"
            aria-label="Chat"
          >
            <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border bg-surface">
              <div className="flex items-center gap-2 min-w-0">
                {active && (
                  <button
                    type="button"
                    onClick={clearConversation}
                    className="rounded-full p-2 hover:bg-muted min-h-11 min-w-11"
                    aria-label="Indietro"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                )}
                <span className="font-display text-sm text-notte truncate">
                  {active ? "Chat" : "Le tue chat"}
                </span>
              </div>
              <button
                type="button"
                onClick={closeDock}
                className="rounded-full p-2 hover:bg-muted min-h-11 min-w-11"
                aria-label="Chiudi"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="flex-1 min-h-0">
              {active ? (
                <ChatPanel
                  meta={active.meta}
                  initialMessages={active.messages}
                  viewerRole={active.viewerRole}
                  currentUserId={active.currentUserId}
                  compact
                />
              ) : loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Caricamento…
                </div>
              ) : (
                <ConversationList
                  items={conversations}
                  basePath="#"
                  onPickId={(id) => openConversation(id)}
                  mode="party"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <span className="sr-only" aria-hidden="true" onClick={toggleDock} />
    </>
  );
}
