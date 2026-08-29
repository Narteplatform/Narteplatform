import { BunnyVideoFacade } from "@/components/media/BunnyVideoFacade";
import { videoAspectRatio } from "@/lib/media/aspect";
import { BunnyOriginalPlayer } from "@/components/media/BunnyOriginalPlayer";

export type PlayableArtistVideo = {
  id: string;
  url: string | null;
  title: string | null;
  provider: string;
  bunny_guid: string | null;
  playback_state: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
};

/**
 * Un video è "in attesa" solo se la sua conversione è FALLITA. Tutto il resto
 * si prova a mostrare.
 *
 * ⚠️ Qui NON si decide in base al MIME, ed è deliberato. Un elenco tipo
 * `mp4 | webm` sbaglia in due direzioni opposte: escluderebbe i `.mov` in H.264
 * — quelli che l'iPhone produce in «Massima compatibilità», perfettamente
 * riproducibili — e escluderebbe l'HEVC anche su Safari, che invece lo decodifica
 * benissimo. La riproducibilità non è una proprietà del file: è una proprietà
 * della COPPIA file+browser, e l'unico che la conosce è il browser che ha il
 * file davanti. Per questo si prova sempre, e ci si arrende solo su `onError`.
 */
export function isRenderable(playbackState: string): boolean {
  return playbackState !== "failed";
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
      return (
        <BunnyVideoFacade
          guid={video.bunny_guid}
          title={video.title}
          width={video.width}
          height={video.height}
        />
      );
    }
    if (video.playback_state === "processing") {
      // Si prova SEMPRE l'originale: se questo browser lo decodifica, il
      // visitatore lo guarda adesso invece che fra venti minuti. Se non lo
      // decodifica, BunnyOriginalPlayer mostra da sé il messaggio di attesa.
      return (
        <BunnyOriginalPlayer
          guid={video.bunny_guid}
          title={video.title}
          width={video.width}
          height={video.height}
        />
      );
    }
    // Conversione fallita: non si mostra niente. Un player rotto è peggio di un
    // video assente.
    return null;
  }

  if (!video.url) return null;

  return (
    // preload="metadata" è obbligatorio: senza, ogni visita scaricherebbe i
    // video interi. object-cover perché il contenitore ha già il rapporto del
    // video: non c'è nulla da riempire con barre nere.
    <div
      className="w-full overflow-hidden bg-black"
      style={{ aspectRatio: videoAspectRatio(video.width, video.height) }}
    >
      <video
        src={video.url}
        controls
        preload="metadata"
        playsInline
        className="h-full w-full object-cover"
      />
    </div>
  );
}
