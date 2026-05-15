"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import type { ConversationItem } from "@/lib/chat/queries";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/supabase/types";

const statusVariant: Record<BookingStatus, "default" | "warning" | "success" | "danger" | "muted"> = {
  pending: "warning",
  in_trattativa: "default",
  confermata: "success",
  rifiutata: "danger",
  annullata: "muted",
};

const statusShort: Record<BookingStatus, string> = {
  pending: "Pending",
  in_trattativa: "Aperta",
  confermata: "Confermata",
  rifiutata: "Rifiutata",
  annullata: "Annullata",
};

function formatLastTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function previewText(item: ConversationItem): string {
  if (!item.lastMessage) return "Nessun messaggio";
  if (item.lastMessage.kind === "offer") return "📨 Offerta inviata";
  if (item.lastMessage.kind === "system") return item.lastMessage.body ?? "Aggiornamento";
  return item.lastMessage.body ?? "";
}

type Mode = "party" | "superadmin";

export function ConversationList({
  items,
  basePath,
  activeId,
  mode = "party",
  superadminScope,
  onPickId,
}: {
  items: ConversationItem[];
  basePath: string;
  activeId?: string | null;
  mode?: Mode;
  superadminScope?: "active" | "completed" | "all";
  onPickId?: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"active" | "completed" | "all">(superadminScope ?? "active");

  const filtered = useMemo(() => {
    let list = items;
    if (mode === "superadmin") {
      if (scope === "active") list = list.filter((i) => i.status === "in_trattativa");
      else if (scope === "completed")
        list = list.filter((i) => ["confermata", "rifiutata", "annullata"].includes(i.status));
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.counterpartName.toLowerCase().includes(s) ||
          i.artistName.toLowerCase().includes(s) ||
          i.organizerName.toLowerCase().includes(s),
      );
    }
    return list;
  }, [items, mode, scope, search]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-surface px-3 py-3 space-y-2">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca…"
        />
        {mode === "superadmin" && (
          <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <TabsList className="w-full">
              <TabsTrigger value="active" className="flex-1">In corso</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1">Completate</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">Tutte</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>
      <ul className="flex-1 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nessuna conversazione.
          </li>
        ) : (
          filtered.map((it) => {
            const isActive = activeId === it.bookingRequestId;
            const content = (
              <div
                className={cn(
                  "flex items-start gap-3 px-3 py-3 transition-colors cursor-pointer",
                  isActive ? "bg-azzurro-subtle" : "hover:bg-muted/60",
                )}
              >
                <Avatar src={it.counterpartAvatarUrl} name={it.counterpartName} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-sm text-notte">
                      {it.counterpartName}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {it.lastMessage ? formatLastTime(it.lastMessage.createdAt) : formatLastTime(it.updatedAt)}
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
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge variant={statusVariant[it.status]}>{statusShort[it.status]}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(it.eventDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </div>
              </div>
            );
            return (
              <li key={it.bookingRequestId}>
                {onPickId ? (
                  <button
                    type="button"
                    onClick={() => onPickId(it.bookingRequestId)}
                    className="w-full text-left"
                  >
                    {content}
                  </button>
                ) : (
                  <Link href={`${basePath}/${it.bookingRequestId}`}>{content}</Link>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
