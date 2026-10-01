"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock3, Images, Maximize2, Music4, Trash2, Video, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import { rimuoviMediaPubblicato } from "@/app/(admin)/admin/artisti/_actions";
import { VideoPoster } from "@/components/media/VideoPoster";
import { streamOriginalUrl } from "@/lib/storage/bunny/urls";
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
  /**
   * Presente solo per i contenuti già pubblicati sul profilo: abilita
   * «Rimuovi dal profilo». `ref` è l'indirizzo del file (foto, copertina,
   * audio) oppure l'id del video.
   */
  removable?: { tipo: "gallery" | "cover" | "audio" | "video"; ref: string };
};

export function ArtistMediaPanel({
  artistId,
  artistName,
  items,
}: {
  artistId: string;
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
        footer={(viewerItem) => {
          const originale = items.find((i) => i.id === viewerItem.id && i.kind === viewerItem.kind);
          if (!originale?.removable) return null;
          return (
            <RimuoviDalProfilo
              key={originale.id}
              artistId={artistId}
              removable={originale.removable}
              onDone={() => setAperto(null)}
            />
          );
        }}
      />
    </div>
  );
}

/**
 * Rimozione di un singolo contenuto già pubblicato. Motivazione obbligatoria:
 * viene inviata all'artista con il modo per contestare.
 */
function RimuoviDalProfilo({
  artistId,
  removable,
  onDone,
}: {
  artistId: string;
  removable: NonNullable<ArtistMediaItem["removable"]>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [aperto, setAperto] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function conferma() {
    setError(null);
    start(async () => {
      const res = await rimuoviMediaPubblicato({ artistId, tipo: removable.tipo, ref: removable.ref }, motivo);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  if (!aperto) {
    return (
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => setAperto(true)}
          className="border-white/40 bg-transparent text-white hover:bg-white hover:text-notte"
        >
          <Trash2 className="size-4" /> Rimuovi dal profilo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl bg-white/10 p-3">
      <MotivazioneField
        onDark
        compact
        rows={2}
        label="Motivazione della rimozione"
        disabled={pending}
        onChange={setMotivo}
        hint={
          removable.tipo === "video"
            ? "Viene inviata all'artista per email. Il video sarà rimosso anche dallo storage."
            : "Viene inviata all'artista per email."
        }
      />
      {error && (
        <p role="alert" className="text-xs text-red-200">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setAperto(false)}
          className="text-white hover:bg-white/20"
        >
          Annulla
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || !motivo}
          onClick={conferma}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          {pending ? "Rimozione…" : "Conferma rimozione"}
        </Button>
      </div>
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
      // In conversione il poster non esiste ancora (404): si usa l'originale,
      // che Bunny serve da subito.
      if (item.playbackState === "processing") {
        // eslint-disable-next-line jsx-a11y/media-has-caption
        return (
          <video
            src={streamOriginalUrl(item.bunnyGuid)}
            preload="metadata"
            className="h-full w-full object-cover"
          />
        );
      }
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
