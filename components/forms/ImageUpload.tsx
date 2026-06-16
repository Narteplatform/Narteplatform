"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type Kind = "artist" | "event" | "event_home" | "avatar" | "venue" | "format" | "blog";

const SIZES: Record<Kind, { w: number; h: number; aspect: string }> = {
  artist: { w: 900, h: 1200, aspect: "3 / 4" },
  event: { w: 1600, h: 900, aspect: "16 / 9" },
  event_home: { w: 900, h: 1200, aspect: "3 / 4" },
  avatar: { w: 400, h: 400, aspect: "1 / 1" },
  venue: { w: 1600, h: 900, aspect: "16 / 9" },
  format: { w: 900, h: 1200, aspect: "3 / 4" },
  blog: { w: 1600, h: 900, aspect: "16 / 9" },
};

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind?: Kind;
};

export function ImageUpload({ label, value, onChange, kind = "artist" }: Props) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const target = SIZES[kind];

  function pick() {
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setSrc(dataUrl);
      const img = new Image();
      img.onload = () => {
        setImgEl(img);
        // fit cover initial: zoom = max(target.w/img.w, target.h/img.h)
        const z = Math.max(target.w / img.width, target.h / img.height);
        setZoom(z);
        setOffset({ x: 0, y: 0 });
        setOpen(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  // Disegna sul canvas
  useEffect(() => {
    if (!open || !imgEl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = target.w;
    canvas.height = target.h;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, target.w, target.h);
    const dw = imgEl.width * zoom;
    const dh = imgEl.height * zoom;
    const dx = (target.w - dw) / 2 + offset.x;
    const dy = (target.h - dh) / 2 + offset.y;
    ctx.drawImage(imgEl, dx, dy, dw, dh);
  }, [imgEl, zoom, offset, open, target.w, target.h]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = target.w / rect.width;
    const dx = (e.clientX - dragRef.current.startX) * scale;
    const dy = (e.clientY - dragRef.current.startY) * scale;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  async function save() {
    if (!canvasRef.current) return;
    setError(null);
    setUploading(true);
    try {
      const blob: Blob | null = await new Promise((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b), "image/jpeg", 0.88)
      );
      if (!blob) throw new Error("Conversione immagine fallita");
      const file = new File([blob], `image.jpg`, { type: "image/jpeg" });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Upload fallito (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      onChange(url);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore upload");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setOpen(false);
    setSrc(null);
    setImgEl(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className="relative shrink-0 overflow-hidden bg-muted"
          style={{ width: 160, aspectRatio: target.aspect }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Nessuna immagine
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={pick}>
              <Upload className="size-4" /> Carica dal computer
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
                Rimuovi
              </Button>
            )}
          </div>
          <Input
            type="url"
            placeholder="…o incolla URL https://…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>

      {open && src && imgEl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl space-y-4 bg-background p-6 shadow-2xl sm:rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg uppercase">Ritaglia e centra</p>
                <p className="text-xs text-muted-foreground">
                  Trascina per spostare · usa lo zoom per ridimensionare. Output{" "}
                  {target.w}×{target.h}.
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                aria-label="Chiudi"
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div
              className="mx-auto w-full overflow-hidden bg-black"
              style={{ aspectRatio: target.aspect, maxWidth: 480 }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "grab" }}
              />
            </div>

            <div className="flex items-center gap-3">
              <ZoomOut className="size-4" />
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
                aria-label="Zoom"
              />
              <ZoomIn className="size-4" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                Annulla
              </Button>
              <Button type="button" variant="accent" onClick={save} disabled={uploading}>
                {uploading ? "Caricamento…" : "Conferma e carica"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
