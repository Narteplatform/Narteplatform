"use client";

import { useState, useTransition } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { registraAccordo } from "@/app/(organizer)/organizzatore/_actions";
import {
  FASCE_ORARIE,
  etichettaFascia,
  formatDataIt,
  formatEuroIt,
  type FasciaOraria,
} from "@/lib/booking/etichette";

const selectClass =
  "flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro";

/**
 * Organizzatore, trattativa via email con un artista Free: registra l'accordo
 * (data, fascia, compenso). È la sua conferma; la data si blocca quando
 * l'artista conferma a sua volta dal pannello Richieste.
 */
export function RegistraAccordo({
  requestId,
  dataIniziale,
  fasciaIniziale,
  registrato,
}: {
  requestId: string;
  dataIniziale: string;
  fasciaIniziale: string | null;
  /** Accordo già registrato e in attesa della conferma dell'artista. */
  registrato: { data: string; fascia: string | null; prezzo: number } | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aperto, setAperto] = useState(false);
  const [consenso, setConsenso] = useState(false);
  const fasciaValida = FASCE_ORARIE.some((f) => f.v === fasciaIniziale);
  const [data, setData] = useState(registrato?.data ?? dataIniziale);
  const [fascia, setFascia] = useState<FasciaOraria>(
    (registrato?.fascia ?? (fasciaValida ? fasciaIniziale : "sera")) as FasciaOraria,
  );
  const [prezzo, setPrezzo] = useState(registrato ? String(registrato.prezzo) : "");
  const oggi = new Date().toISOString().slice(0, 10);

  if (!aperto) {
    return (
      <div className="space-y-2">
        {registrato && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Accordo registrato · in attesa della conferma dell&apos;artista
            </p>
            <p className="mt-1 font-medium">
              {[formatDataIt(registrato.data), etichettaFascia(registrato.fascia), formatEuroIt(registrato.prezzo)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}
        <Button size="sm" variant={registrato ? "outline" : "default"} onClick={() => setAperto(true)}>
          <ClipboardCheck className="size-4" />
          {registrato ? "Modifica l'accordo" : "Registra l'accordo"}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!consenso) {
          setError("Conferma di aver raggiunto l'accordo direttamente con l'artista.");
          return;
        }
        start(async () => {
          setError(null);
          const r = await registraAccordo({
            request_id: requestId,
            event_date: data,
            time_slot: fascia,
            price: Number(prezzo.replace(",", ".")),
          });
          if (!r.ok) {
            setError(r.error);
            return;
          }
          setAperto(false);
          setConsenso(false);
        });
      }}
    >
      <p className="font-display text-base tracking-tight">Registra l&apos;accordo</p>
      <p className="text-muted-foreground">
        Inserisci quello che avete concordato via email. L&apos;artista riceve una notifica e la data
        si blocca quando conferma.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`accordo-data-${requestId}`}>Data</Label>
          <Input
            id={`accordo-data-${requestId}`}
            type="date"
            min={oggi}
            required
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`accordo-fascia-${requestId}`}>Fascia</Label>
          <select
            id={`accordo-fascia-${requestId}`}
            className={selectClass}
            value={fascia}
            onChange={(e) => setFascia(e.target.value as FasciaOraria)}
          >
            {FASCE_ORARIE.map((f) => (
              <option key={f.v} value={f.v}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`accordo-prezzo-${requestId}`}>Compenso (€)</Label>
          <Input
            id={`accordo-prezzo-${requestId}`}
            inputMode="decimal"
            required
            placeholder="es. 800"
            value={prezzo}
            onChange={(e) => setPrezzo(e.target.value)}
          />
        </div>
      </div>
      <label className="flex items-start gap-2 text-xs leading-relaxed">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={consenso}
          onChange={(e) => setConsenso(e.target.checked)}
        />
        <span>
          Dichiaro di aver raggiunto questo accordo <strong>direttamente</strong> con l&apos;artista.
          L&apos;accordo è solo fra noi: N&apos;arte non è parte del contratto e non gestisce il
          pagamento. SIAE, agibilità, permessi e sicurezza dell&apos;evento restano a carico di chi
          organizza.
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
          Registra e invia all&apos;artista
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setAperto(false)}>
          Annulla
        </Button>
      </div>
      {error && (
        <p className="text-xs text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
