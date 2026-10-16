"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, RotateCcw, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import {
  CROP_QUALITY,
  IMAGE_TARGETS,
  canvasToBlob,
  decodeOriented,
  paintCrop,
  type ImageKind,
} from "@/lib/upload/compressImage";

/**
 * Immagini dell'evento: DUE caricamenti indipendenti.
 *
 * La copertina finisce in due posti con proporzioni diverse:
 *   - home page e liste eventi (EventCard, PastEventsSection): 3:4 verticale,
 *     colonna `events.cover_image_home` (migration 0007);
 *   - pagina del singolo evento (hero): 16:9 orizzontale, colonna `cover_image`.
 * Sono due file distinti (due locandine diverse): ciascun formato ha il proprio
 * selettore, il proprio ritaglio, la propria anteprima e il proprio upload.
 * Se manca la verticale, la home usa l'orizzontale.
 */

type Slot = "home" | "hero";

const SLOTS: Record<Slot, { kind: ImageKind; titolo: string; etichetta: string; dove: string }> = {
  home: {
    kind: "event_home",
    titolo: "Locandina home e liste",
    etichetta: "Locandina home e liste (verticale 3:4)",
    dove: "Card verticale 3:4 in home, in /eventi e negli eventi correlati",
  },
  hero: {
    kind: "event",
    titolo: "Immagine pagina evento",
    etichetta: "Immagine pagina evento (orizzontale 16:9)",
    dove: "Immagine orizzontale 16:9 in cima alla pagina del singolo evento",
  },
};

type Source = CanvasImageSource & { width: number; height: number };
type CropState = { zoom: number; offset: { x: number; y: number } };

function coverZoom(img: Source, w: number, h: number) {
  return Math.max(w / img.width, h / img.height);
}
function containZoom(img: Source, w: number, h: number) {
  return Math.min(w / img.width, h / img.height);
}

/**
 * Tiene l'immagine dentro il riquadro: se è più grande non scopre bordi neri,
 * se è più piccola (zoom sotto il riempimento) non esce dal riquadro.
 */
function clampOffset(img: Source, w: number, h: number, zoom: number, o: { x: number; y: number }) {
  const lx = Math.abs(img.width * zoom - w) / 2;
  const ly = Math.abs(img.height * zoom - h) / 2;
  return {
    x: Math.max(-lx, Math.min(lx, o.x)),
    y: Math.max(-ly, Math.min(ly, o.y)),
  };
}

function initialCrop(img: Source, slot: Slot): CropState {
  const t = IMAGE_TARGETS[SLOTS[slot].kind];
  return { zoom: coverZoom(img, t.w, t.h), offset: { x: 0, y: 0 } };
}

type Props = {
  /** URL 3:4 (cover_image_home). */
  homeValue: string;
  onHomeChange: (url: string) => void;
  /** URL 16:9 (cover_image). */
  heroValue: string;
  onHeroChange: (url: string) => void;
};

export function EventCoverEditor({ homeValue, onHomeChange, heroValue, onHeroChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,3fr)_minmax(0,5fr)]">
        <SlotEditor slot="home" value={homeValue} onChange={onHomeChange} />
        <SlotEditor slot="hero" value={heroValue} onChange={onHeroChange} />
      </div>
      <p className="text-xs text-muted-foreground">
        Le due immagini si caricano separatamente, anche con file diversi. Se manca la locandina
        verticale, la home e le liste usano l&apos;immagine orizzontale.
      </p>
    </div>
  );
}

