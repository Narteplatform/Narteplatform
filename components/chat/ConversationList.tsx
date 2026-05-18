"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import type { ConversationItem } from "@/lib/chat/queries";
import { cn } from "@/lib/utils";

function formatLastTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function previewText(item: ConversationItem): string {
  if (!item.lastMessage) return "Nessun messaggio";
  if (item.lastMessage.kind === "offer") return "💰 Offerta";
  if (item.lastMessage.kind === "image") return "📷 Foto";
  if (item.lastMessage.kind === "document") return "📎 Documento";
  if (item.lastMessage.kind === "voice") return "🎙️ Vocale";
  if (item.lastMessage.kind === "system") return item.lastMessage.body ?? "Aggiornamento";
  return item.lastMessage.body ?? "";
}

type Mode = "party" | "superadmin";

export function ConversationList({
  items,
  basePath,
  activeId,
  mode = "party",
  onPickId,
}: {
  items: ConversationItem[];
  basePath: string;
  activeId?: string | null;
  mode?: Mode;
  onPickId?: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.counterpartName.toLowerCase().includes(s) ||
        i.artistName.toLowerCase().includes(s) ||
        i.organizerName.toLowerCase().includes(s),
    );
  }, [items, search]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-3 py-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca…"
        />
        {mode === "superadmin" && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Vista globale (sola lettura)
          </p>
        )}
      </div>
      <ul className="flex-1 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nessuna conversazione.
          </li>
        ) : (
          filtered.map((it) => {
            const isActive = activeId === it.conversationId;
            const content = (
              <div
                className={cn(
                  "flex items-start gap-3 px-3 py-3.5 transition-colors cursor-pointer",
                  isActive ? "bg-azzurro-subtle" : "hover:bg-muted/60 active:bg-muted/80",
                )}
              >
                <Avatar src={it.counterpartAvatarUrl} name={it.counterpartName} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-sm text-notte">
                      {it.counterpartName}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {it.lastMessage ? formatLastTime(it.lastMessage.createdAt) : formatLastTime(it.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="flex-1 truncate text-xs text-muted-foreground">{previewText(it)}</p>
                    {it.unreadCount > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-corallo text-white text-[10px] font-bold size-5">
                        {it.unreadCount > 9 ? "9+" : it.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
            return (
              <li key={it.conversationId}>
                {onPickId ? (
                  <button
                    type="button"
                    onClick={() => onPickId(it.conversationId)}
                    className="w-full text-left"
                  >
                    {content}
                  </button>
                ) : (
                  <Link href={`${basePath}/${it.conversationId}`}>{content}</Link>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
