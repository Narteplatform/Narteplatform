"use client";

import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import type { ChatMessage } from "@/lib/chat/queries";
import { signMessageAttachment } from "@/lib/chat/actions";
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
  const url = useAttachmentUrl(msg);

  if (!msg.attachmentUrl) return null;

  // Il messaggio è appena arrivato dal canale realtime e porta il percorso
  // grezzo: si mostra un segnaposto finché la firma non torna, invece di un
  // riquadro rotto.
  if (!url) {
    return (
      <div className="h-16 w-[180px] animate-pulse rounded-xl border border-border bg-muted/60" />
    );
  }

  if (msg.kind === "image") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-xl border border-border max-w-[260px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
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
        <audio src={url} controls preload="metadata" className="w-full h-9" />
        <span className={cn("text-[10px]", isOwn ? "text-white/80" : "text-muted-foreground")}>
          {formatDuration(msg.attachmentDurationMs)}
        </span>
      </div>
    );
  }

  // document
  return (
    <a
      href={url}
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

/**
 * L'indirizzo apribile dell'allegato.
 *
 * Gli allegati stanno in un bucket privato, quindi in colonna c'è un percorso e
 * non un indirizzo. I messaggi caricati con la pagina arrivano già firmati dal
 * server; quelli che arrivano dopo, dal canale realtime, portano il percorso
 * grezzo e vanno firmati qui, una volta sola.
 */
function useAttachmentUrl(msg: ChatMessage): string | null {
  const salvato = msg.attachmentUrl;
  const giaPronto = salvato ? /^https?:\/\//i.test(salvato) : false;
  const [firmato, setFirmato] = useState<string | null>(giaPronto ? salvato : null);

  useEffect(() => {
    if (!salvato || giaPronto) {
      setFirmato(giaPronto ? salvato : null);
      return;
    }
    let vivo = true;
    signMessageAttachment(msg.id)
      .then((res) => {
        if (vivo && res.ok) setFirmato(res.url);
      })
      .catch(() => {
        // Nessun rumore: al ricaricamento della pagina l'allegato arriva già
        // firmato dal server.
      });
    return () => {
      vivo = false;
    };
  }, [msg.id, salvato, giaPronto]);

  return firmato;
}