function SlotEditor({
  slot,
  value,
  onChange,
}: {
  slot: Slot;
  value: string;
  onChange: (url: string) => void;
}) {
  const s = SLOTS[slot];
  const t = IMAGE_TARGETS[s.kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [img, setImg] = useState<Source | null>(null);
  // Il file originale scelto in questa sessione: «Modifica ritaglio» riparte da
  // qui, a piena risoluzione, invece che dal ritaglio già salvato.
  const [original, setOriginal] = useState<Source | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const titleId = `event-cover-editor-${slot}`;

  function openWith(source: Source) {
    setImg(source);
    setCrop(initialCrop(source, slot));
    setError(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLoadError(null);
    try {
      const decoded = await decodeOriented(f);
      setOriginal(decoded);
      openWith(decoded);
    } catch {
      setLoadError("Non riesco a leggere questo file. Prova con un JPG o un PNG.");
    }
  }

  /**
   * Ritaglia di nuovo: dal file scelto in questa sessione se c'è, altrimenti
   * dall'immagine già salvata. Serve il permesso CORS del CDN per esportare il
   * canvas: se manca, si chiede di ricaricare il file.
   */
  function recropFromUrl() {
    if (original) {
      openWith(original);
      return;
    }
    if (!value) return;
    setLoadError(null);
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => openWith(el);
    el.onerror = () =>
      setLoadError("Non riesco a riaprire l'immagine salvata: carica di nuovo il file dal computer.");
    el.src = value;
  }

  const updateCrop = useCallback(
    (next: (c: CropState) => CropState) => {
      if (!img) return;
      setCrop((prev) => {
        if (!prev) return prev;
        const n = next(prev);
        return { zoom: n.zoom, offset: clampOffset(img, t.w, t.h, n.zoom, n.offset) };
      });
    },
    [img, t.w, t.h]
  );

  function close() {
    setImg(null);
    setCrop(null);
    setError(null);
  }

  async function confirm() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    setUploading(true);
    try {
      const blob = await canvasToBlob(canvas, "image/jpeg", CROP_QUALITY);
      const fd = new FormData();
      fd.append("file", new File([blob], `${s.kind}.jpg`, { type: "image/jpeg" }));
      fd.append("kind", s.kind);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Upload fallito (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      onChange(url);
      close();
    } catch (e) {
      setError(
        e instanceof Error && e.name === "SecurityError"
          ? "L'immagine salvata non si può riesportare: carica di nuovo il file dal computer."
          : e instanceof Error
            ? e.message
            : "Errore durante il caricamento"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{s.etichetta}</Label>
      <div
        className="relative w-full overflow-hidden rounded-xl bg-muted"
        style={{ aspectRatio: t.aspect, maxWidth: slot === "home" ? 220 : undefined }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`Anteprima: ${s.titolo.toLowerCase()}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
            Nessuna immagine
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{s.dove}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
        aria-label={s.etichetta}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" /> {value ? "Sostituisci" : "Carica immagine"}
        </Button>
        {value && (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={recropFromUrl}>
              <Crop className="size-4" /> Modifica ritaglio
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              Rimuovi
            </Button>
          </>
        )}
      </div>
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {img && crop && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="relative w-full max-w-xl space-y-5 bg-background p-5 shadow-2xl sm:rounded-lg sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p id={titleId} className="font-display text-lg">
                  Ritaglia: {s.etichetta}
                </p>
                <p className="text-xs text-muted-foreground">
                  Trascina l&apos;immagine per spostarla e usa lo zoom per ridimensionarla.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Chiudi"
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <CropPane
              slot={slot}
              img={img}
              crop={crop}
              onChange={updateCrop}
              onReset={() => updateCrop(() => initialCrop(img, slot))}
              canvasRef={(el) => {
                canvasRef.current = el;
              }}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Annulla
              </Button>
              <Button type="button" variant="accent" onClick={confirm} disabled={uploading}>
                {uploading ? "Caricamento…" : "Conferma e carica"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CropPane({
  slot,
  img,
  crop,
  onChange,
  onReset,
  canvasRef,
}: {
  slot: Slot;
  img: Source;
  crop: CropState;
  onChange: (next: (c: CropState) => CropState) => void;
  onReset: () => void;
  canvasRef: (el: HTMLCanvasElement | null) => void;
}) {
  const s = SLOTS[slot];
  const t = IMAGE_TARGETS[s.kind];
  const localRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const minZoom = Math.min(containZoom(img, t.w, t.h), coverZoom(img, t.w, t.h));
  const maxZoom = coverZoom(img, t.w, t.h) * 4;

  useEffect(() => {
    const canvas = localRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = t.w;
    canvas.height = t.h;
    paintCrop(ctx, { img, targetW: t.w, targetH: t.h, zoom: crop.zoom, offset: crop.offset });
  }, [img, crop, t.w, t.h]);

  function setZoom(z: number) {
    const zoom = Math.max(minZoom, Math.min(maxZoom, z));
    onChange((c) => ({ zoom, offset: c.offset }));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: crop.offset.x, oy: crop.offset.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    const canvas = localRef.current;
    if (!d || !canvas) return;
    const scale = t.w / canvas.getBoundingClientRect().width;
    const x = d.ox + (e.clientX - d.x) * scale;
    const y = d.oy + (e.clientY - d.y) * scale;
    onChange((c) => ({ zoom: c.zoom, offset: { x, y } }));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  // Frecce della tastiera per spostare, +/- per lo zoom: il riquadro è
  // focalizzabile, così l'editor si usa anche senza mouse.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 60 : 15;
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      onChange((c) => ({ zoom: c.zoom, offset: { x: c.offset.x + m.x, y: c.offset.y + m.y } }));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setZoom(crop.zoom * 1.05);
    } else if (e.key === "-") {
      e.preventDefault();
      setZoom(crop.zoom / 1.05);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">
          {s.titolo} <span className="font-normal text-muted-foreground">· {t.aspect.replace(/ /g, "")}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {s.dove}. Uscita {t.w}×{t.h}.
        </p>
      </div>
      <div
        className="mx-auto w-full overflow-hidden rounded-xl bg-black outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{ aspectRatio: t.aspect, maxWidth: slot === "home" ? 340 : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="application"
        aria-label={`Ritaglio ${s.titolo}: frecce per spostare, più e meno per lo zoom`}
      >
        <canvas
          ref={(el) => {
            localRef.current = el;
            canvasRef(el);
          }}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" }}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setZoom(crop.zoom / 1.1)}
          aria-label="Riduci"
          className="inline-flex size-8 items-center justify-center rounded-full hover:bg-muted"
        >
          <ZoomOut className="size-4" />
        </button>
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step={(maxZoom - minZoom) / 300}
          value={crop.zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-[var(--color-accent,#FF5722)]"
          aria-label={`Zoom ${s.titolo}`}
        />
        <button
          type="button"
          onClick={() => setZoom(crop.zoom * 1.1)}
          aria-label="Ingrandisci"
          className="inline-flex size-8 items-center justify-center rounded-full hover:bg-muted"
        >
          <ZoomIn className="size-4" />
        </button>
        <button
          type="button"
          onClick={onReset}
          aria-label="Ripristina ritaglio"
          title="Ripristina"
          className="inline-flex size-8 items-center justify-center rounded-full hover:bg-muted"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}
