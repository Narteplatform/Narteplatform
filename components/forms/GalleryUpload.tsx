"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { compressToFit } from "@/lib/upload/compressImage";

type Props = {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
};

/**
 * Tetto sul file IN INGRESSO, prima della compressione.
 *
 * Era 5 MB, ed era un tetto che mentiva: il body di una funzione Vercel si
 * ferma a 4,5 MB, quindi una foto fra 4,5 e 5 MB — un normale scatto da
 * smartphone — falliva con un 413 opaco. Ora l'immagine viene ridotta a ~250 KB
 * nel browser prima di partire, quindi qui può entrare molto di più: il limite
 * serve solo a fermare un file assurdo, non più a proteggere la funzione.
 */
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export function GalleryUpload({ label, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
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
    const next: string[] = [...value];
    try {
      let index = 0;
      for (const file of files) {
        index += 1;
        if (!file.type.startsWith("image/")) continue;
        if (file.size > MAX_INPUT_BYTES) {
          setError(`"${file.name}" supera 20MB e non è stata caricata.`);
          continue;
        }

        // Comprimere dieci foto richiede qualche secondo: senza un segnale
        // l'interfaccia sembra bloccata e l'artista ricarica la pagina.
        setPhase(`Ottimizzazione ${index}/${files.length}…`);
        let optimized: File;
        try {
          optimized = await compressToFit(file);
        } catch {
          // Un formato che il browser non sa decodificare non deve far perdere
          // le foto valide selezionate insieme a lui.
          setError(`"${file.name}" non è leggibile e non è stata caricata.`);
          continue;
        }

        setPhase(`Caricamento ${index}/${files.length}…`);
        const fd = new FormData();
        fd.append("file", optimized);
        fd.append("kind", "artist");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `Upload fallito (${res.status})`);
        }
        const { url } = (await res.json()) as { url: string };
        next.push(url);
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setPhase(null);
      setUploading(false);
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {value.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Rimuovi"
                className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
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
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFiles}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={pick} disabled={uploading}>
          <Upload className="size-4" /> {phase ?? "Carica foto"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Puoi selezionare più immagini. Vengono ottimizzate automaticamente prima
          dell&apos;invio, quindi anche le foto grandi del telefono vanno bene.
        </span>
      </div>
      {uploading && (
        <p className="sr-only" role="status" aria-live="polite">
          {phase ?? "Caricamento in corso"}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
