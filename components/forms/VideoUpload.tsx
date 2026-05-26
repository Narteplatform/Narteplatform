"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, X, Film } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { addArtistVideo, deleteArtistVideo } from "@/app/(artist)/dashboard/_actions";

export type ArtistVideoItem = {
  id: string;
  url: string;
  storage_path: string;
  title: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

type UploadResult = {
  url: string;
  path: string;
  contentType: string;
  size: number;
};

type Props = {
  artistId: string;
  initialVideos: ArtistVideoItem[];
};

const ACCEPT = "video/mp4,video/webm,video/quicktime";
const MAX = 50 * 1024 * 1024;

export function VideoUpload({ artistId, initialVideos }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [videos, setVideos] = useState<ArtistVideoItem[]>(initialVideos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick() {
    inputRef.current?.click();
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > MAX) {
          setError(`"${file.name}" supera 50MB.`);
          continue;
        }
        if (!ACCEPT.split(",").includes(file.type)) {
          setError(`"${file.name}" formato non supportato (mp4/webm/mov).`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "artist-video");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `Upload fallito (${res.status})`);
        }
        const { url, path, contentType, size } = (await res.json()) as UploadResult;
        const ack = await addArtistVideo({
          artist_id: artistId,
          url,
          storage_path: path,
          size_bytes: size,
          mime_type: contentType,
          title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
        });
        if (!ack.ok) {
          throw new Error(ack.error);
        }
        if (ack.video) {
          setVideos((prev) => [ack.video!, ...prev]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setUploading(false);
    }
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
      <Label>I tuoi video (max 50MB ciascuno, mp4/webm/mov)</Label>

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

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={onFiles}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={pick} disabled={uploading}>
          <Upload className="size-4" /> {uploading ? "Caricamento…" : "Carica video"}
        </Button>
        {videos.length === 0 && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Film className="size-3.5" /> Mostra al meglio le tue performance.
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
