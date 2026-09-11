"use client";

import { useRef, useState } from "react";
import { Upload, X, Film } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { uploadViaTus } from "@/lib/upload/tusUpload";
import { UploadAbortedError } from "@/lib/upload/putWithProgress";
import { guessVideoMime, videoLimitsFor } from "@/lib/upload/video-limits";
import { isBunnyEmbedUrl } from "@/lib/storage/bunny/urls";

type UploadResult = {
  url: string;
};

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  kind?: "event-video" | "format-video";
  label?: string;
  /**
   * Salva il video appena caricato, senza aspettare il Salva del modulo.
   *
   * Presente solo quando la cosa a cui il video appartiene esiste già: su un
   * evento nuovo non c'è ancora un id a cui collegarlo, e lì il salvataggio
   * resta quello del modulo.
   */
  onPersist?: (url: string) => Promise<{ ok: boolean; error?: string }>;
};

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

/** Ramo Bunny: accetta anche i container che il browser non decodifica. */
const ACCEPT = videoLimitsFor("bunny").accept;

/**
 * Un URL che punta a una piattaforma esterna, non a un file caricato da noi.
 * Serve solo a distinguere i residui YouTube/Vimeo dai video su Supabase
 * Storage, che sono file veri e continuano a suonare dentro un <video>.
 */
function isExternalVideo(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("vimeo.com")
    );
  } catch {
    return false;
  }
}

/**
 * Tetto lato client. Il limite vero lo applica il server, che sa dove sta
 * scrivendo: 500 MB su Bunny, 50 MB (in pratica 4,5) sul ripiego Supabase.
 */
const MAX = 500 * 1024 * 1024;

export function EventVideoUpload({
  value,
  onChange,
  kind = "event-video",
  label = "Video da dispositivo",
  onPersist,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  async function uploadOne(file: File): Promise<string> {
    const mime = guessVideoMime(file) ?? file.type;

    // È il server a decidere la destinazione e a rispondere con l'errore già
    // scritto in italiano: qui si scarta solo ciò che è palesemente fuori scala.
    const signRes = await fetch("/api/upload/stream/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, fileName: file.name, contentType: mime, size: file.size }),
    });
    if (!signRes.ok) {
      const j = (await signRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `Impossibile avviare il caricamento (${signRes.status})`);
    }
    const sign = (await signRes.json()) as SignResponse;

    if (sign.uploadKind === "bunny-tus") {
      setProgress({ name: file.name, pct: 0 });
      await uploadViaTus({
        file,
        endpoint: sign.tusEndpoint,
        libraryId: sign.libraryId,
        videoGuid: sign.videoGuid,
        signature: sign.signature,
        expire: sign.expire,
        title: file.name,
        contentType: mime,
        onProgress: (pct) => setProgress({ name: file.name, pct }),
      });
      // Si salva l'URL di EMBED: gli array events.videos e formats.videos sono
      // text[] e contengono già URL misti (YouTube, Vimeo, incollati a mano).
      // Il guid resta rileggibile dall'URL, quindi non serve una colonna nuova.
      return sign.embedUrl;
    }

    // Percorso di sempre: multipart attraverso la funzione Vercel.
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `Upload fallito (${res.status})`);
    }
    const { url } = (await res.json()) as UploadResult;
    return url;
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
          setError(`"${file.name}" supera il limite di dimensione.`);
          continue;
        }
        const url = await uploadOne(file);
        next.push(url);

        // Salvato subito, come fa la dashboard artista. Se non riesce non si
        // interrompe il caricamento: il video è comunque nel modulo e il Salva
        // lo persiste — ma chi sta lavorando deve sapere che per ora è appeso.
        if (onPersist) {
          const res = await onPersist(url);
          if (!res.ok) {
            setError(
              res.error ??
                "Video caricato, ma non ancora collegato all'evento: premi Salva per confermarlo."
            );
          }
        }
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

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {!onPersist && (
        <p className="text-xs text-muted-foreground">
          I video caricati qui vengono collegati quando salvi. Su un contenuto
          nuovo è inevitabile: prima deve esistere, poi può avere dei video.
        </p>
      )}

      {value.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative overflow-hidden rounded-md border border-border bg-black"
            >
              {isBunnyEmbedUrl(url) ? (
                // Un URL di embed è una pagina, non un file: dentro <video>
                // non suonerebbe. In un form di redazione basta l'iframe.
                <iframe
                  src={url}
                  title="Anteprima video"
                  loading="lazy"
                  allow="accelerometer; gyroscope; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  className="aspect-video w-full border-0 bg-black"
                />
              ) : isExternalVideo(url) ? (
                /* I vecchi link YouTube/Vimeo non si mostrano più sul sito. La
                   riga resta in database — non si cancella niente da sola — ma
                   da qualche parte bisogna pur dire quali video sono rimasti
                   scoperti, e questo è il posto in cui si rimedia: l'URL è
                   cliccabile per ritrovare il file e ricaricarlo qui sopra. */
                <div className="flex aspect-video w-full flex-col justify-center gap-2 bg-amber-50 p-4 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Video esterno non più supportato
                  </p>
                  <p className="text-xs leading-relaxed text-amber-900/80">
                    Non compare sul sito. Recupera il file e ricaricalo qui
                    sopra, poi togli questa riga.
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-amber-900 underline underline-offset-2 hover:text-amber-950"
                  >
                    {url}
                  </a>
                </div>
              ) : (
                <video
                  src={url}
                  className="aspect-video w-full bg-black"
                  controls
                  preload="metadata"
                />
              )}
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
