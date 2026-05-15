"use client";

import { useEffect, useMemo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { useChatChannel } from "@/hooks/useChatChannel";
import { markConversationRead } from "@/lib/chat/actions";
import type { ChatMessage, ChatPartyMeta } from "@/lib/chat/queries";
import type { BookingStatus } from "@/lib/supabase/types";

const statusLabel: Record<BookingStatus, { label: string; variant: "default" | "warning" | "success" | "danger" | "muted" }> = {
  pending: { label: "In attesa artista", variant: "warning" },
  in_trattativa: { label: "In trattativa", variant: "default" },
  confermata: { label: "Confermata", variant: "success" },
  rifiutata: { label: "Rifiutata", variant: "danger" },
  annullata: { label: "Annullata", variant: "muted" },
};

export function ChatPanel({
  meta,
  initialMessages,
  viewerRole,
  currentUserId,
  readOnly = false,
  compact = false,
}: {
  meta: ChatPartyMeta;
  initialMessages: ChatMessage[];
  viewerRole: "artist" | "organizer" | "superadmin";
  currentUserId: string | null;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const { messages } = useChatChannel(meta.bookingRequestId, initialMessages);

  const counterpart = useMemo(() => {
    if (viewerRole === "artist") return { name: meta.organizer.name, avatar: meta.organizer.avatarUrl };
    if (viewerRole === "organizer") return { name: meta.artist.name, avatar: meta.artist.avatarUrl };
    return { name: `${meta.artist.name} ↔ ${meta.organizer.name}`, avatar: meta.artist.avatarUrl };
  }, [meta, viewerRole]);

  useEffect(() => {
    if (readOnly || viewerRole === "superadmin") return;
    markConversationRead(meta.bookingRequestId).catch(() => {});
  }, [meta.bookingRequestId, readOnly, viewerRole, messages.length]);

  const status = statusLabel[meta.status];
  const canWrite = !readOnly && viewerRole !== "superadmin" && meta.status === "in_trattativa";
  const disabledReason =
    viewerRole === "superadmin"
      ? "Vista superadmin (sola lettura)"
      : meta.status === "in_trattativa"
      ? undefined
      : meta.status === "confermata"
      ? "Trattativa confermata. Chat in sola lettura."
      : meta.status === "pending"
      ? "Chat disponibile dopo l'accettazione dell'artista."
      : "Trattativa chiusa.";

  return (
    <div className={`flex h-full flex-col ${compact ? "" : "rounded-xl border border-border bg-surface overflow-hidden"}`}>
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Avatar src={counterpart.avatar} name={counterpart.name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="truncate font-semibold text-sm text-notte">{counterpart.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            Evento {new Date(meta.eventDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
            {meta.venue?.name ? ` · ${meta.venue.name}` : ""}
          </div>
        </div>
        <Badge variant={status.variant} dot>{status.label}</Badge>
      </header>
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        viewerRole={viewerRole}
        readOnly={readOnly || viewerRole === "superadmin"}
      />
      <MessageComposer meta={meta} disabled={!canWrite} disabledReason={disabledReason} />
    </div>
  );
}
