"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { streamThumbnailUrl } from "@/lib/storage/bunny/urls";
import {
  approveAllForArtist,
  approveArtistVideo,
  approveMediaSubmission,
  rejectArtistVideo,
  rejectMediaSubmission,
} from "@/app/(admin)/admin/moderazione/_actions";
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
function MediaItemCard({ item, onDone }: { item: ModerationItem; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [decided, setDecided] = useState(false);

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
      setDecided(true);
      onDone();
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
      setDecided(true);
      onDone();
    });
  }

  if (decided) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline">{itemLabel(item)}</Badge>
        <span className="text-[11px] text-muted-foreground">{formatDate(item.created_at)}</span>
      </div>

      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted">
        {item.kind === "submission" && item.media_kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.title ?? "Anteprima immagine"}
            className="h-full w-full object-cover"
          />
        )}
        {item.kind === "submission" && item.media_kind === "audio" && (
          <audio controls src={item.url} className="w-full px-2" />
        )}
        {item.kind === "video" && item.provider === "supabase" && item.url && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video controls src={item.url} className="h-full w-full object-cover" />
        )}
        {item.kind === "video" && item.provider !== "supabase" && item.bunny_guid && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={streamThumbnailUrl(item.bunny_guid)}
            alt={item.title ?? "Anteprima video"}
            className="h-full w-full object-cover"
          />
        )}
        {item.kind === "video" && item.provider !== "supabase" && !item.bunny_guid && (
          <span className="px-2 text-center text-xs text-muted-foreground">
            Anteprima non ancora disponibile (transcodifica in corso)
          </span>
        )}
      </div>

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

  function onItemDone() {
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
              {group.items.length === 1
                ? "1 contenuto in attesa"
                : `${group.items.length} contenuti in attesa`}
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
          {group.items.map((item) => (
            <MediaItemCard key={`${item.kind}-${item.id}`} item={item} onDone={onItemDone} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
