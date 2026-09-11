"use client";

import { useCallback, useRef, useState } from "react";
import { Play, Volume2 } from "lucide-react";
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
 *
 * PERCHÉ L'IFRAME PARTE MUTO.
 * Il gesto dell'utente avviene qui, nel documento padre; il player sta dentro un
 * iframe di un'altra origine e per il browser quel gesto non conta. Con l'audio
 * acceso Chrome e Safari rifiutano l'avvio: il video restava fermo e serviva un
 * SECONDO click, dentro il player. L'autoplay muto invece è sempre concesso,
 * quindi il video parte davvero al primo click. L'audio si riattiva col
 * pulsante qui sotto, che parla al player col protocollo player.js — lo stesso
 * compromesso di YouTube e Instagram, e l'unico che il browser consenta.
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
  const [muted, setMuted] = useState(true);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const label = title?.trim() || "Video";
  const aspectRatio = videoAspectRatio(width, height);

  /**
   * Bunny espone il player.js protocol sull'iframe. Se un domani cambiasse, il
   * comando cadrebbe nel vuoto senza rompere niente: il visitatore ha comunque
   * il controllo volume del player: per questo non c'è nessun fallback rumoroso.
   */
  const unmute = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ context: "player.js", method: "unmute" }),
      "*"
    );
    setMuted(false);
  }, []);

  if (playing) {
    return (
      <div className="relative w-full bg-black" style={{ aspectRatio }}>
        <iframe
          ref={frameRef}
          src={streamEmbedUrl(guid, {
            autoplay: true,
            muted: true,
            playsinline: true,
          })}
          title={label}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />

        {muted && (
          <button
            type="button"
            onClick={unmute}
            className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Volume2 className="size-3.5" aria-hidden />
            Attiva audio
          </button>
        )}
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
