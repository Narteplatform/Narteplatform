"use client";

import { useCallback, useRef, useState } from "react";
import { Play, Volume2 } from "lucide-react";
import { streamEmbedUrl } from "@/lib/storage/bunny/urls";
import { VideoPoster } from "@/components/media/VideoPoster";
import { videoAspectRatio } from "@/lib/media/aspect";
import { useTrackingConsent } from "@/lib/legal/consent-client";
import { iubendaAttivo } from "@/lib/legal/iubenda";

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
 *
 * CONSENSO. L'iframe è di terza parte: il player di Bunny (BunnyWay d.o.o.,
 * Slovenia) imposta cookie propri e raccoglie statistiche di visione. La
 * facciata faceva già metà del lavoro, non caricandolo finché nessuno preme
 * play; mancava che quel play fosse informato. Da qui lo sblocco per singolo
 * video: chi non vuole cookie di statistica in generale può comunque decidere
 * di guardare QUESTO video, ed è il modello che il Garante considera valido per
 * i contenuti incorporati.
 *
 * Se iubenda non è configurato, o il suo script è stato bloccato da
 * un'estensione, si FALLISCE CHIUSI: compare l'avviso, non il video. Un player
 * che parte perché il gestore del consenso non ha risposto è esattamente il
 * caso che non deve accadere.
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
  const { measurement } = useTrackingConsent();
  const [sbloccatoQui, setSbloccatoQui] = useState(false);
  const [avviso, setAvviso] = useState(false);

  // Finché iubenda non è configurato non esiste alcun consenso da raccogliere e
  // il player si comporta come prima. Dal momento in cui c'è, serve o il
  // consenso generale alla misurazione o lo sblocco di questo singolo video.
  const puoRiprodurre = !iubendaAttivo || measurement || sbloccatoQui;
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

  if (avviso) {
    return (
      <div
        className="relative flex w-full flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center"
        style={{ aspectRatio }}
      >
        <p className="max-w-sm text-sm text-white/90">
          Per riprodurre il video il player di <strong>Bunny Stream</strong>{" "}
          (BunnyWay d.o.o., Slovenia) imposta cookie propri e raccoglie
          statistiche di visione.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSbloccatoQui(true);
              setAvviso(false);
              setPlaying(true);
            }}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Accetta e riproduci
          </button>
          <button
            type="button"
            onClick={() => window._iub?.cs?.api?.openPreferences?.()}
            className="rounded-full border border-white/40 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Gestisci le preferenze
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (puoRiprodurre ? setPlaying(true) : setAvviso(true))}
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
