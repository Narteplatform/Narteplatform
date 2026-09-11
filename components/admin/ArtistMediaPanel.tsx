"use client";

import * as React from "react";
import { Clock3, Images, Maximize2, Music4, Video, XCircle } from "lucide-react";
import { VideoPoster } from "@/components/media/VideoPoster";
import { MediaViewer, type MediaViewerItem } from "@/components/media/MediaViewer";

/**
 * Tutti i contenuti caricati da un artista, in un posto solo.
 *
 * La scheda admin mostrava anagrafica, piano e date, ma non una sola foto: per
 * vedere che cosa un artista avesse davvero caricato bisognava aprire il suo
 * profilo pubblico — dove però compare solo ciò che è già approvato, quindi
 * proprio i contenuti su cui c'è da decidere erano gli unici invisibili.
 *
 * Qui si vede tutto, con lo stato di ciascuno, e al clic si apre intero.
 */

export type ArtistMediaItem = MediaViewerItem & {
  /** Stato editoriale, quando esiste. Le foto approvate non ne hanno bisogno. */
  moderation?: "pending" | "rejected" | null;
  moderationNote?: string | null;
};

export function ArtistMediaPanel({
  artistName,
  items,
}: {
  artistName: string;
  items: ArtistMediaItem[];
}) {
  const [aperto, setAperto] = React.useState<number | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Questo artista non ha ancora caricato foto, video o tracce audio.
      </p>
    );
  }

  const inAttesa = items.filter((i) => i.moderation === "pending").length;

  return (
    <div className="space-y-3">
      {inAttesa > 0 && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
          <Clock3 className="size-3.5" aria-hidden />
          {inAttesa === 1
            ? "1 contenuto è in attesa di approvazione"
            : `${inAttesa} contenuti sono in attesa di approvazione`}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <button
            key={`${item.kind}-${item.id}`}
            type="button"
            onClick={() => setAperto(i)}
            aria-label={`Apri ${item.label ?? item.kind}${item.title ? `: ${item.title}` : ""}`}
            className={`group relative flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azzurro ${
              item.moderation === "rejected"
                ? "border-red-300"
                : item.moderation === "pending"
                  ? "border-amber-300"
                  : "border-border"
            }`}
          >
            <Anteprima item={item} />

            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-notte">
                <Maximize2 className="size-3" /> Apri
              </span>
            </span>

            {item.moderation && (
              <span
                className={`absolute inset-x-0 bottom-0 z-20 flex items-center gap-1 px-1.5 py-1 text-[10px] font-semibold text-white ${
                  item.moderation === "rejected" ? "bg-red-600/90" : "bg-amber-600/90"
                }`}
              >
                {item.moderation === "rejected" ? (
                  <>
                    <XCircle className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">Non approvato</span>
                  </>
                ) : (
                  <>
                    <Clock3 className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">In attesa</span>
                  </>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      <MediaViewer
        items={items}
        index={aperto}
        heading={artistName}
        onClose={() => setAperto(null)}
        onNavigate={setAperto}
      />
    </div>
  );
}

function Anteprima({ item }: { item: ArtistMediaItem }) {
  if (item.kind === "image" && item.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" />;
  }

  if (item.kind === "video") {
    if (item.provider !== "supabase" && item.bunnyGuid) {
      return <VideoPoster guid={item.bunnyGuid} className="h-full w-full object-cover" />;
    }
    if (item.url) {
      // Senza `controls`: qui serve il primo fotogramma, si guarda a schermo intero.
      // eslint-disable-next-line jsx-a11y/media-has-caption
      return <video src={item.url} preload="metadata" className="h-full w-full object-cover" />;
    }
    return <Segnaposto icona="video" testo="In lavorazione" />;
  }

  if (item.kind === "audio") return <Segnaposto icona="audio" testo={item.title ?? "Audio"} />;

  return <Segnaposto icona="image" testo="Anteprima assente" />;
}

function Segnaposto({ icona, testo }: { icona: "image" | "audio" | "video"; testo: string }) {
  const Icona = icona === "audio" ? Music4 : icona === "video" ? Video : Images;
  return (
    <span className="flex flex-col items-center gap-1 px-2 text-center text-muted-foreground">
      <Icona className="size-6" aria-hidden />
      <span className="line-clamp-2 text-[11px]">{testo}</span>
    </span>
  );
}
