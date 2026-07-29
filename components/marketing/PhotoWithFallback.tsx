"use client";

import { useState, type ReactNode } from "react";

/**
 * Immagine che degrada da sola.
 *
 * Serve nelle sezioni redazionali (milestone, storie di artisti) dove i path
 * delle foto sono scritti nei file di contenuto ma i file veri arrivano dopo:
 * senza questo, ogni foto mancante è un'icona di immagine rotta in pagina.
 * Con `src` a null o con un 404 si passa al fallback tipografico e la sezione
 * resta presentabile.
 *
 * È l'unico pezzo client di sezioni altrimenti interamente server: `onError`
 * non esiste lato server e `next/image` non sa che un file statico manca.
 */
export function PhotoWithFallback({
  src,
  alt,
  className,
  fallback,
}: {
  src: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
