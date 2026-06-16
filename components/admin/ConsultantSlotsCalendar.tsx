"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Trash2, Plus, CalendarRange, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  createSlotBatch,
  createSlotBatchMulti,
  toggleSlot,
  deleteSlot,
  toggleSlotBatch,
  deleteSlotBatch,
} from "@/app/(admin)/admin/consulenza/_actions";

type Slot = {
  id: string;
  slot_at: string;
  duration_min: number;
  is_active: boolean;
};

type Mode = "single" | "multi";

const DEFAULT_HOURS = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

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
  const [mode, setMode] = useState<Mode>("single");

  // single-day state
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // multi-day state
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [weekdayFilter, setWeekdayFilter] = useState<Set<number>>(new Set());

  // shared editor state
  const [duration, setDuration] = useState(30);
  const [pickedHours, setPickedHours] = useState<Set<string>>(new Set());
  const [customHour, setCustomHour] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setPickedHours(new Set());
    if (next === "single") setSelectedDays(new Set());
    else setSelectedDay(null);
  }

  function toggleHour(h: string) {
    setPickedHours((s) => {
      const n = new Set(s);
      if (n.has(h)) n.delete(h);
      else n.add(h);
      return n;
    });
  }

  function addCustomHour() {
    if (!/^\d{1,2}:\d{2}$/.test(customHour)) return;
    setPickedHours((s) => new Set(s).add(customHour));
    setCustomHour("");
  }

  // ---- single-day: salva ----
  function saveDay() {
    setError(null);
    setInfo(null);
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
      setSlots((cur) => {
        const next = [...cur];
        for (const iso of isoDates) {
          if (next.some((x) => x.slot_at === iso)) continue;
          next.push({ id: `tmp-${iso}`, slot_at: iso, duration_min: duration, is_active: true });
        }
        return next.sort((a, b) => a.slot_at.localeCompare(b.slot_at));
      });
      setPickedHours(new Set());
      setInfo(`${res.count ?? 0} slot aggiunti.`);
    });
  }

  // ---- multi-day: salva su tutti i giorni selezionati ----
  function toggleDayInSelection(iso: string) {
    setSelectedDays((s) => {
      const n = new Set(s);
      if (n.has(iso)) n.delete(iso);
      else n.add(iso);
      return n;
    });
  }

  function applyWeekdayFilter() {
    // Aggiunge alla selezione tutti i giorni futuri del mese che corrispondono ai weekday scelti.
    if (weekdayFilter.size === 0) return setError("Seleziona almeno un giorno della settimana.");
    setError(null);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setSelectedDays((s) => {
      const n = new Set(s);
      for (const d of daysInMonth.days) {
        if (d.date < todayMidnight) continue;
        const dow = (d.date.getDay() + 6) % 7; // 0=Lun
        if (weekdayFilter.has(dow)) n.add(d.iso);
      }
      return n;
    });
  }

  function toggleWeekday(dow: number) {
    setWeekdayFilter((s) => {
      const n = new Set(s);
      if (n.has(dow)) n.delete(dow);
      else n.add(dow);
      return n;
    });
  }

  function saveMulti() {
    setError(null);
    setInfo(null);
    if (selectedDays.size === 0) return setError("Seleziona almeno un giorno.");
    if (pickedHours.size === 0) return setError("Seleziona almeno un orario.");
    const days = Array.from(selectedDays);
    const hours = Array.from(pickedHours);
    start(async () => {
      const res = await createSlotBatchMulti({ consultantId, days, hours, durationMin: duration });
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      // Aggiorna locale: stub per ogni combinazione giorno×ora non già presente.
      setSlots((cur) => {
        const next = [...cur];
        for (const day of days) {
          const [yyyy, mo, dd] = day.split("-").map(Number);
          for (const h of hours) {
            const [hh, mm] = h.split(":").map(Number);
            if ([yyyy, mo, dd, hh, mm].some((nn) => Number.isNaN(nn))) continue;
            const iso = new Date(yyyy, mo - 1, dd, hh, mm, 0).toISOString();
            if (next.some((x) => x.slot_at === iso)) continue;
            next.push({ id: `tmp-${iso}`, slot_at: iso, duration_min: duration, is_active: true });
          }
        }
        return next.sort((a, b) => a.slot_at.localeCompare(b.slot_at));
      });
      setInfo(`${res.count ?? 0} slot aggiunti su ${days.length} giorni.`);
      setPickedHours(new Set());
    });
  }

  // ---- azioni su singolo slot ----
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

  // ---- azioni bulk sul giorno selezionato (#9) ----
  function persistedIdsForDay(dayIso: string): string[] {
    return (slotsByDay.get(dayIso) ?? [])
      .filter((s) => !s.id.startsWith("tmp-"))
      .map((s) => s.id);
  }

  function handleBulkToggleDay(dayIso: string, active: boolean) {
    const ids = persistedIdsForDay(dayIso);
    if (ids.length === 0) return;
    start(async () => {
      const res = await toggleSlotBatch(ids, active);
      if (res.ok) {
        const idSet = new Set(ids);
        setSlots((s) => s.map((x) => (idSet.has(x.id) ? { ...x, is_active: active } : x)));
      } else setError(res.error ?? "Errore");
    });
  }

  function handleBulkDeleteDay(dayIso: string) {
    const ids = persistedIdsForDay(dayIso);
    if (ids.length === 0) return;
    if (!window.confirm(`Eliminare definitivamente tutti gli slot (${ids.length}) di questo giorno?`)) return;
    start(async () => {
      const res = await deleteSlotBatch(ids);
      if (res.ok) {
        const idSet = new Set(ids);
        setSlots((s) => s.filter((x) => !idSet.has(x.id)));
      } else setError(res.error ?? "Errore");
    });
  }

  const monthLabel = cursor.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const selectedSlots = selectedDay ? slotsByDay.get(selectedDay) ?? [] : [];
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="space-y-4">
      {/* Switch modalità */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => switchMode("single")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
            mode === "single"
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-background hover:border-accent"
          }`}
        >
          <CalendarDays className="size-3.5" /> Giorno singolo
        </button>
        <button
          type="button"
          onClick={() => switchMode("multi")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
            mode === "multi"
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-background hover:border-accent"
          }`}
        >
          <CalendarRange className="size-3.5" /> Più giorni (massivo)
        </button>
      </div>

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
            {WEEKDAY_LABELS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {(() => {
              const cells: React.ReactNode[] = [];
              const firstDow = (daysInMonth.first.getDay() + 6) % 7;
              for (let i = 0; i < firstDow; i++) cells.push(<div key={`pad-${i}`} />);
              for (const d of daysInMonth.days) {
                const isPast = d.date < todayMidnight;
                const count = (slotsByDay.get(d.iso) ?? []).length;
                const isSelectedSingle = mode === "single" && selectedDay === d.iso;
                const isSelectedMulti = mode === "multi" && selectedDays.has(d.iso);
                const isSelected = isSelectedSingle || isSelectedMulti;
                cells.push(
                  <button
                    key={d.iso}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      setError(null);
                      setInfo(null);
                      if (mode === "single") {
                        setSelectedDay(d.iso);
                        setPickedHours(new Set());
                      } else {
                        toggleDayInSelection(d.iso);
                      }
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

          {mode === "multi" && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Selezione rapida per giorno della settimana
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((lbl, idx) => {
                  const active = weekdayFilter.has(idx);
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => toggleWeekday(idx)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        active
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-background hover:border-accent"
                      }`}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={applyWeekdayFilter}>
                  Aggiungi al mese corrente
                </Button>
                {selectedDays.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDays(new Set())}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Azzera selezione ({selectedDays.size})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="rounded-xl border border-border bg-muted p-4">
          {mode === "single" ? (
            !selectedDay ? (
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Slot esistenti ({selectedSlots.length})
                    </p>
                    {/* #9 — Azioni bulk sul giorno */}
                    {persistedIdsForDay(selectedDay).length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleBulkToggleDay(selectedDay, true)}
                          disabled={pending}
                          className="rounded-md border border-border bg-background px-2 py-1 text-[10px] hover:border-accent"
                        >
                          Attiva tutti
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkToggleDay(selectedDay, false)}
                          disabled={pending}
                          className="rounded-md border border-border bg-background px-2 py-1 text-[10px] hover:border-accent"
                        >
                          Disattiva tutti
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkDeleteDay(selectedDay)}
                          disabled={pending}
                          className="rounded-md border border-red-500/50 px-2 py-1 text-[10px] text-red-600 hover:bg-red-500 hover:text-white"
                        >
                          Elimina tutti
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedSlots.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Nessuno.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {selectedSlots
                        .slice()
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
                  <HoursPicker
                    pickedHours={pickedHours}
                    onToggleHour={toggleHour}
                    customHour={customHour}
                    onCustomHourChange={setCustomHour}
                    onAddCustomHour={addCustomHour}
                    duration={duration}
                    onDurationChange={setDuration}
                  />
                  {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                  {info && <p className="mt-2 text-xs text-green-600">{info}</p>}
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={saveDay}
                    disabled={pending || pickedHours.size === 0}
                    className="mt-3 w-full"
                  >
                    {pending ? "Salvataggio..." : `Aggiungi ${pickedHours.size} slot`}
                  </Button>
                </div>
              </>
            )
          ) : (
            // ---- MULTI MODE ----
            <>
              <p className="font-display text-base">Modifica massiva</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Seleziona più giorni sul calendario (o usa la selezione rapida), scegli gli orari e
                la durata: lo stesso template verrà applicato a tutti i giorni.
              </p>

              <div className="mt-3 rounded-md border border-border bg-background p-2.5 text-xs">
                <span className="font-semibold">{selectedDays.size}</span> giorni selezionati
                {selectedDays.size > 0 && (
                  <span className="text-muted-foreground">
                    {" · "}
                    {Array.from(selectedDays)
                      .sort()
                      .slice(0, 6)
                      .map((d) => d.slice(8, 10))
                      .join(", ")}
                    {selectedDays.size > 6 ? "…" : ""}
                  </span>
                )}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <HoursPicker
                  pickedHours={pickedHours}
                  onToggleHour={toggleHour}
                  customHour={customHour}
                  onCustomHourChange={setCustomHour}
                  onAddCustomHour={addCustomHour}
                  duration={duration}
                  onDurationChange={setDuration}
                />
                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                {info && <p className="mt-2 text-xs text-green-600">{info}</p>}
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={saveMulti}
                  disabled={pending || selectedDays.size === 0 || pickedHours.size === 0}
                  className="mt-3 w-full"
                >
                  {pending
                    ? "Salvataggio..."
                    : `Applica ${pickedHours.size} orari × ${selectedDays.size} giorni`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HoursPicker({
  pickedHours,
  onToggleHour,
  customHour,
  onCustomHourChange,
  onAddCustomHour,
  duration,
  onDurationChange,
}: {
  pickedHours: Set<string>;
  onToggleHour: (h: string) => void;
  customHour: string;
  onCustomHourChange: (v: string) => void;
  onAddCustomHour: () => void;
  duration: number;
  onDurationChange: (v: number) => void;
}) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Orari (template)
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {DEFAULT_HOURS.map((h) => {
          const active = pickedHours.has(h);
          return (
            <button
              key={h}
              type="button"
              onClick={() => onToggleHour(h)}
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
          onChange={(e) => onCustomHourChange(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-xs"
        />
        <button
          type="button"
          onClick={onAddCustomHour}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:border-accent"
        >
          <Plus className="size-3" /> Custom
        </button>
      </div>

      {pickedHours.size > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Array.from(pickedHours)
            .sort()
            .map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onToggleHour(h)}
                className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent"
                aria-label={`Rimuovi ${h}`}
              >
                {h} ✕
              </button>
            ))}
        </div>
      )}

      <label className="mt-3 flex items-center gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">Durata</span>
        <input
          type="number"
          min={15}
          max={180}
          value={duration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="h-9 w-20 rounded-md border border-border bg-background px-2 text-xs"
        />
        <span>min</span>
      </label>
    </>
  );
}

function toLocalIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
