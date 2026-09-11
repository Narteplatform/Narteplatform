"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { streamEmbedUrl } from "@/lib/storage/bunny/urls";

/**
 * Il contenuto a schermo intero, senza ritagli.
 *
 * Ovunque nel backend i media si vedono in riquadri 16:9 con `object-cover`:
 * di una foto verticale si vede la fascia centrale, di un video il solo poster.
 * Va bene per riconoscere un contenuto, non per giudicarlo — e il superadmin
 * deve fare la seconda cosa.
 *
 * È generico di proposito: lo usano sia la coda di moderazione, che ci attacca
 * sotto i pulsanti Approva e Rifiuta, sia la scheda artista, che si limita a
 * guardare. La differenza sta tutta in `footer`.
 */

export type MediaViewerItem = {
  id: string;
  kind: "image" | "audio" | "video";
  /** Indirizzo del file. Per i video Bunny può mancare: c'è il guid. */
  url?: string | null;
  bunnyGuid?: string | null;
  /** 'bunny' | 'supabase'. Decide se serve il player incorporato. */
  provider?: string | null;
  title?: string | null;
  /** Etichetta mostrata in alto, es. "Galleria" o "Video". */
  label?: string;
  width?: number | null;
  height?: number | null;
};

export function MediaViewer({
  items,
  index,
  heading,
  onClose,
  onNavigate,
  footer,
}: {
  items: MediaViewerItem[];
  /** Posizione aperta, `null` a visualizzatore chiuso. */
  index: number | null;
  /** Riga in alto: di solito il nome dell'artista. */
  heading: string;
  onClose: () => void;
  onNavigate: (next: number) => void;
  /** Barra in basso. Chi guarda e basta non la passa. */
  footer?: (item: MediaViewerItem) => React.ReactNode;
}) {
  const chiudiRef = React.useRef<HTMLButtonElement>(null);
  const aperto = index !== null && index >= 0 && index < items.length;
  const item = aperto ? items[index] : null;

  React.useEffect(() => {
    if (!aperto) return;

    // Il focus entra nel riquadro: senza, la tastiera continuerebbe a comandare
    // la pagina che sta dietro.
    chiudiRef.current?.focus();
    const precedente = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      // Dentro un campo di testo le frecce servono a muovere il cursore.
      const dentroUnCampo =
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (dentroUnCampo) return;
      if (e.key === "ArrowLeft" && index! > 0) onNavigate(index! - 1);
      if (e.key === "ArrowRight" && index! < items.length - 1) onNavigate(index! + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = precedente;
    };
  }, [aperto, index, items.length, onClose, onNavigate]);

  if (!aperto || !item) return null;

  const primo = index === 0;
  const ultimo = index === items.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.label ?? "Contenuto"} di ${heading}`}
    >
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate font-display text-base">{heading}</p>
          <p className="truncate text-xs text-white/70">
            {item.label ? `${item.label} · ` : ""}
            {index + 1} di {items.length}
            {item.title ? ` · ${item.title}` : ""}
          </p>
        </div>
        <button
          ref={chiudiRef}
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4">
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => !primo && onNavigate(index - 1)}
            disabled={primo}
            aria-label="Contenuto precedente"
            className="absolute left-2 z-10 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30 md:left-6"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        <div className="flex max-h-full w-full max-w-5xl items-center justify-center">
          <Contenuto item={item} />
        </div>

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => !ultimo && onNavigate(index + 1)}
            disabled={ultimo}
            aria-label="Contenuto successivo"
            className="absolute right-2 z-10 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30 md:right-6"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      {footer && (
        <footer className="relative z-10 px-4 py-4">
          <div className="mx-auto max-w-xl">{footer(item)}</div>
        </footer>
      )}
    </div>
  );
}

function Contenuto({ item }: { item: MediaViewerItem }) {
  if (item.kind === "image") {
    return (
      // object-contain e non cover: qui l'immagine si deve vedere intera, che è
      // tutto il motivo per cui questo riquadro esiste.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.url ?? ""}
        alt={item.title ?? "Contenuto"}
        className="max-h-[70vh] max-w-full object-contain"
      />
    );
  }

  if (item.kind === "audio") {
    return (
      <div className="w-full max-w-xl rounded-2xl bg-white/10 p-6">
        <p className="mb-3 truncate text-sm text-white/80">{item.title ?? "Traccia audio"}</p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={item.url ?? undefined} className="w-full" />
      </div>
    );
  }

  if (item.provider !== "supabase" && item.bunnyGuid) {
    return (
      <div className="aspect-video w-full max-w-4xl bg-black">
        <iframe
          src={streamEmbedUrl(item.bunnyGuid, { muted: true, playsinline: true })}
          title={item.title ?? "Video"}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  if (item.url) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video controls src={item.url} preload="metadata" className="max-h-[70vh] max-w-full" />
    );
  }

  return (
    <p className="max-w-sm text-center text-sm text-white/80">
      Il video è ancora in lavorazione: l&rsquo;anteprima comparirà a conversione
      finita.
    </p>
  );
}
