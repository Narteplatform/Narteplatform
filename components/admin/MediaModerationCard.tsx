"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Maximize2, Music4, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { streamOriginalUrl, streamThumbnailUrl } from "@/lib/storage/bunny/urls";
import {
  approveAllForArtist,
  approveArtistVideo,
  approveMediaSubmission,
  rejectArtistVideo,
  rejectMediaSubmission,
} from "@/app/(admin)/admin/moderazione/_actions";
import { MediaModerationViewer } from "@/components/admin/MediaModerationViewer";
import type { ModerationArtistGroup, ModerationItem } from "@/lib/media/moderation-queries";

const TARGET_LABEL: Record<"gallery" | "audio_files" | "cover_image", string> = {
  gallery: "Galleria",
  audio_files: "Audio",
  cover_image: "Foto profilo",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function itemLabel(item: ModerationItem): string {
  return item.kind === "video" ? "Video" : TARGET_LABEL[item.target];
}

/**
 * Una singola tessera nella griglia: anteprima + Approva/Rifiuta.
 *
 * `decided` nasconde la tessera subito dopo l'azione (ottimistico): il
 * `router.refresh()` del genitore riallinea comunque i dati veri poco dopo,
 * ma senza questo l'admin vedrebbe ancora per un istante bottoni disabilitati
 * su un contenuto già evaso.
 */
function MediaItemCard({
  item,
  onDone,
  onOpen,
}: {
  item: ModerationItem;
  onDone: (item: ModerationItem) => void;
  /** Apre il contenuto a schermo intero: nella tessera è ritagliato. */
  onOpen: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  function approve() {
    setError(null);
    startTransition(async () => {
      const res =
        item.kind === "submission"
          ? await approveMediaSubmission(item.id)
          : await approveArtistVideo(item.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone(item);
    });
  }

  function reject() {
    setError(null);
    startTransition(async () => {
      const res =
        item.kind === "submission"
          ? await rejectMediaSubmission(item.id, note)
          : await rejectArtistVideo(item.id, note);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone(item);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline">{itemLabel(item)}</Badge>
        <span className="text-[11px] text-muted-foreground">{formatDate(item.created_at)}</span>
      </div>

      {/* L'anteprima apre il contenuto intero: qui è ritagliata a 16:9 e su una
          foto verticale se ne vede solo la fascia centrale. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Apri ${itemLabel(item).toLowerCase()} a schermo intero`}
        className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azzurro"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-notte">
            <Maximize2 className="size-3.5" /> Apri
          </span>
        </span>
        {item.kind === "submission" && item.media_kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.title ?? "Anteprima immagine"}
            className="h-full w-full object-cover"
          />
        )}
        {item.kind === "submission" && item.media_kind === "audio" && (
          // Niente <audio controls> qui dentro: i suoi comandi non sarebbero
          // raggiungibili dentro un bottone. Si ascolta a schermo intero.
          <span className="flex flex-col items-center gap-1 text-muted-foreground">
            <Music4 className="size-7" aria-hidden />
            <span className="text-xs">Traccia audio</span>
          </span>
        )}
        {item.kind === "video" && item.provider === "supabase" && item.url && (
          // Senza `controls`: si guarda a schermo intero, dove i comandi
          // funzionano. Qui serve solo il primo fotogramma come anteprima.
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={item.url} preload="metadata" className="h-full w-full object-cover" />
        )}
        {item.kind === "video" &&
          item.provider !== "supabase" &&
          item.bunny_guid &&
          (item.playback_state === "processing" ? (
            // Durante la conversione il poster di Bunny risponde 404: il
            // riquadro resterebbe vuoto e il video sembrerebbe non arrivato.
            // Il file originale invece c'è già.
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={streamOriginalUrl(item.bunny_guid)}
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={streamThumbnailUrl(item.bunny_guid)}
              alt={item.title ?? "Anteprima video"}
              className="h-full w-full object-cover"
            />
          ))}
        {item.kind === "video" && item.provider !== "supabase" && !item.bunny_guid && (
          <span className="px-2 text-center text-xs text-muted-foreground">
            Caricamento non ancora completato
          </span>
        )}
      </button>

      {item.title && <p className="truncate text-xs text-muted-foreground">{item.title}</p>}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {rejecting ? (
        <div className="space-y-2">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivazione del rifiuto (facoltativa)"
            disabled={pending}
            className="text-xs"
          />
          {item.kind === "video" && (
            <p className="text-[11px] text-muted-foreground">
              Il file verrà rimosso da bunny.net: l&rsquo;artista dovrà ricaricarlo.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setRejecting(false);
                setNote("");
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={reject}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {pending ? "Invio…" : "Conferma rifiuto"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={approve}>
            <Check className="size-3.5" /> Approva
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setRejecting(true)}
            className="border-red-500/50 text-red-600 hover:bg-red-500 hover:text-white"
          >
            <X className="size-3.5" /> Rifiuta
          </Button>
        </div>
      )}
    </div>
  );
}

export function MediaModerationCard({ group }: { group: ModerationArtistGroup }) {
  const router = useRouter();
  const [pendingAll, startAll] = useTransition();
  const [allError, setAllError] = useState<string | null>(null);

  // Contenuto aperto a schermo intero, per posizione nell'elenco del gruppo.
  const [aperto, setAperto] = useState<number | null>(null);
  const [decisione, startDecisione] = useTransition();

  // Ciò che è già stato approvato o rifiutato in questa schermata.
  //
  // Il router.refresh() che segue ogni decisione impiega qualche centinaio di
  // millisecondi: senza questo elenco, in quel frattempo il contenuto appena
  // evaso resterebbe lì con i pulsanti ancora attivi. Le azioni sono comunque
  // idempotenti — la funzione SQL lavora solo sulle righe ancora "pending" — ma
  // vedere riapparire qualcosa che si è appena approvato fa dubitare di averlo
  // fatto davvero.
  const [decisi, setDecisi] = useState<Set<string>>(new Set());
  const chiave = (i: ModerationItem) => `${i.kind}-${i.id}`;
  const visibili = group.items.filter((i) => !decisi.has(chiave(i)));

  function segnaDeciso(item: ModerationItem) {
    setDecisi((prev) => new Set(prev).add(chiave(item)));
  }

  /**
   * Dopo una decisione presa a schermo intero non si chiude: si passa al
   * contenuto seguente. Chi modera una coda la scorre, e richiudere ogni volta
   * per riaprire la tessera dopo sarebbe un giro inutile a ogni foto.
   * Sull'ultimo si chiude, perché non c'è un seguente.
   */
  function dopoLaDecisione(posizione: number) {
    // Tolto l'elemento corrente, in quella stessa posizione scorre il seguente.
    if (posizione < visibili.length - 1) setAperto(posizione);
    else setAperto(null);
    router.refresh();
  }

  function approvaDalVisualizzatore(item: ModerationItem) {
    const posizione = aperto ?? 0;
    startDecisione(async () => {
      const res =
        item.kind === "submission"
          ? await approveMediaSubmission(item.id)
          : await approveArtistVideo(item.id);
      if (!res.ok) {
        setAllError(res.error);
        setAperto(null);
        return;
      }
      segnaDeciso(item);
      dopoLaDecisione(posizione);
    });
  }

  function rifiutaDalVisualizzatore(item: ModerationItem, note: string) {
    const posizione = aperto ?? 0;
    startDecisione(async () => {
      const res =
        item.kind === "submission"
          ? await rejectMediaSubmission(item.id, note)
          : await rejectArtistVideo(item.id, note);
      if (!res.ok) {
        setAllError(res.error);
        setAperto(null);
        return;
      }
      segnaDeciso(item);
      dopoLaDecisione(posizione);
    });
  }

  function approveAll() {
    setAllError(null);
    startAll(async () => {
      const res = await approveAllForArtist(group.artist.id);
      if (!res.ok) {
        setAllError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onItemDone(item: ModerationItem) {
    segnaDeciso(item);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={group.artist.cover_image} name={group.artist.stage_name} size="md" />
          <div>
            <CardTitle className="text-base">{group.artist.stage_name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {visibili.length === 1
                ? "1 contenuto in attesa"
                : `${visibili.length} contenuti in attesa`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {group.artist.slug && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/artisti/${group.artist.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" /> Profilo pubblico
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/artisti/${group.artist.id}`}>Scheda admin</Link>
          </Button>
          <Button type="button" size="sm" disabled={pendingAll} onClick={approveAll}>
            {pendingAll ? "Approvazione…" : "Approva tutto"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {allError && (
          <p role="alert" className="mb-3 text-xs text-destructive">
            {allError}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibili.map((item, i) => (
            <MediaItemCard
              key={`${item.kind}-${item.id}`}
              item={item}
              onDone={onItemDone}
              onOpen={() => setAperto(i)}
            />
          ))}
        </div>
      </CardContent>

      <MediaModerationViewer
        items={visibili}
        index={aperto}
        artistName={group.artist.stage_name}
        onClose={() => setAperto(null)}
        onNavigate={setAperto}
        onApprove={approvaDalVisualizzatore}
        onReject={rifiutaDalVisualizzatore}
        busy={decisione}
      />
    </Card>
  );
}
