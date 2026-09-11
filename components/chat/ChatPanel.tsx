"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { ProfileDialog } from "./ProfileDialog";
import { useChatChannel } from "@/hooks/useChatChannel";
import { useConversationBlock } from "@/hooks/useConversationBlock";
import { markConversationRead } from "@/lib/chat/actions";
import type { ChatMessage, ChatPartyMeta } from "@/lib/chat/queries";

type ActiveBlock = { id: string; reason: string; blockedUserId: string };

export function ChatPanel({
  meta,
  initialMessages,
  viewerRole,
  currentUserId,
  readOnly = false,
  compact = false,
  backHref,
  block,
}: {
  meta: ChatPartyMeta;
  initialMessages: ChatMessage[];
  viewerRole: "artist" | "organizer" | "superadmin";
  currentUserId: string | null;
  readOnly?: boolean;
  compact?: boolean;
  backHref?: string;
  /**
   * Blocco da mostrare per l'utente corrente. Opzionale: se non passato,
   * viene derivato da meta.activeBlocks (già popolato da getConversationMeta
   * per tutte le viste — dashboard, organizzatore, admin, dock) e tenuto
   * aggiornato in tempo reale da useConversationBlock, così il composer si
   * spegne/riaccende senza refresh anche senza che il chiamante lo passi.
   */
  block?: ActiveBlock | null;
}) {
  const router = useRouter();
  const { messages } = useChatChannel(meta.conversationId, initialMessages);
  const { blocks } = useConversationBlock(meta.conversationId, meta.activeBlocks);
  const [profileOpen, setProfileOpen] = useState<"artist" | "organizer" | null>(null);

  const myBlock: ActiveBlock | null =
    block !== undefined
      ? block
      : (blocks.find((b) => b.blockedUserId === currentUserId) ?? null);
  const isBlocked = myBlock !== null;

  const counterpartParty: "artist" | "organizer" =
    viewerRole === "artist" ? "organizer" : "artist";
  const counterpart = useMemo(() => {
    if (viewerRole === "artist") return { name: meta.organizer.name, avatar: meta.organizer.avatarUrl };
    if (viewerRole === "organizer") return { name: meta.artist.name, avatar: meta.artist.avatarUrl };
    return { name: `${meta.artist.name} ↔ ${meta.organizer.name}`, avatar: meta.artist.avatarUrl };
  }, [meta, viewerRole]);

  useEffect(() => {
    if (readOnly || viewerRole === "superadmin") return;
    markConversationRead(meta.conversationId).catch(() => {});
  }, [meta.conversationId, readOnly, viewerRole, messages.length]);

  const canWrite = !readOnly && viewerRole !== "superadmin" && !isBlocked;
  const canOffer = canWrite;
  const disabledReason = isBlocked
    ? `Sei stato bloccato in questa conversazione da un amministratore. Motivo: ${myBlock!.reason}`
    : viewerRole === "superadmin"
    ? "Vista superadmin (sola lettura)"
    : undefined;

  return (
    <div className={`flex h-full min-h-0 flex-col ${compact ? "" : "rounded-xl border border-border bg-surface overflow-hidden"}`}>
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
        {backHref && (
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted active:scale-95 transition"
            aria-label="Torna alla lista"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        {viewerRole === "superadmin" ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setProfileOpen("artist")}
              className="flex items-center gap-2 min-w-0 hover:bg-muted/60 rounded-md px-1 py-0.5"
              aria-label="Apri profilo artista"
            >
              <Avatar src={meta.artist.avatarUrl} name={meta.artist.name} size="sm" />
              <span className="truncate font-semibold text-sm text-notte">{meta.artist.name}</span>
            </button>
            <span className="text-muted-foreground">↔</span>
            <button
              type="button"
              onClick={() => setProfileOpen("organizer")}
              className="flex items-center gap-2 min-w-0 hover:bg-muted/60 rounded-md px-1 py-0.5"
              aria-label="Apri profilo organizzatore"
            >
              <Avatar src={meta.organizer.avatarUrl} name={meta.organizer.name} size="sm" />
              <span className="truncate font-semibold text-sm text-notte">{meta.organizer.name}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setProfileOpen(counterpartParty)}
            className="flex flex-1 min-w-0 items-center gap-3 text-left hover:bg-muted/60 rounded-md px-1 py-1 transition-colors"
            aria-label="Visualizza profilo"
          >
            <Avatar src={counterpart.avatar} name={counterpart.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="truncate font-semibold text-sm text-notte">{counterpart.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {viewerRole === "artist" ? "Organizzatore" : "Artista"}
              </div>
            </div>
          </button>
        )}
      </header>
      <ProfileDialog
        open={profileOpen !== null}
        onClose={() => setProfileOpen(null)}
        meta={meta}
        party={profileOpen ?? "artist"}
      />
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        viewerRole={viewerRole}
        readOnly={readOnly || viewerRole === "superadmin"}
      />
      {isBlocked && (
        <div className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Sei stato bloccato in questa conversazione da un amministratore.</span>{" "}
            Non puoi inviare messaggi, offerte o allegati. Motivo: {myBlock!.reason}
          </p>
        </div>
      )}
      <MessageComposer
        conversationId={meta.conversationId}
        disabled={!canWrite}
        disabledReason={disabledReason}
        allowOffer={canOffer}
      />
    </div>
  );
}
