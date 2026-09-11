"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { MediaViewer, type MediaViewerItem } from "@/components/media/MediaViewer";
import type { ModerationItem } from "@/lib/media/moderation-queries";

/**
 * La coda di moderazione a schermo intero.
 *
 * La parte visuale è MediaViewer, condivisa con la scheda artista: qui si
 * aggiunge soltanto la barra della decisione. Tenere i pulsanti dentro il
 * riquadro non è un vezzo — chi modera guarda, decide e passa al seguente, e
 * costringerlo a chiudere per cercare la tessera giusta rallenta ogni singolo
 * contenuto.
 */

const TARGET_LABEL: Record<"gallery" | "audio_files" | "cover_image", string> = {
  gallery: "Galleria",
  audio_files: "Audio",
  cover_image: "Foto profilo",
};

function toViewerItem(item: ModerationItem): MediaViewerItem {
  if (item.kind === "video") {
    return {
      id: item.id,
      kind: "video",
      url: item.url,
      bunnyGuid: item.bunny_guid,
      provider: item.provider,
      playbackState: item.playback_state,
      title: item.title,
      label: "Video",
    };
  }
  return {
    id: item.id,
    kind: item.media_kind === "audio" ? "audio" : "image",
    url: item.url,
    title: item.title,
    label: TARGET_LABEL[item.target],
  };
}

export function MediaModerationViewer({
  items,
  index,
  artistName,
  onClose,
  onNavigate,
  onApprove,
  onReject,
  busy = false,
}: {
  items: ModerationItem[];
  index: number | null;
  artistName: string;
  onClose: () => void;
  onNavigate: (next: number) => void;
  onApprove: (item: ModerationItem) => void;
  onReject: (item: ModerationItem, note: string) => void;
  busy?: boolean;
}) {
  const [rejecting, setRejecting] = React.useState(false);
  const [note, setNote] = React.useState("");

  // Cambiando contenuto si riparte da capo: la motivazione scritta per una foto
  // non deve restare nel campo quando si passa alla successiva.
  React.useEffect(() => {
    setRejecting(false);
    setNote("");
  }, [index]);

  const viewerItems = React.useMemo(() => items.map(toViewerItem), [items]);

  return (
    <MediaViewer
      items={viewerItems}
      index={index}
      heading={artistName}
      onClose={onClose}
      onNavigate={onNavigate}
      footer={(viewerItem) => {
        const originale = items.find((i) => i.id === viewerItem.id);
        if (!originale) return null;

        if (rejecting) {
          return (
            <div className="space-y-2 rounded-2xl bg-white/10 p-3">
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Motivazione del rifiuto (facoltativa, la vede l'artista)"
                disabled={busy}
                className="bg-white/90 text-sm"
              />
              {viewerItem.kind === "video" && (
                <p className="text-[11px] text-white/70">
                  Rifiutando, il file viene rimosso da bunny.net per non
                  occupare spazio a pagamento. L&rsquo;artista dovrà ricaricarlo.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setRejecting(false);
                    setNote("");
                  }}
                  className="text-white hover:bg-white/20"
                >
                  Annulla
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => onReject(originale, note)}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {busy ? "Invio…" : "Conferma rifiuto"}
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="flex justify-center gap-3">
            <Button type="button" disabled={busy} onClick={() => onApprove(originale)}>
              <Check className="size-4" /> Approva
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setRejecting(true)}
              className="border-white/40 bg-transparent text-white hover:bg-white hover:text-notte"
            >
              <X className="size-4" /> Rifiuta
            </Button>
          </div>
        );
      }}
    />
  );
}
