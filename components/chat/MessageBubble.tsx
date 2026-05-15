"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat/queries";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({
  msg,
  isOwn,
  isReadByOther,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  isReadByOther: boolean;
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
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] px-3.5 py-2 text-sm leading-snug whitespace-pre-wrap break-words rounded-2xl",
          isOwn
            ? "bg-azzurro text-white rounded-br-md"
            : "bg-palco-80 text-notte border border-border rounded-bl-md",
        )}
      >
        {msg.body}
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px] font-medium",
            isOwn ? "text-white/70 justify-end" : "text-muted-foreground justify-end",
          )}
        >
          <span>{formatTime(msg.createdAt)}</span>
          {isOwn && (
            <span aria-label={isReadByOther ? "letto" : "inviato"}>
              {isReadByOther ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
