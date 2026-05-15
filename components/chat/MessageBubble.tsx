"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageAttachment } from "./MessageAttachment";
import type { ChatMessage } from "@/lib/chat/queries";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

type TickState = "sent" | "delivered" | "read";

function Ticks({ state, isOwn }: { state: TickState; isOwn: boolean }) {
  if (!isOwn) return null;
  if (state === "sent") {
    return <Check className="size-3.5 opacity-70" aria-label="inviato" />;
  }
  if (state === "delivered") {
    return <CheckCheck className="size-3.5 opacity-70" aria-label="consegnato" />;
  }
  return <CheckCheck className="size-3.5 text-[#34B7F1]" aria-label="letto" />;
}

export function MessageBubble({
  msg,
  isOwn,
  tick,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  tick: TickState;
}) {
  if (msg.kind === "system") {
    return (
      <div className="flex justify-center my-2">
        <div className="rounded-full bg-muted px-3 py-1 text-[11px] italic text-muted-foreground">
          {msg.body}
        </div>
      </div>
    );
  }

  const isAttachment = msg.kind === "image" || msg.kind === "document" || msg.kind === "voice";

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] text-sm leading-snug whitespace-pre-wrap break-words rounded-2xl",
          isAttachment ? "p-1.5" : "px-3.5 py-2",
          isOwn
            ? "bg-azzurro text-white rounded-br-md"
            : "bg-palco-80 text-notte border border-border rounded-bl-md",
        )}
      >
        {isAttachment ? (
          <MessageAttachment msg={msg} isOwn={isOwn} />
        ) : (
          <span>{msg.body}</span>
        )}
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px] font-medium pr-1",
            isOwn ? "text-white/70 justify-end" : "text-muted-foreground justify-end",
            isAttachment && "px-2 pb-1",
          )}
        >
          <span>{formatTime(msg.createdAt)}</span>
          <Ticks state={tick} isOwn={isOwn} />
        </div>
      </div>
    </div>
  );
}
