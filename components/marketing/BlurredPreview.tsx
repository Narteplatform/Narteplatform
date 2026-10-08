"use client";

import { useState } from "react";

/**
 * Anteprima sfocata della copertina per le schede ospite. L'immagine è già
 * ridotta (24x30) e sfocata dal server: qui si ingrandisce soltanto. Se non
 * carica, sparisce e resta il segnaposto sotto.
 */
export function BlurredPreview({ artistId }: { artistId: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/anteprima-artista/${artistId}`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl"
    />
  );
}
