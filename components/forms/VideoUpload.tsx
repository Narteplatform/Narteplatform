"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, X, Film } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { addArtistVideo, deleteArtistVideo } from "@/app/(artist)/dashboard/_actions";
import { probeVideo } from "@/lib/upload/probeVideo";
import { putWithProgress, UploadAbortedError } from "@/lib/upload/putWithProgress";
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_PER_ARTIST,
  VIDEO_ACCEPT_ATTR,
  formatMb,
  guessVideoMime,
  isAllowedVideoMime,
} from "@/lib/upload/video-limits";

export type ArtistVideoItem = {
  id: string;
  url: string;
  storage_path: string;
  title: string | null;
  duration_ms: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

type SignResponse = {
  signedUrl: string;
  path: string;
  publicUrl: string;
};

type Props = {
  artistId: string;
  initialVideos: ArtistVideoItem[];
};

const MOV_HELP =
  "I file .mov non sono supportati: usano quasi sempre il codec HEVC, che non si riproduce su Chrome, Firefox e Android. Esporta il video in MP4. Su iPhone: Impostazioni → Fotocamera → Formati → «Massima compatibilità».";

export function VideoUpload({ artistId, initialVideos }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [videos, setVideos] = useState<ArtistVideoItem[]>(initialVideos);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const uploading = progress !== null;
  const slotsLeft = MAX_VIDEO_PER_ARTIST - videos.length;

  function pick() {
    inputRef.current?.click();
  }

  async function uploadOne(file: File, currentCount: number) {
    if (currentCount >= MAX_VIDEO_PER_ARTIST) {
      throw new Error(
        `Puoi caricare al massimo ${MAX_VIDEO_PER_ARTIST} video. Eliminane uno per caricarne un altro.`
      );
    }

    const mime = guessVideoMime(file);
    if (mime === "video/quicktime") throw new Error(MOV_HELP);
    if (!mime || !isAllowedVideoMime(mime)) {
      throw new Error(`"${file.name}": formato non supportato. Carica un MP4 o un WebM.`);
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(
        `"${file.name}" pesa ${formatMb(file.size)} e supera il limite di ${formatMb(
          MAX_VIDEO_BYTES
        )}.`
      );
    }

    // Meglio scoprire ora che il browser non decodifica il file, non dopo
    // averne trasferiti decine di MB.
    const { durationMs, playable } = await probeVideo(file);
    if (!playable) {
      const proceed = window.confirm(
        `"${file.name}" non sembra riproducibile in questo browser: probabilmente usa un codec non supportato (es. HEVC).\n\nSe lo carichi, molti visitatori non riusciranno a vederlo. Consigliamo di riesportarlo in MP4 (H.264).\n\nCaricarlo lo stesso?`
      );
      if (!proceed) return null;
    }

    const signRes = await fetch("/api/upload/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId,
        fileName: file.name,
        contentType: mime,
        size: file.size,
      }),
    });
    if (!signRes.ok) {
      const j = (await signRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `Impossibile avviare il caricamento (${signRes.status})`);
    }
    const { signedUrl, path, publicUrl } = (await signRes.json()) as SignResponse;

    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ name: file.name, pct: 0 });

    await putWithProgress({
      signedUrl,
      file,
      signal: controller.signal,
      onProgress: ({ pct }) => setProgress({ name: file.name, pct }),
    });

    const ack = await addArtistVideo({
      artist_id: artistId,
      url: publicUrl,
      storage_path: path,
      size_bytes: file.size,
      mime_type: mime,
      duration_ms: durationMs,
      title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
    });
    if (!ack.ok) throw new Error(ack.error);
    return (ack.video ?? null) as ArtistVideoItem | null;
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    try {
      // Sequenziale: upload paralleli si contendono l'uplink e rischiano di
      // fallire tutti insieme.
      let count = videos.length;
      for (const file of files) {
        const video = await uploadOne(file, count);
        if (video) {
          count += 1;
          setVideos((prev) => [video, ...prev]);
        }
      }
    } catch (err) {
      if (err instanceof UploadAbortedError) {
        setError("Caricamento annullato.");
      } else {
        setError(err instanceof Error ? err.message : "Errore durante il caricamento");
      }
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function remove(videoId: string) {
    if (!confirm("Rimuovere il video?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteArtistVideo(videoId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    });
  }

  return (
    <div className="space-y-3">
      <Label>
        I tuoi video (max {MAX_VIDEO_PER_ARTIST}, fino a {formatMb(MAX_VIDEO_BYTES)} ciascuno,
        MP4 o WebM)
      </Label>

      {videos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <div
              key={v.id}
              className="group relative overflow-hidden rounded-md border border-border bg-black"
            >
              <video
                src={v.url}
                className="aspect-video w-full bg-black"
                controls
                preload="metadata"
                playsInline
              />
              <button
                type="button"
                onClick={() => remove(v.id)}
                disabled={pending}
                aria-label="Rimuovi video"
                className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/80 text-white opacity-90 transition-opacity hover:bg-black"
              >
                <X className="size-3.5" />
              </button>
              {v.title && (
                <p className="truncate border-t border-border bg-background px-3 py-2 text-xs">
                  {v.title}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {progress && (
        <div className="space-y-2 rounded-xl border border-border bg-muted p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm">{progress.name}</p>
            <Button type="button" variant="ghost" size="sm" onClick={cancel}>
              Annulla
            </Button>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Caricamento di ${progress.name}`}
            className="h-2 w-full overflow-hidden rounded-full bg-background"
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.pct}% — non chiudere questa pagina finché il caricamento non è completo.
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={onFiles}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pick}
          disabled={uploading || slotsLeft <= 0}
        >
          <Upload className="size-4" /> {uploading ? "Caricamento…" : "Carica video"}
        </Button>
        {slotsLeft <= 0 ? (
          <span className="text-xs text-muted-foreground">
            Hai raggiunto il massimo di {MAX_VIDEO_PER_ARTIST} video. Eliminane uno per
            caricarne un altro.
          </span>
        ) : (
          videos.length === 0 && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Film className="size-3.5" /> Mostra al meglio le tue performance.
            </span>
          )
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
