"use client";

import { useRef, useState } from "react";
import { Upload, X, Film } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";

type UploadResult = {
  url: string;
};

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  kind?: "event-video" | "format-video";
  label?: string;
};

const ACCEPT = "video/mp4,video/webm,video/quicktime";
const MAX = 50 * 1024 * 1024;

export function EventVideoUpload({
  value,
  onChange,
  kind = "event-video",
  label = "Video da dispositivo (max 50MB, mp4/webm/mov)",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    const next = [...value];
    try {
      for (const file of files) {
        if (file.size > MAX) {
          setError(`"${file.name}" supera 50MB.`);
          continue;
        }
        const acceptedTypes = ACCEPT.split(",");
        if (!acceptedTypes.includes(file.type)) {
          setError(`"${file.name}" formato non supportato (mp4/webm/mov).`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", kind);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(j.error ?? `Upload fallito (${res.status})`);
        }
        const { url } = (await res.json()) as UploadResult;
        next.push(url);
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setUploading(false);
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {value.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative overflow-hidden rounded-md border border-border bg-black"
            >
              <video
                src={url}
                className="aspect-video w-full bg-black"
                controls
                preload="metadata"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Rimuovi video"
                className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/80 text-white opacity-90 transition-opacity hover:bg-black"
              >
                <X className="size-3.5" />
              </button>
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
        {value.length === 0 && (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Film className="size-3.5" /> Carica video dall&apos;evento direttamente dal dispositivo.
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
