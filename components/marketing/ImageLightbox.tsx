"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  images: string[];
  className?: string;
  gridClassName?: string;
};

export function ImageLightbox({ images, className, gridClassName }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const isOpen = lightbox != null;

  const next = useCallback(() => {
    if (lightbox == null) return;
    setLightbox((lightbox + 1) % images.length);
  }, [lightbox, images.length]);

  const prev = useCallback(() => {
    if (lightbox == null) return;
    setLightbox((lightbox - 1 + images.length) % images.length);
  }, [lightbox, images.length]);

  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close, next, prev]);

  // Blocca scroll body quando lightbox aperto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className={className}>
      <div
        className={
          gridClassName ??
          "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        }
      >
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setLightbox(i)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            aria-label={`Apri foto ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {isOpen && lightbox != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Galleria foto"
        >
          {/* Overlay cliccabile per chiudere */}
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Chiudi galleria"
            onClick={close}
          />

          {/* Pulsante chiudi */}
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Chiudi"
          >
            <X className="size-5" />
          </button>

          {/* Navigazione — solo se più di 1 immagine */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 z-10 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Foto precedente"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-14 z-10 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Foto successiva"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {/* Immagine */}
          <div className="relative z-0 flex max-h-[90vh] max-w-5xl items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightbox]}
              alt=""
              className="max-h-[90vh] max-w-full object-contain"
            />
          </div>

          {/* Contatore */}
          {images.length > 1 && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">
              {lightbox + 1} / {images.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
