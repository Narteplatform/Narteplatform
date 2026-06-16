"use client";

import { useRef, useState } from "react";
import { Upload, X, Film } from "lucide-react";
import { Button } from "@/components/ui/Button";

const ACCEPT = "video/mp4,video/webm,video/quicktime";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const VALID_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

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

    if (!VALID_TYPES.includes(file.type)) {
      setError("Formato non supportato. Usa mp4, webm o mov.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Il video supera il limite di 50MB.");
      return;
    }

    setUploading(true);
    setProgress("Caricamento in corso…");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload-application-video", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `Errore upload (${res.status})`);
      }

      const json = await res.json() as { url: string; path: string };
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
          <video
            src={uploadedUrl}
            className="aspect-video w-full bg-black"
            controls
            preload="metadata"
          />
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
