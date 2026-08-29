import { BunnyVideoFacade } from "@/components/media/BunnyVideoFacade";

export type PlayableArtistVideo = {
  id: string;
  url: string | null;
  title: string | null;
  provider: string;
  bunny_guid: string | null;
};

/**
 * Sceglie come rendere un video in base al provider.
 *
 * I due mondi convivono a tempo indeterminato: i video già caricati restano su
 * Supabase Storage e continuano a essere serviti dal `<video>` di sempre, i
 * nuovi passano da Bunny Stream. Nessuno dei due percorso ha bisogno che l'altro
 * venga smantellato.
 */
export function ArtistVideoPlayer({ video }: { video: PlayableArtistVideo }) {
  if (video.provider === "bunny" && video.bunny_guid) {
    return <BunnyVideoFacade guid={video.bunny_guid} title={video.title} />;
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
