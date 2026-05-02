"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Clock } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addDefaultSlot, deleteDefaultSlot } from "@/app/(artist)/dashboard/_actions";
import { normalizeTime } from "@/lib/slots";

type Slot = {
  id: string;
  label: string | null;
  start_time: string;
  end_time: string;
};

export function DefaultSlotsEditor({
  artistId,
  slots,
}: {
  artistId: string;
  slots: Slot[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [startTime, setStartTime] = useState("21:00");
  const [endTime, setEndTime] = useState("23:30");
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    start(async () => {
      const res = await addDefaultSlot(artistId, {
        label: label || null,
        start_time: startTime,
        end_time: endTime,
      });
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      setLabel("");
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteDefaultSlot(artistId, id);
      if (!res.ok) setError(res.error ?? "Errore");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4 border border-border p-4">
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuno slot generale impostato. Aggiungine uno qui sotto.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {slots.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-3">
                <Clock className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {normalizeTime(s.start_time)} – {normalizeTime(s.end_time)}
                  </p>
                  {s.label && (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(s.id)}
                disabled={pending}
                aria-label="Rimuovi slot"
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="space-y-1">
          <Label className="text-[11px]">Etichetta (opzionale)</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Sera, Aperitivo…"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Inizio</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Fine</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="button" onClick={add} disabled={pending}>
            <Plus className="size-4" /> Aggiungi
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
