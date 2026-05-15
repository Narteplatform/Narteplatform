"use client";

import { FileText, Download } from "lucide-react";
import type { ChatMessage } from "@/lib/chat/queries";
import { cn } from "@/lib/utils";

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "0:00";
  const s = Math.round(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

export function MessageAttachment({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  if (!msg.attachmentUrl) return null;

  if (msg.kind === "image") {
    return (
      <a
        href={msg.attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-xl border border-border max-w-[260px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={msg.attachmentUrl}
          alt={msg.attachmentName ?? "Immagine"}
          className="h-auto w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (msg.kind === "voice") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl px-3 py-2 max-w-[280px]",
          isOwn ? "bg-azzurro-dark/30" : "bg-palco-80",
        )}
      >
        <audio src={msg.attachmentUrl} controls preload="metadata" className="w-full h-9" />
        <span className={cn("text-[10px]", isOwn ? "text-white/80" : "text-muted-foreground")}>
          {formatDuration(msg.attachmentDurationMs)}
        </span>
      </div>
    );
  }

  // document
  return (
    <a
      href={msg.attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={msg.attachmentName ?? undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border px-3 py-2 max-w-[280px] hover:bg-muted/60 transition-colors",
        isOwn ? "bg-azzurro-dark/20 border-azzurro/40" : "bg-surface",
      )}
    >
      <FileText className={cn("size-8 shrink-0", isOwn ? "text-white" : "text-azzurro")} />
      <div className="flex-1 min-w-0">
        <div className={cn("truncate text-sm font-medium", isOwn ? "text-white" : "text-notte")}>
          {msg.attachmentName ?? "Documento"}
        </div>
        <div className={cn("text-[11px]", isOwn ? "text-white/70" : "text-muted-foreground")}>
          {formatBytes(msg.attachmentSize)}
        </div>
      </div>
      <Download className={cn("size-4 shrink-0", isOwn ? "text-white/80" : "text-muted-foreground")} />
    </a>
  );
}
