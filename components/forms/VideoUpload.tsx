"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Upload, Film, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import {
  addArtistVideo,
  confirmArtistVideoUpload,
  deleteArtistVideo,
  renameArtistVideo,
  refreshArtistVideoStatus,
} from "@/app/(artist)/dashboard/_actions";
import { probeVideo } from "@/lib/upload/probeVideo";
import { putWithProgress, UploadAbortedError } from "@/lib/upload/putWithProgress";
import { uploadViaTus } from "@/lib/upload/tusUpload";
import { streamOriginalUrl, videoPosterUrl } from "@/lib/storage/bunny/urls";
import { VideoPoster } from "@/components/media/VideoPoster";
import { videoAspectRatio } from "@/lib/media/aspect";
import { captureVideoPoster } from "@/lib/upload/videoPoster";
import {
  MAX_VIDEO_BYTES_BUNNY,
  formatMb,
  guessVideoMime,
  videoLimitsFor,
} from "@/lib/upload/video-limits";

export type ArtistVideoItem = {
  id: string;
  url: string | null;
  storage_path: string | null;
  title: string | null;
  duration_ms: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  provider: string;
  bunny_guid: string | null;
  playback_state: string;
  upload_state: string;
  bunny_error: string | null;
  width: number | null;
  height: number | null;
};

type SignResponse =
  | { uploadKind: "supabase-signed"; signedUrl: string; path: string; publicUrl: string }
  | {
      uploadKind: "bunny-tus";
      videoId: string;
      videoGuid: string;
      libraryId: string;
      signature: string;
      expire: number;
      tusEndpoint: string;
      title: string;
    };

type Props = {
  artistId: string;
  initialVideos: ArtistVideoItem[];
  /** Tetto del PIANO dell'artista (1 Free / 3 Pro / 3 Max), non una costante piatta. */
  videoMax: number;
};

/** Ogni quanto chiedere a Bunny se il video è pronto, e per quanto insistere. */
const POLL_MS = 5000;
const POLL_MAX_ATTEMPTS = 60;

