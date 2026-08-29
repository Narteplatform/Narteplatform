"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { streamOriginalUrl, videoPosterUrl } from "@/lib/storage/bunny/urls";
import { VideoPoster } from "@/components/media/VideoPoster";
import { videoAspectRatio } from "@/lib/media/aspect";

/**
 * Riproduce il file ORIGINALE di un video Bunny mentre la conversione è in
 * corso, così è guardabile subito invece che fra venti minuti.
 *
 * Richiede che sulla library sia disattivato "Block Direct URL File Access". Se
 * fosse riattivato, ogni URL diretto risponde 403 e qui si ricade sul messaggio
 * di attesa: nessuna rottura, solo l'esperienza di prima.
 */
export function BunnyOriginalPlayer({
  guid,
  title,
  width,
  height,
}: {
  guid: string;
  title?: string | null;
  width?: number | null;
  height?: number | null;
}) {
  const [unavailable, setUnavailable] = useState(false);
  const aspectRatio = videoAspectRatio(width, height);

  if (unavailable) {
    return (
      <div className="relative w-full overflow-hidden bg-neutral-900" style={{ aspectRatio }}>
        <VideoPoster guid={guid} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 text-white/80">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <p className="text-xs">Video in preparazione, torna fra poco.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-black" style={{ aspectRatio }}>
      <video
        src={streamOriginalUrl(guid)}
        poster={videoPosterUrl(guid)}
        title={title ?? undefined}
        controls
        preload="metadata"
        playsInline
        onError={() => setUnavailable(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
