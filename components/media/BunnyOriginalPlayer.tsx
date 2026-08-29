"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { streamOriginalUrl, videoPosterUrl } from "@/lib/storage/bunny/urls";

/**
 * Riproduce il file ORIGINALE di un video Bunny mentre la transcodifica è in
 * corso, così il video è guardabile subito invece che fra mezz'ora.
 *
 * ⚠️ Richiede che sulla library sia DISATTIVATO "Block Direct URL File Access"
 * (Stream → library → Security). Con quell'opzione attiva ogni URL diretto —
 * originale, playlist, thumbnail — risponde 403, e qui si ricade sul messaggio
 * di attesa: nessuna rottura, solo l'esperienza di prima.
 */
export function BunnyOriginalPlayer({
  guid,
  title,
}: {
  guid: string;
  title?: string | null;
}) {
  const [unavailable, setUnavailable] = useState(false);

  if (unavailable) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-neutral-900 text-white/70">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <p className="text-xs">Video in preparazione…</p>
      </div>
    );
  }

  return (
    <video
      src={streamOriginalUrl(guid)}
      poster={videoPosterUrl(guid)}
      title={title ?? undefined}
      controls
      preload="metadata"
      playsInline
      onError={() => setUnavailable(true)}
      className="aspect-video w-full bg-black"
    />
  );
}
