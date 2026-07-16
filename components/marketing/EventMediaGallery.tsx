"use client";

import { useState } from "react";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  gallery: string[];
  videos: string[];
};

function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // /embed/ID o /shorts/ID
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.findIndex((p) => p === "embed" || p === "shorts");
      if (i >= 0 && parts[i + 1]) return parts[i + 1];
    }
  } catch {
    return null;
  }
  return null;
}

function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return id;
    }
  } catch {
    return null;
  }
  return null;
}

function videoThumb(url: string): string | null {
  const yt = youTubeId(url);
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  return null;
}

function videoEmbed(url: string): string {
  const yt = youTubeId(url);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vm = vimeoId(url);
  if (vm) return `https://player.vimeo.com/video/${vm}`;
  return url;
}

export function EventMediaGallery({ gallery, videos }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  function next() {
    if (lightbox == null) return;
    setLightbox((lightbox + 1) % gallery.length);
  }
  function prev() {
    if (lightbox == null) return;
    setLightbox((lightbox - 1 + gallery.length) % gallery.length);
  }

  const isEmpty = gallery.length === 0 && videos.length === 0;

  if (isEmpty) {
    return (
      <div className="border border-dashed border-border bg-muted/40 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nessuna foto o video pubblicata per questo evento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {gallery.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setLightbox(i)}
              className="group relative aspect-square overflow-hidden bg-muted"
              aria-label={`Apri foto ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <h3 className="font-display text-base">Video</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((url) => {
              const thumb = videoThumb(url);
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveVideo(url)}
                  className="group relative aspect-video overflow-hidden bg-muted"
                  aria-label={`Riproduci video`}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      {url}
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/45">
                    <span className="flex size-12 items-center justify-center rounded-full bg-background/95 text-foreground">
                      <Play className="size-5" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {lightbox != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Chiudi"
            onClick={() => setLightbox(null)}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground"
            aria-label="Chiudi"
          >
            <X className="size-5" />
          </button>
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-4 z-10 inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground"
                aria-label="Foto precedente"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-4 z-10 inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground"
                aria-label="Foto successiva"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <div className="relative z-0 max-h-[90vh] max-w-5xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gallery[lightbox]}
              alt=""
              className="max-h-[90vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}

      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Chiudi"
            onClick={() => setActiveVideo(null)}
          />
          <button
            type="button"
            onClick={() => setActiveVideo(null)}
            className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground"
            aria-label="Chiudi"
          >
            <X className="size-5" />
          </button>
          <div className="relative z-0 aspect-video w-full max-w-5xl">
            <iframe
              src={videoEmbed(activeVideo)}
              title="Video evento"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
