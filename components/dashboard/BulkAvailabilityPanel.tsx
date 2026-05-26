"use client";

import { useState, useTransition } from "react";
import { CalendarRange, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { bulkSetAvailability } from "@/app/(artist)/dashboard/_actions";

export type BulkDefaultSlot = {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
};

type Props = {
  artistId: string;
  defaultSlots: BulkDefaultSlot[];
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function BulkAvailabilityPanel({ artistId, defaultSlots }: Props) {
  const today = todayIso();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState<"available" | "busy">("available");
  const [slotIds, setSlotIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleSlot(id: string) {
    setSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllSlots() {
    setSlotIds(new Set(defaultSlots.map((s) => s.id)));
  }

  function clearSlots() {
    setSlotIds(new Set());
  }

  function apply() {
    setError(null);
    setDone(null);
    if (!from || !to) {
      setError("Imposta entrambe le date");
      return;
    }
    startTransition(async () => {
      const res = await bulkSetAvailability({
        artist_id: artistId,
        date_from: from,
        date_to: to,
        status,
        slot_ids: status === "available" ? Array.from(slotIds) : undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(`Aggiornati ${res.count} giorni.`);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <header className="mb-3 flex items-center gap-2">
        <CalendarRange className="size-4 text-azzurro" />
        <h3 className="font-display text-sm uppercase tracking-wide">Modifica in massa</h3>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Dal giorno</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>Al giorno</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatus("available")}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
            status === "available"
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          Disponibile
        </button>
        <button
          type="button"
          onClick={() => setStatus("busy")}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
            status === "busy"
              ? "border-red-600 bg-red-50 text-red-700"
              : "border-border bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          Occupato
        </button>
      </div>

      {status === "available" && defaultSlots.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <Label className="!mb-0">Slot da applicare (opzionale)</Label>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={selectAllSlots}>
                Tutti
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSlots}>
                Nessuno
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {defaultSlots.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={slotIds.has(s.id)}
                  onChange={() => toggleSlot(s.id)}
                  className="size-4 accent-azzurro"
                />
                <span className="flex-1 truncate">
                  <span className="font-medium">{s.label ?? "Slot"}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Se non spunti nessuno slot, applichiamo solo lo stato (verde/rosso) al giorno.
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {done && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" /> {done}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={apply} disabled={pending}>
          {pending ? "Applico…" : "Applica"}
        </Button>
      </div>
    </div>
  );
}
