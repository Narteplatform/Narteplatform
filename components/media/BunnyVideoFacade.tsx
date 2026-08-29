"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { streamEmbedUrl } from "@/lib/storage/bunny/urls";
import { VideoPoster } from "@/components/media/VideoPoster";
import { videoAspectRatio } from "@/lib/media/aspect";

/**
 * Player Bunny a FACCIATA: il poster ora, l'iframe solo al click.
 *
 * Un iframe di Bunny Stream carica l'intero bundle del suo player. Su un
 * profilo con tre video sarebbero tre bundle scaricati da OGNI visitatore, anche
 * da chi non ne guarda nemmeno uno: latenza sulla pagina e banda CDN — che si
 * paga a GB — buttate via. La facciata mostra il solo poster e monta l'iframe al
 * primo click, con `autoplay=true`, così quel click è anche l'avvio.
 *
 * Il contenitore prende il rapporto REALE del video, mai più alto di un
 * quadrato: un video verticale non finisce più schiacciato fra due barre nere
 * dentro un riquadro 16:9. Sul poster il ritaglio è pieno (`object-cover`),
 * quindi finché non si preme play non c'è alcuna barra.
 */
export function BunnyVideoFacade({
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
  const [playing, setPlaying] = useState(false);
  const label = title?.trim() || "Video";
  const aspectRatio = videoAspectRatio(width, height);

  if (playing) {
    return (
      <div className="relative w-full bg-black" style={{ aspectRatio }}>
        <iframe
          src={streamEmbedUrl(guid, { autoplay: true, playsinline: true })}
          title={label}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Riproduci ${label}`}
      className="group relative block w-full overflow-hidden bg-black"
      style={{ aspectRatio }}
    >
      <VideoPoster
        guid={guid}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/10"
      >
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition-transform duration-300 group-hover:scale-110">
          <Play className="ml-1 size-6 fill-current" />
        </span>
      </span>
    </button>
  );
}
