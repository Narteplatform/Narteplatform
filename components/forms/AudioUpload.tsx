"use client";

import { useRef, useState } from "react";
import { Upload, X, Music2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import {
  UploadAbortedError,
  putPresignedWithProgress,
} from "@/lib/upload/putWithProgress";

export type AudioTrack = {
  url: string;
  title: string;
};

type Props = {
  label: string;
  value: AudioTrack[];
  onChange: (tracks: AudioTrack[]) => void;
  artistId: string;
};

type SignResponse =
  | { uploadKind: "vercel-proxy" }
  | {
      uploadKind: "bunny-presigned";
      uploadUrl: string;
      headers: Record<string, string>;
      publicUrl: string;
    };

/**
 * Tetto dichiarato. ⚠️ Fino all'attivazione di Bunny è un tetto che MENTE: il
 * body di una funzione Vercel si ferma a 4,5 MB, quindi sul percorso
 * /api/upload qualunque traccia più pesante riceve un 413 dalla piattaforma
 * prima di raggiungere il nostro codice. Con la PUT presigned il limite diventa
 * vero.
 */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export function AudioUpload({ label, value, onChange, artistId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  async function uploadOne(file: File): Promise<string> {
    // Si chiede al server DOVE scrivere. È il server a decidere, non il client:
    // così l'interruttore di cutover resta una scelta di configurazione e non
    // un ramo che il browser può forzare.
    const signRes = await fetch("/api/upload/audio/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId, contentType: file.type, size: file.size }),
    });
    if (!signRes.ok) {
      const j = (await signRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `Impossibile avviare il caricamento (${signRes.status})`);
    }
    const sign = (await signRes.json()) as SignResponse;

    // Bunny: il file va direttamente sul CDN, senza passare da Vercel. È
    // l'unico modo per superare i 4,5 MB, e si guadagna anche l'avanzamento.
    if (sign.uploadKind === "bunny-presigned") {
      setProgress({ name: file.name, pct: 0 });
      await putPresignedWithProgress({
        uploadUrl: sign.uploadUrl,
        file,
        headers: sign.headers,
        onProgress: ({ pct }) => setProgress({ name: file.name, pct }),
      });
      return sign.publicUrl;
    }

    // Percorso di sempre: multipart attraverso la funzione Vercel.
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "audio");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `Upload fallito (${res.status})`);
    }
    const { url } = (await res.json()) as { url: string };
    return url;
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    const next: AudioTrack[] = [...value];
    try {
      for (const file of files) {
        if (!file.type.startsWith("audio/")) {
          setError(`"${file.name}" non è un file audio. Saltato.`);
          continue;
        }
        if (file.size > MAX_AUDIO_BYTES) {
          setError(`"${file.name}" supera 25MB. Saltato.`);
          continue;
        }
        const url = await uploadOne(file);
        next.push({ url, title: file.name.replace(/\.[^.]+$/, "") });
      }
      onChange(next);
    } catch (err) {
      if (err instanceof UploadAbortedError) {
        setError("Caricamento annullato.");
      } else {
        setError(err instanceof Error ? err.message : "Errore upload");
      }
    } finally {
      setProgress(null);
      setUploading(false);
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function rename(idx: number, title: string) {
    onChange(value.map((t, i) => (i === idx ? { ...t, title } : t)));
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((t, i) => (
            <li
              key={`${t.url}-${i}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-3 sm:flex-row sm:items-center"
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Music2 className="size-4" />
              </span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={t.title}
                  onChange={(e) => rename(i, e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
                  placeholder="Titolo brano"
                />
                <audio
                  controls
                  preload="none"
                  src={t.url}
                  className="h-9 w-full"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Rimuovi audio"
                className="inline-flex size-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={onFiles}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={pick} disabled={uploading}>
          <Upload className="size-4" /> {uploading ? "Caricamento…" : "Carica audio"}
        </Button>
        <span className="text-xs text-muted-foreground">
          MP3, WAV, M4A (max 25MB ognuno).
        </span>
      </div>
      {progress && (
        <div className="space-y-1.5 rounded-lg border border-border bg-muted p-3">
          <p className="min-w-0 truncate text-xs">{progress.name}</p>
          <div
            role="progressbar"
            aria-valuenow={progress.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Caricamento di ${progress.name}`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-background"
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
