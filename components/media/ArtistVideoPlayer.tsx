import { BunnyVideoFacade } from "@/components/media/BunnyVideoFacade";
import { BunnyOriginalPlayer } from "@/components/media/BunnyOriginalPlayer";

export type PlayableArtistVideo = {
  id: string;
  url: string | null;
  title: string | null;
  provider: string;
  bunny_guid: string | null;
  playback_state: string;
  mime_type: string | null;
};

/**
 * Container che il browser sa decodificare da solo, senza transcodifica.
 *
 * È l'elenco corto di proposito: `video/quicktime` resta fuori perché i .mov
 * dell'iPhone sono quasi sempre HEVC, che Chrome, Firefox e Android non
 * riproducono. Per quelli si aspetta Bunny — ed è esattamente il caso in cui la
 * transcodifica serve davvero.
 */
export function browserCanPlay(mime: string | null): boolean {
  return mime === "video/mp4" || mime === "video/webm";
}

/**
 * Sceglie come rendere un video, in base a provider e stato.
 *
 * ⚠️ IL PUNTO CHE CONTA: un video su Bunny non è riproducibile nell'istante in
 * cui l'upload finisce, perché va transcodificato, e la coda dell'encoding
 * GRATUITO richiede da qualche minuto a mezz'ora. Aspettare quel momento
 * significherebbe che l'artista carica e per mezz'ora nessuno vede niente.
 *
 * Ma Bunny conserva anche il file ORIGINALE, senza costi aggiuntivi. Quindi
 * finché la transcodifica è in corso si riproduce quello — istantaneo, e per un
 * MP4 o un WebM è esattamente ciò che il visitatore si aspetta. Quando la
 * versione a bitrate adattivo è pronta, si passa a quella: meno banda, player
 * completo, statistiche.
 */
export function ArtistVideoPlayer({ video }: { video: PlayableArtistVideo }) {
  if (video.provider === "bunny" && video.bunny_guid) {
    if (video.playback_state === "ready") {
      return <BunnyVideoFacade guid={video.bunny_guid} title={video.title} />;
    }
    if (video.playback_state === "processing" && browserCanPlay(video.mime_type)) {
      return <BunnyOriginalPlayer guid={video.bunny_guid} title={video.title} />;
    }
    // In elaborazione e non decodificabile dal browser: non si mostra niente.
    // Un player rotto è peggio di un video assente.
    return null;
  }

  if (!video.url) return null;

  return (
    // preload="metadata" è obbligatorio: senza, ogni visita scaricherebbe i
    // video interi.
    <video
      src={video.url}
      controls
      preload="metadata"
      playsInline
      className="aspect-video w-full bg-black"
    />
  );
}
