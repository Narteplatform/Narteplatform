"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createSlot, toggleSlot, deleteSlot } from "@/app/(admin)/admin/consulenza/_actions";

type Slot = {
  id: string;
  slot_at: string;
  duration_min: number;
  is_active: boolean;
};

export function SlotsManager({ initial }: { initial: Slot[] }) {
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [datetime, setDatetime] = useState("");
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleAdd() {
    setError(null);
    if (!datetime) return setError("Seleziona data e ora.");
    const iso = new Date(datetime).toISOString();
    start(async () => {
      const res = await createSlot({ slotAt: iso, durationMin: duration });
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      setDatetime("");
      // Refresh: rely on revalidatePath; ottimistico: aggiungiamo localmente
      setSlots((s) =>
        [
          ...s,
          { id: crypto.randomUUID(), slot_at: iso, duration_min: duration, is_active: true },
        ].sort((a, b) => a.slot_at.localeCompare(b.slot_at))
      );
    });
  }

  function handleToggle(id: string, active: boolean) {
    start(async () => {
      const res = await toggleSlot(id, active);
      if (res.ok) {
        setSlots((s) => s.map((x) => (x.id === id ? { ...x, is_active: active } : x)));
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Eliminare definitivamente questo slot?")) return;
    start(async () => {
      const res = await deleteSlot(id);
      if (res.ok) setSlots((s) => s.filter((x) => x.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="rounded-lg border border-border bg-muted p-4">
        <h3 className="font-display text-base">Aggiungi slot</h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Data e ora
            </span>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Durata (min)
            </span>
            <input
              type="number"
              min={15}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-10 w-24 rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <Button
            type="button"
            variant="accent"
            size="md"
            onClick={handleAdd}
            disabled={pending}
          >
            <Plus className="size-4" /> Aggiungi
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* List */}
      <div>
        <h3 className="mb-3 font-display text-base">Slot esistenti ({slots.length})</h3>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuno slot.</p>
        ) : (
          <ul className="space-y-2">
            {slots.map((s) => {
              const dt = new Date(s.slot_at).toLocaleString("it-IT", {
                dateStyle: "full",
                timeStyle: "short",
              });
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{dt}</p>
                    <p className="text-xs text-muted-foreground">{s.duration_min} min</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={s.is_active}
                        onChange={(e) => handleToggle(s.id, e.target.checked)}
                        disabled={pending}
                      />
                      Attivo
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      disabled={pending}
                      className="inline-flex size-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                      aria-label="Elimina slot"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