export function VideoUpload({ artistId, initialVideos, videoMax }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const [videos, setVideos] = useState<ArtistVideoItem[]>(initialVideos);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const uploading = progress !== null;
  const slotsLeft = videoMax - videos.length;

  // Il ramo Bunny è il più permissivo: la validazione vera la fa il server, che
  // conosce la destinazione e risponde con un messaggio già scritto in italiano.
  // Qui si scarta solo ciò che è palesemente fuori scala, per non far partire
  // un trasferimento destinato a essere rifiutato.
  const clientAccept = videoLimitsFor("bunny").accept;

  function pick() {
    inputRef.current?.click();
  }

  // --- Rete di sicurezza n.2: il polling ------------------------------------
  // Il webhook di Bunny può non arrivare, e in sviluppo NON PUÒ arrivare
  // (localhost non è raggiungibile da Bunny). Senza questo, un video appena
  // caricato resterebbe "in elaborazione" per sempre.
  const processingIds = videos
    .filter((v) => v.provider === "bunny" && v.playback_state === "processing")
    .map((v) => v.id)
    .join(",");

  useEffect(() => {
    if (!processingIds) return;
    let attempts = 0;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      // Non si interroga il server mentre la scheda è in secondo piano.
      if (document.visibilityState !== "visible") return;
      attempts += 1;
      if (attempts > POLL_MAX_ATTEMPTS) {
        stopped = true;
        clearInterval(timer);
        return;
      }
      for (const id of processingIds.split(",")) {
        const res = await refreshArtistVideoStatus(id);
        if (res.ok && res.video) {
          const updated = res.video as ArtistVideoItem;
          setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        }
      }
    };

    const timer = setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [processingIds]);

  const uploadOne = useCallback(
    async (file: File, currentCount: number): Promise<ArtistVideoItem | null> => {
      if (currentCount >= videoMax) {
        throw new Error(
          `Il tuo piano include ${videoMax} ${videoMax === 1 ? "video" : "video"}. Eliminane uno per caricarne un altro.`
        );
      }

      const mime = guessVideoMime(file);
      if (!mime) {
        throw new Error(`"${file.name}": non sembra un file video.`);
      }
      if (file.size > MAX_VIDEO_BYTES_BUNNY) {
        throw new Error(
          `"${file.name}" pesa ${formatMb(file.size)} e supera il limite di ${formatMb(MAX_VIDEO_BYTES_BUNNY)}.`
        );
      }

      // Misurato PRIMA della firma: le dimensioni viaggiano con la richiesta e
      // finiscono sulla riga fin dalla creazione, così il video si mostra col
      // formato giusto già durante la conversione.
      const probe = await probeVideo(file);

      const signRes = await fetch("/api/upload/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId,
          fileName: file.name,
          contentType: mime,
          size: file.size,
          width: probe.width,
          height: probe.height,
        }),
      });
      if (!signRes.ok) {
        const j = (await signRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Impossibile avviare il caricamento (${signRes.status})`);
      }
      const sign = (await signRes.json()) as SignResponse;

      setProgress({ name: file.name, pct: 0 });

      // ---------------------------------------------------------------------
      // Ramo Bunny Stream — TUS a chunk, riprendibile
      // ---------------------------------------------------------------------
      if (sign.uploadKind === "bunny-tus") {
        // Se il browser non decodifica questo file, l'artista lo scopre ADESSO
        // — con la ragione e il tempo di attesa — invece di trovarsi davanti a un
        // riquadro muto per venti minuti chiedendosi se il caricamento sia
        // fallito. Non blocca: il video si carica comunque.
        if (!probe.playable) {
          setNotice(
            `"${file.name}" usa un formato che questo browser non riproduce da solo (di solito HEVC, il formato predefinito dell'iPhone). Il caricamento prosegue normalmente e il video sarà visibile a tutti entro una ventina di minuti, appena convertito.`
          );
        }

        await uploadViaTus({
          file,
          endpoint: sign.tusEndpoint,
          libraryId: sign.libraryId,
          videoGuid: sign.videoGuid,
          signature: sign.signature,
          expire: sign.expire,
          title: sign.title,
          contentType: mime,
          onProgress: (pct) => setProgress({ name: file.name, pct }),
          registerAbort: (abort) => {
            abortRef.current = abort;
          },
        });

        // Il poster serve SUBITO: la thumbnail di Bunny esiste solo a
        // transcodifica finita, e nella coda gratuita quella può essere
        // mezz'ora dopo. Best-effort in senso stretto — se qualcosa va storto
        // il video è già caricato e non deve fallire per un'anteprima.
        setProgress({ name: file.name, pct: 100 });
        try {
          const poster = await captureVideoPoster(file);
          if (poster) {
            const fd = new FormData();
            fd.append("file", poster);
            fd.append("guid", sign.videoGuid);
            await fetch("/api/upload/video/poster", { method: "POST", body: fd });
          }
        } catch {
          // nessuna anteprima: si mostra il riquadro neutro
        }

        const ack = await confirmArtistVideoUpload(sign.videoId);
        if (!ack.ok) throw new Error(ack.error);
        return (ack.video ?? null) as ArtistVideoItem | null;
      }

      // ---------------------------------------------------------------------
      // Ramo Supabase — il percorso di sempre
      // ---------------------------------------------------------------------
      // Su questo ramo il browser deve poter decodificare il file: Supabase non
      // transcodifica. Su Bunny il controllo non serve, perché è proprio ciò che
      // Bunny risolve.
      const { durationMs, playable } = probe;
      if (!playable) {
        const proceed = window.confirm(
          `"${file.name}" non sembra riproducibile in questo browser: probabilmente usa un codec non supportato (es. HEVC).\n\nSe lo carichi, molti visitatori non riusciranno a vederlo. Consigliamo di riesportarlo in MP4 (H.264).\n\nCaricarlo lo stesso?`
        );
        if (!proceed) return null;
      }

      const controller = new AbortController();
      abortRef.current = () => controller.abort();

      await putWithProgress({
        signedUrl: sign.signedUrl,
        file,
        signal: controller.signal,
        onProgress: ({ pct }) => setProgress({ name: file.name, pct }),
      });

      const ack = await addArtistVideo({
        artist_id: artistId,
        url: sign.publicUrl,
        storage_path: sign.path,
        size_bytes: file.size,
        mime_type: mime,
        duration_ms: durationMs,
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
      });
      if (!ack.ok) throw new Error(ack.error);
      return (ack.video ?? null) as ArtistVideoItem | null;
    },
    [artistId, videoMax]
  );

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setNotice(null);

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
    abortRef.current?.();
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label>I tuoi video</Label>
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {videos.length} di {videoMax}
          </span>{" "}
          {videoMax === 1 ? "spazio" : "spazi"} del tuo piano · fino a{" "}
          {formatMb(MAX_VIDEO_BYTES_BUNNY)} per video
        </span>
      </div>

      {videos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              disabled={pending}
              onRename={(title) =>
                setVideos((prev) => prev.map((x) => (x.id === v.id ? { ...x, title } : x)))
              }
              onRemove={() => remove(v.id)}
            />
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
            {progress.pct}% — se la connessione cade, il caricamento riprende da dove si era
            interrotto.
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={clientAccept}
        multiple
        className="hidden"
        onChange={onFiles}
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* Variante piena e non "outline": caricare un video è LA cosa che si
            fa in questa sezione, non una fra tante. */}
        <Button
          type="button"
          variant="accent"
          size={videos.length === 0 ? "lg" : "md"}
          onClick={pick}
          disabled={uploading || slotsLeft <= 0}
        >
          <Upload className="size-4" />
          {uploading ? "Caricamento…" : videos.length === 0 ? "Carica il tuo primo video" : "Carica video"}
        </Button>
        {slotsLeft <= 0 ? (
          <span className="text-xs text-muted-foreground">
            Hai occupato tutti gli spazi del tuo piano
            {videoMax === 1 ? " (1 video)" : ` (${videoMax} video)`}. Elimina un video con
            il pulsante <span className="font-medium text-foreground">Elimina</span> qui sopra
            per liberare spazio e caricarne un altro.
          </span>
        ) : (
          videos.length === 0 && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Film className="size-3.5" /> Mostra al meglio le tue performance.
            </span>
          )
        )}
      </div>
      {/* Prevenire costa meno che spiegare dopo: un video registrato in H.264 è
          online all'istante, uno in HEVC può richiedere qualche minuto di
          conversione prima di essere visibile a tutti i browser. */}
      <p className="text-xs text-muted-foreground">
        Suggerimento: se riprendi con l&apos;iPhone, imposta{" "}
        <span className="font-medium text-foreground">
          Impostazioni → Fotocamera → Formati → «Massima compatibilità»
        </span>
        . I video saranno online subito.
      </p>
      {notice && (
        <p className="rounded-lg border border-border bg-muted p-3 text-xs leading-snug text-muted-foreground">
          {notice}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Scheda di un video caricato: anteprima, titolo modificabile, eliminazione.
 *
 * Il titolo si salva quando il campo perde il fuoco o si preme Invio — non a
 * ogni tasto: una Server Action per carattere sarebbe una richiesta ogni
 * battuta. Se il salvataggio fallisce si torna al titolo precedente, così
 * quello che si legge a schermo è sempre quello che sta nel database.
 */
function VideoCard({
  video,
  disabled,
  onRename,
  onRemove,
}: {
  video: ArtistVideoItem;
  disabled: boolean;
  onRename: (title: string | null) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(video.title ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  async function commit() {
    const next = draft.trim();
    if (next === (video.title ?? "")) return;
    setSaving(true);
    setFailed(false);
    const res = await renameArtistVideo(video.id, next);
    setSaving(false);
    if (!res.ok) {
      setFailed(true);
      setDraft(video.title ?? "");
      return;
    }
    onRename(res.title);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div
        className="w-full overflow-hidden bg-black"
        style={{ aspectRatio: videoAspectRatio(video.width, video.height) }}
      >
        <VideoPreview video={video} />
      </div>
      <div className="space-y-2 border-t border-border p-3">
        <label className="sr-only" htmlFor={`titolo-${video.id}`}>
          Titolo del video
        </label>
        <input
          id={`titolo-${video.id}`}
          type="text"
          value={draft}
          maxLength={120}
          placeholder="Dai un titolo a questo video"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === "Escape") setDraft(video.title ?? "");
          }}
          className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground" role="status" aria-live="polite">
            {saving ? "Salvataggio…" : saved ? "Titolo salvato" : failed ? "Non salvato, riprova" : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={disabled}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="size-3.5" /> Elimina
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Anteprima nell'editor mentre la conversione è in corso.
 *
 * Si prova a riprodurre il file originale: se il browser lo decodifica, il
 * video è già guardabile. Se non lo decodifica — quasi sempre un .mov HEVC,
 * il formato predefinito dell'iPhone — si spiega all'artista cosa sta
 * succedendo E come evitarlo la prossima volta. È l'unico punto in cui quel
 * consiglio ha senso: qui la persona ha appena caricato e sta guardando.
 */
function BunnyOriginalPreview({ guid }: { guid: string }) {
  const [unavailable, setUnavailable] = useState(false);
  if (unavailable) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-neutral-900">
        {/* Il poster dietro il messaggio non è decorazione: è il caso in cui il
            browser di chi carica non decodifica il file, quindi non abbiamo
            potuto estrarre noi un fotogramma. Appena Bunny genera la sua
            anteprima, l'artista vede il PROPRIO video invece di un rettangolo
            vuoto — proprio mentre è costretto ad aspettare. */}
        <VideoPoster guid={guid} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center text-white">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <p className="text-xs font-medium">Conversione in corso</p>
          <p className="text-[11px] leading-snug text-white/75">
            Questo formato non si riproduce da solo su questo browser. Il video è
            al sicuro: comparirà appena la conversione è pronta.
          </p>
          <p className="text-[11px] leading-snug text-white/75">
            Per averlo online subito, la prossima volta registra in{" "}
            <span className="font-medium text-white">
              Impostazioni → Fotocamera → Formati → «Massima compatibilità»
            </span>
            .
          </p>
        </div>
      </div>
    );
  }
  return (
    <video
      src={streamOriginalUrl(guid)}
      poster={videoPosterUrl(guid)}
      className="h-full w-full bg-black object-cover"
      controls
      preload="metadata"
      playsInline
      onError={() => setUnavailable(true)}
    />
  );
}

function VideoPreview({ video }: { video: ArtistVideoItem }) {
  if (video.playback_state === "failed") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted px-4 text-center">
        <AlertTriangle className="size-5 text-red-600" aria-hidden />
        <p className="text-xs text-muted-foreground">
          {video.bunny_error ?? "La conversione non è riuscita."} Prova a ricaricarlo.
        </p>
      </div>
    );
  }

  if (video.playback_state === "processing") {
    // Si prova SEMPRE l'originale: Bunny lo conserva senza costi aggiuntivi e
    // lo serve subito, mentre la versione a bitrate adattivo è ancora in coda.
    // Se questo browser non lo decodifica, BunnyOriginalPreview mostra da sé il
    // messaggio di attesa.
    return video.bunny_guid ? <BunnyOriginalPreview guid={video.bunny_guid} /> : null;
  }

  if (video.provider === "bunny" && video.bunny_guid) {
    // Nell'editor basta il poster: montare l'iframe del player per ogni video
    // scaricherebbe il suo bundle anche solo aprendo la pagina del profilo.
    return <VideoPoster guid={video.bunny_guid} />;
  }

  return (
    <video
      src={video.url ?? undefined}
      className="h-full w-full bg-black object-cover"
      controls
      preload="metadata"
      playsInline
    />
  );
}
