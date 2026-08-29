"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { streamEmbedUrl, videoPosterUrl } from "@/lib/storage/bunny/urls";

/**
 * Player Bunny a FACCIATA: il poster ora, l'iframe solo al click.
 *
 * Un iframe di Bunny Stream carica l'intero bundle del suo player. Su un
 * profilo con tre video sarebbero tre bundle scaricati da OGNI visitatore, anche
 * da chi non ne guarda nemmeno uno: latenza sulla pagina e banda CDN — che si
 * paga a GB — buttate via.
 *
 * La facciata mostra la sola thumbnail e monta l'iframe al primo click, con
 * `autoplay=true`, così quel click è anche l'avvio: per chi guarda non cambia
 * niente, per chi non guarda non si scarica niente.
 */
export function BunnyVideoFacade({
  guid,
  title,
}: {
  guid: string;
  title?: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  // Il poster è il fotogramma che abbiamo estratto NOI al caricamento e messo
  // su Bunny Storage: esiste dal primo istante, mentre la thumbnail di Bunny
  // arriva solo a transcodifica finita. Se manca — un .mov HEVC che il browser
  // non ha saputo decodificare — non si mostra un'immagine rotta ma uno sfondo
  // pulito col pulsante di riproduzione, e il video resta guardabile.
  const [posterFailed, setPosterFailed] = useState(false);
  const label = title?.trim() || "Video";

  if (playing) {
    return (
      <div className="relative aspect-video w-full bg-black">
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
      className="group relative block aspect-video w-full overflow-hidden bg-black"
    >
      {!posterFailed && (
        <Image
          src={videoPosterUrl(guid)}
          alt=""
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          onError={() => setPosterFailed(true)}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <span
        aria-hidden
        className={`absolute inset-0 flex items-center justify-center transition-colors ${
          posterFailed ? "bg-neutral-900" : "bg-black/20 group-hover:bg-black/10"
        }`}
      >
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition-transform duration-300 group-hover:scale-110">
          <Play className="ml-1 size-6 fill-current" />
        </span>
      </span>
    </button>
  );
}
