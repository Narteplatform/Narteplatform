"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  createSlotBatch,
  toggleSlot,
  deleteSlot,
} from "@/app/(admin)/admin/consulenza/_actions";

type Slot = {
  id: string;
  slot_at: string;
  duration_min: number;
  is_active: boolean;
};

const DEFAULT_HOURS = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];

export function ConsultantSlotsCalendar({
  consultantId,
  initial,
}: {
  consultantId: string;
  initial: Slot[];
}) {
  const [slots, setSlots] = useState<Slot[]>(initial);
  const today = new Date();
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [pickedHours, setPickedHours] = useState<Set<string>>(new Set());
  const [customHour, setCustomHour] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const daysInMonth = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const days: { date: Date; iso: string }[] = [];
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      days.push({ date: dt, iso: toLocalIsoDate(dt) });
    }
    return { first, last, days };
  }, [cursor]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const day = s.slot_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    }
    return map;
  }, [slots]);

  function prevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }

  function toggleHour(h: string) {
    setPickedHours((s) => {
      const next = new Set(s);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  function addCustomHour() {
    if (!/^\d{1,2}:\d{2}$/.test(customHour)) return;
    setPickedHours((s) => new Set(s).add(customHour));
    setCustomHour("");
  }

  function saveDay() {
    setError(null);
    if (!selectedDay) return;
    if (pickedHours.size === 0) return setError("Seleziona almeno un orario.");
    const isoDates = Array.from(pickedHours)
      .map((h) => {
        const [hh, mm] = h.split(":").map(Number);
        if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
        const [yyyy, mo, dd] = selectedDay.split("-").map(Number);
        return new Date(yyyy, mo - 1, dd, hh, mm, 0).toISOString();
      })
      .filter(Boolean) as string[];
    if (isoDates.length === 0) return setError("Orari non validi.");
    start(async () => {
      const res = await createSlotBatch({ consultantId, dates: isoDates, durationMin: duration });
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      // Aggiorna locale: aggiungi righe stub
      setSlots((cur) => {
        const next = [...cur];
        for (const iso of isoDates) {
          next.push({
            id: `tmp-${iso}`,
            slot_at: iso,
            duration_min: duration,
            is_active: true,
          });
        }
        return next.sort((a, b) => a.slot_at.localeCompare(b.slot_at));
      });
      setPickedHours(new Set());
    });
  }

  function handleToggle(id: string, active: boolean) {
    start(async () => {
      const res = await toggleSlot(id, active);
      if (res.ok) setSlots((s) => s.map((x) => (x.id === id ? { ...x, is_active: active } : x)));
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Eliminare definitivamente questo slot?")) return;
    start(async () => {
      const res = await deleteSlot(id);
      if (res.ok) setSlots((s) => s.filter((x) => x.id !== id));
    });
  }

  const monthLabel = cursor.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const selectedSlots = selectedDay ? slotsByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Calendar */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-display text-base capitalize">{monthLabel}</p>
          <button
            type="button"
            onClick={nextMonth}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted"
            aria-label="Mese successivo"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1">
          {(() => {
            const cells: React.ReactNode[] = [];
            const firstDow = (daysInMonth.first.getDay() + 6) % 7;
            for (let i = 0; i < firstDow; i++) cells.push(<div key={`pad-${i}`} />);
            for (const d of daysInMonth.days) {
              const isPast =
                d.date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const count = (slotsByDay.get(d.iso) ?? []).length;
              const isSelected = selectedDay === d.iso;
              cells.push(
                <button
                  key={d.iso}
                  type="button"
                  disabled={isPast}
                  onClick={() => {
                    setSelectedDay(d.iso);
                    setPickedHours(new Set());
                    setError(null);
                  }}
                  className={`relative aspect-square rounded-md text-sm transition ${
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : isPast
                      ? "cursor-not-allowed text-muted-foreground/40"
                      : "border border-transparent hover:border-accent hover:bg-muted"
                  }`}
                >
                  <span>{d.date.getDate()}</span>
                  {count > 0 && !isSelected && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 left-1/2 inline-block size-1.5 -translate-x-1/2 rounded-full bg-accent"
                    />
                  )}
                </button>
              );
            }
            return cells;
          })()}
        </div>
      </div>

      {/* Day editor */}
      <div className="rounded-xl border border-border bg-muted p-4">
        {!selectedDay ? (
          <p className="text-sm text-muted-foreground">
            Seleziona un giorno dal calendario per aggiungere o gestire slot.
          </p>
        ) : (
          <>
            <p className="font-display text-base">
              {new Date(selectedDay).toLocaleDateString("it-IT", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>

            {/* Existing slots */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Slot esistenti ({selectedSlots.length})
              </p>
              {selectedSlots.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Nessuno.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {selectedSlots
                    .sort((a, b) => a.slot_at.localeCompare(b.slot_at))
                    .map((s) => {
                      const time = new Date(s.slot_at).toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const isTmp = s.id.startsWith("tmp-");
                      return (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-2 rounded-md bg-background px-2.5 py-1.5 text-xs"
                        >
                          <span className="font-medium">
                            {time} ({s.duration_min}m)
                          </span>
                          {!isTmp && (
                            <div className="flex items-center gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-1.5">
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
                                className="text-red-600 hover:text-red-700"
                                aria-label="Elimina slot"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )}
                          {isTmp && (
                            <span className="text-[10px] text-muted-foreground">
                              In salvataggio…
                            </span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>

            {/* Add slots */}
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aggiungi nuovi slot
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {DEFAULT_HOURS.map((h) => {
                  const active = pickedHours.has(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => toggleHour(h)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        active
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-background hover:border-accent"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="time"
                  value={customHour}
                  onChange={(e) => setCustomHour(e.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                />
                <button
                  type="button"
                  onClick={addCustomHour}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:border-accent"
                >
                  <Plus className="size-3" /> Custom
                </button>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                  Durata
                </span>
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="h-9 w-20 rounded-md border border-border bg-background px-2 text-xs"
                />
                <span>min</span>
              </label>

              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={saveDay}
                disabled={pending || pickedHours.size === 0}
                className="mt-3 w-full"
              >
                {pending
                  ? "Salvataggio..."
                  : `Aggiungi ${pickedHours.size} ${pickedHours.size === 1 ? "slot" : "slot"}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function toLocalIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
