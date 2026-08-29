"use client";

import { useRef, useState } from "react";
import { Upload, X, Film } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { uploadViaTus } from "@/lib/upload/tusUpload";
import { isBunnyEmbedUrl } from "@/lib/storage/bunny/urls";
import { guessVideoMime, videoLimitsFor } from "@/lib/upload/video-limits";

/**
 * Ramo Bunny: si accettano anche i container che il browser non sa decodificare
 * (i .mov HEVC dell'iPhone su tutti), perché è Bunny a transcodificarli. Sul
 * ripiego Supabase il server rifiuta comunque ciò che non sa servire.
 */
const ACCEPT = videoLimitsFor("bunny").accept;

/**
 * Tetto lato client. Il limite vero lo applica il server: 200 MB su Bunny —
 * più basso degli altri perché questa è una rotta PUBBLICA — e 50 MB dichiarati
 * (4,5 reali) sul ripiego.
 */
const MAX_BYTES = 200 * 1024 * 1024;

type SignResponse =
  | { uploadKind: "vercel-proxy" }
  | {
      uploadKind: "bunny-tus";
      videoGuid: string;
      libraryId: string;
      signature: string;
      expire: number;
      tusEndpoint: string;
      embedUrl: string;
    };

type UploadResult = {
  url: string;
  path: string;
};

type Props = {
  onUploaded: (result: UploadResult) => void;
  onRemoved: () => void;
  uploadedUrl: string;
};

export function ApplicationVideoUpload({ onUploaded, onRemoved, uploadedUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);

    const mime = guessVideoMime(file) ?? file.type;
    if (!mime.startsWith("video/")) {
      setError("Il file selezionato non sembra un video.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Il video è troppo grande.");
      return;
    }

    setUploading(true);
    setProgress("Preparazione…");

    try {
      const signRes = await fetch("/api/upload/stream/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "application-video",
          fileName: file.name,
          contentType: mime,
          size: file.size,
        }),
      });
      if (!signRes.ok) {
        const j = (await signRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Errore upload (${signRes.status})`);
      }
      const sign = (await signRes.json()) as SignResponse;

      if (sign.uploadKind === "bunny-tus") {
        await uploadViaTus({
          file,
          endpoint: sign.tusEndpoint,
          libraryId: sign.libraryId,
          videoGuid: sign.videoGuid,
          signature: sign.signature,
          expire: sign.expire,
          title: file.name,
          contentType: mime,
          onProgress: (pct) => setProgress(`Caricamento ${pct}%`),
        });
        // `path` porta il guid: è ciò che rende cancellabile il video di
        // candidatura, cosa che oggi non è (video_path è validato ma non viene
        // mai persistito).
        onUploaded({ url: sign.embedUrl, path: sign.videoGuid });
        setProgress(null);
        return;
      }

      setProgress("Caricamento in corso…");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-application-video", { method: "POST", body: fd });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `Errore upload (${res.status})`);
      }
      const json = (await res.json()) as { url: string; path: string };
      onUploaded({ url: json.url, path: json.path });
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il caricamento");
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  function remove() {
    onRemoved();
    setError(null);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFile}
        aria-label="Seleziona video di riferimento"
      />

      {uploadedUrl ? (
        <div className="relative overflow-hidden rounded-md border border-border bg-black">
          {isBunnyEmbedUrl(uploadedUrl) ? (
            <iframe
              src={uploadedUrl}
              title="Anteprima video"
              loading="lazy"
              allow="accelerometer; gyroscope; encrypted-media; picture-in-picture;"
              allowFullScreen
              className="aspect-video w-full border-0 bg-black"
            />
          ) : (
            <video
              src={uploadedUrl}
              className="aspect-video w-full bg-black"
              controls
              preload="metadata"
            />
          )}
          <button
            type="button"
            onClick={remove}
            aria-label="Rimuovi video"
            className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/80 text-white transition-opacity hover:bg-black"
          >
            <X className="size-3.5" />
          </button>
          <p className="border-t border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            Video caricato con successo
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={pick}
            disabled={uploading}
          >
            <Upload className="size-4" />
            {uploading ? "Caricamento…" : "Carica video"}
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Film className="size-3.5 shrink-0" />
            mp4 / webm / mov · max 50MB
          </span>
        </div>
      )}

      {progress && !error && (
        <p className="text-xs text-muted-foreground">{progress}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
