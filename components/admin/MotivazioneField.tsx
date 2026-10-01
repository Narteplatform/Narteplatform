"use client";

import { useEffect, useId, useState } from "react";
import { Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/**
 * Motivazione strutturata di una decisione del team: la regola applicata (da
 * un elenco breve) più i fatti. Produce una sola stringa, nella forma
 * «Regola: X — Fatti: Y», che è quella che viene registrata e inviata
 * all'interessato (art. 17 DSA).
 *
 * `onChange` riceve la stringa composta SOLO quando la motivazione è completa
 * (regola scelta e almeno `minFatti` caratteri di fatti); altrimenti riceve
 * `""`. Così i pulsanti che si abilitano su «motivazione non vuota» restano
 * corretti senza ripetere la regola dei 10 caratteri in ogni modulo.
 *
 * Per svuotare il campo da fuori (dopo un invio riuscito) si incrementa
 * `resetKey`.
 */

export const REGOLE_APPLICATE = [
  "Termini d'uso, art. 7 (comportamento)",
  "Condizioni artisti, art. 4-5 (diritti e contenuti)",
  "Condizioni artisti, art. 6 (moderazione dei media)",
  "Regolamento recensioni, art. 4/6",
  "Politica di moderazione, art. 7",
  "Dati di terzi",
  "Segnalazione accolta",
  "Obbligo di legge",
  "Altro",
] as const;

export type RegolaApplicata = (typeof REGOLE_APPLICATE)[number];

export function componiMotivazione(regola: string, fatti: string): string {
  return `Regola: ${regola.trim()} — Fatti: ${fatti.trim()}`;
}

export function MotivazioneField({
  onChange,
  label = "Motivazione",
  hint,
  disabled,
  rows = 3,
  minFatti = 10,
  maxFatti = 900,
  resetKey = 0,
  compact = false,
  onDark = false,
  className,
}: {
  onChange: (motivazione: string) => void;
  label?: string;
  /** Riga di spiegazione sotto il campo (es. «Viene inviata all'artista»). */
  hint?: string;
  disabled?: boolean;
  rows?: number;
  minFatti?: number;
  maxFatti?: number;
  resetKey?: number;
  compact?: boolean;
  /** Per i riquadri su fondo scuro (visualizzatore a schermo intero). */
  onDark?: boolean;
  className?: string;
}) {
  const uid = useId();
  const [regola, setRegola] = useState("");
  const [fatti, setFatti] = useState("");

  useEffect(() => {
    setRegola("");
    setFatti("");
  }, [resetKey]);

  function emetti(r: string, f: string) {
    onChange(r && f.trim().length >= minFatti ? componiMotivazione(r, f) : "");
  }

  const text = compact ? "text-xs" : "text-sm";

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <label htmlFor={`${uid}-regola`} className={cn("mb-1 block text-xs font-semibold", onDark && "text-white")}>
          {label}: regola applicata
        </label>
        <select
          id={`${uid}-regola`}
          value={regola}
          disabled={disabled}
          onChange={(e) => {
            setRegola(e.target.value);
            emetti(e.target.value, fatti);
          }}
          className={cn(
            "h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-2 text-foreground focus:border-azzurro focus:outline-none disabled:opacity-50",
            onDark && "bg-white/90",
            text,
          )}
        >
          <option value="">Scegli la regola…</option>
          {REGOLE_APPLICATE.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-fatti`} className={cn("mb-1 block text-xs font-semibold", onDark && "text-white")}>
          Fatti
        </label>
        <Textarea
          id={`${uid}-fatti`}
          rows={rows}
          value={fatti}
          maxLength={maxFatti}
          disabled={disabled}
          onChange={(e) => {
            setFatti(e.target.value);
            emetti(regola, e.target.value);
          }}
          placeholder={`Cosa è successo, in modo preciso (almeno ${minFatti} caratteri).`}
          className={cn("min-h-0", onDark && "bg-white/90", text)}
        />
      </div>
      {hint && <p className={cn("text-[11px]", onDark ? "text-white/70" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
