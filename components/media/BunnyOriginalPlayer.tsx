"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { streamOriginalUrl, videoPosterUrl } from "@/lib/storage/bunny/urls";
import { VideoPoster } from "@/components/media/VideoPoster";

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
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
        <VideoPoster guid={guid} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 text-white/80">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <p className="text-xs">Video in preparazione, torna fra poco.</p>
        </div>
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
