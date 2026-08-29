"use client";

import { useState } from "react";
import { Film } from "lucide-react";
import { streamThumbnailUrl, videoPosterUrl } from "@/lib/storage/bunny/urls";

/**
 * Poster di un video Bunny, con due ricadute in cascata.
 *
 * 1. IL NOSTRO fotogramma, estratto dal browser al momento del caricamento e
 *    salvato su Bunny Storage. Esiste dal primo istante — è la via più veloce.
 * 2. La THUMBNAIL DI BUNNY, generata durante l'elaborazione. Copre il caso che
 *    il primo livello non può coprire: quando il browser di chi carica non
 *    decodifica il file (un .mov HEVC su un PC senza decoder hardware — misurato
 *    sul 19% dei Chrome su Windows), il fotogramma non si può estrarre in
 *    locale, e senza questo secondo livello l'artista resterebbe davanti a un
 *    riquadro vuoto proprio nel caso in cui è già costretto ad aspettare.
 * 3. Un riquadro neutro con l'icona. Mai un'immagine rotta.
 */
export function VideoPoster({
  guid,
  className = "h-full w-full bg-black object-cover",
}: {
  guid: string;
  className?: string;
}) {
  const [level, setLevel] = useState<0 | 1 | 2>(0);

  if (level === 2) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-900">
        <Film className="size-6 text-white/60" aria-hidden />
      </div>
    );
  }

  const src = level === 0 ? videoPosterUrl(guid) : streamThumbnailUrl(guid);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setLevel((l) => (l === 0 ? 1 : 2))}
      className={className}
    />
  );
}
