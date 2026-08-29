"use client";

import { Video } from "lucide-react";
import { VideoUpload, type ArtistVideoItem } from "@/components/forms/VideoUpload";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import type { ArtistProfileData } from "@/components/dashboard/profile/types";

/**
 * Galleria video del profilo artista.
 *
 * ⚠️ QUESTA SEZIONE NON SCRIVE PIÙ SU `artists.videos`, ed è deliberato.
 *
 * Prima c'era una casella di testo per incollare link YouTube/Vimeo, accanto al
 * caricamento dei file. Il caricamento è ormai la funzione definitiva — i video
 * vivono su Bunny, sono riproducibili subito e contano nei limiti di piano —
 * quindi il campo dei link è stato tolto.
 *
 * Non è stato tolto solo il campo: è stato tolto l'INTERO form. Se fosse
 * rimasto il form senza il campo, il primo salvataggio avrebbe inviato
 * `videos: []` e cancellato i link già presenti in colonna. Su questo schema
 * scrivere un array vuoto CANCELLA (vedi la regola 3 di CLAUDE.md), quindi
 * l'unico modo sicuro di smettere di offrire quel campo è smettere del tutto di
 * scrivere quella colonna. I link già salvati restano nel database e continuano
 * a comparire sul profilo pubblico.
 */
export function VideoBlock({
  artist,
  initialVideos,
  videoMax,
}: {
  artist: ArtistProfileData;
  initialVideos: ArtistVideoItem[];
  /** Tetto del piano dell'artista, risolto lato server: 1 Free, 3 Pro, 3 Max. */
  videoMax: number;
}) {
  const count = initialVideos.length;

  return (
    <ProfileSection
      id="video"
      title="Galleria video"
      description="I video che carichi dal tuo dispositivo"
      icon={<Video className="size-4" />}
      status={
        count > 0
          ? { tone: "count", label: count === 1 ? "1 video" : `${count} video` }
          : { tone: "todo", label: "Nessun video" }
      }
    >
      <VideoUpload artistId={artist.id} initialVideos={initialVideos} videoMax={videoMax} />
    </ProfileSection>
  );
}
