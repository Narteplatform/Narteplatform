"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const MAX = 4 * 1024 * 1024;
const FORMATI = ["image/png", "image/webp", "image/jpeg"];

/**
 * Caricamento di un logo SENZA ritaglio: i loghi hanno proporzioni libere e
 * spesso lo sfondo trasparente (PNG/WebP), che un ritaglio in JPEG perderebbe.
 */
export function LogoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    if (!FORMATI.includes(f.type)) return setError("Usa un file PNG, WebP o JPG (meglio PNG con sfondo trasparente).");
    if (f.size > MAX) return setError("Il file supera i 4 MB.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("kind", "site-logo");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Caricamento non riuscito");
      onChange(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Caricamento non riuscito");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded-lg border border-border bg-notte p-2">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-palco/60">Nessun logo</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="size-3.5" aria-hidden="true" /> {uploading ? "Caricamento…" : value ? "Sostituisci" : "Carica logo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <X className="size-3.5" aria-hidden="true" /> Togli
            </Button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={onFile} />
      <p className="text-xs text-muted-foreground">
        Anteprima su fondo scuro, come nel nastro della home. Senza logo compare il nome.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
