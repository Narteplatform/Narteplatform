"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { OfferCard } from "./OfferCard";
import type { ChatMessage } from "@/lib/chat/queries";

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const onlyDate = new Date(d);
  onlyDate.setHours(0, 0, 0, 0);
  if (onlyDate.getTime() === today.getTime()) return "Oggi";
  if (onlyDate.getTime() === yesterday.getTime()) return "Ieri";
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

function groupByDay(messages: ChatMessage[]) {
  const groups: { day: string; items: ChatMessage[] }[] = [];
  for (const m of messages) {
    const day = dayLabel(m.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return groups;
}

export function MessageList({
  messages,
  currentUserId,
  viewerRole,
  readOnly,
}: {
  messages: ChatMessage[];
  currentUserId: string | null;
  viewerRole: "artist" | "organizer" | "superadmin";
  readOnly: boolean;
}) {
  const bookingLinkBase =
    viewerRole === "artist"
      ? "/dashboard/leads"
      : viewerRole === "organizer"
      ? "/organizzatore/richieste"
      : undefined;
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages.length]);

  const groups = groupByDay(messages);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[color:var(--color-background)]"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-center text-muted-foreground text-sm py-8">
          Nessun messaggio. Inizia la trattativa.
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.day} className="space-y-2">
            <div className="flex justify-center">
              <span className="rounded-full bg-muted px-3 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {g.day}
              </span>
            </div>
            {g.items.map((m) => {
              if (m.kind === "offer") {
                const canRespond = !readOnly && currentUserId !== null && m.senderId !== currentUserId;
                return (
                  <OfferCard
                    key={m.id}
                    msg={m}
                    canRespond={canRespond}
                    readOnly={readOnly || viewerRole === "superadmin"}
                    bookingLinkBase={bookingLinkBase}
                  />
                );
              }
              const isOwn = viewerRole !== "superadmin" && currentUserId !== null && m.senderId === currentUserId;
              const readByOther =
                viewerRole === "artist"
                  ? m.readByOrganizerAt != null
                  : viewerRole === "organizer"
                  ? m.readByArtistAt != null
                  : false;
              const isPersisted = !m.id.startsWith("temp-");
              const tick: "sent" | "delivered" | "read" = readByOther
                ? "read"
                : isPersisted
                ? "delivered"
                : "sent";
              return (
                <MessageBubble key={m.id} msg={m} isOwn={isOwn} tick={tick} />
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
