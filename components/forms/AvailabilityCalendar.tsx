"use client";

import { useMemo, useState, useTransition } from "react";
import { DayPicker } from "react-day-picker";
import { it } from "date-fns/locale";
import "react-day-picker/style.css";
import { Plus, Trash2, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  setAvailability,
  removeAvailability,
  addDateSlot,
  deleteDateSlot,
} from "@/app/(artist)/dashboard/_actions";
import { normalizeTime } from "@/lib/slots";

type DateSlot = {
  id: string;
  date: string;
  label: string | null;
  start_time: string;
  end_time: string;
};

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function formatHuman(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function AvailabilityCalendar({
  artistId,
  initialBusy,
  pastBusy = [],
  dateSlots: initialDateSlots = [],
}: {
  artistId: string;
  initialBusy: string[];
  pastBusy?: string[];
  dateSlots?: DateSlot[];
}) {
  const [busy, setBusy] = useState<Set<string>>(new Set(initialBusy));
  const [dateSlots, setDateSlots] = useState<DateSlot[]>(initialDateSlots);
  const [openIso, setOpenIso] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [slotError, setSlotError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("21:00");
  const [newEnd, setNewEnd] = useState("23:30");

  const today = startOfToday();
  const pastBusySet = useMemo(() => new Set(pastBusy), [pastBusy]);
  const datesWithSlots = useMemo(
    () => new Set(dateSlots.map((s) => s.date)),
    [dateSlots]
  );

  function onDayClick(date: Date) {
    if (date < today) return;
    setSlotError(null);
    setOpenIso(toIsoDate(date));
  }

  function close() {
    setOpenIso(null);
    setSlotError(null);
    setNewLabel("");
  }

  function toggleBusy() {
    if (!openIso) return;
    const iso = openIso;
    const next = new Set(busy);
    if (next.has(iso)) {
      next.delete(iso);
      startTransition(() => {
        removeAvailability(artistId, iso);
      });
    } else {
      next.add(iso);
      startTransition(() => {
        setAvailability(artistId, iso, "busy");
      });
    }
    setBusy(next);
  }

  function addSlot() {
    if (!openIso) return;
    setSlotError(null);
    const iso = openIso;
    startTransition(async () => {
      const res = await addDateSlot(artistId, {
        date: iso,
        label: newLabel || null,
        start_time: newStart,
        end_time: newEnd,
      });
      if (!res.ok) {
        setSlotError(res.error ?? "Errore");
        return;
      }
      // Optimistic local insert: id placeholder finché non refresh
      setDateSlots((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          date: iso,
          label: newLabel || null,
          start_time: newStart,
          end_time: newEnd,
        },
      ]);
      setNewLabel("");
    });
  }

  function removeSlot(id: string) {
    startTransition(async () => {
      const res = await deleteDateSlot(artistId, id);
      if (!res.ok) {
        setSlotError(res.error ?? "Errore");
        return;
      }
      setDateSlots((prev) => prev.filter((s) => s.id !== id));
    });
  }

  const busyDates = Array.from(busy).map((d) => new Date(d));
  const pastBusyDates = Array.from(pastBusySet).map((d) => new Date(d));
  const slotDates = Array.from(datesWithSlots).map((d) => new Date(d));
  const isPast = (d: Date) => d < today;
  const isAvailableFuture = (d: Date) => !isPast(d) && !busy.has(toIsoDate(d));

  const futureBusyCount = Array.from(busy).filter((d) => new Date(d) >= today).length;

  const slotsForOpenDate = openIso
    ? dateSlots.filter((s) => s.date === openIso)
    : [];
  const isOpenBusy = openIso ? busy.has(openIso) : false;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-background p-4">
        <DayPicker
          mode="multiple"
          locale={it}
          weekStartsOn={1}
          selected={busyDates}
          onDayClick={onDayClick}
          modifiers={{
            busy: busyDates,
            pastBusy: pastBusyDates,
            availableFuture: isAvailableFuture,
            past: isPast,
            hasSlots: slotDates,
          }}
          modifiersClassNames={{
            busy: "rdp-busy",
            pastBusy: "rdp-pastBusy",
            availableFuture: "rdp-available",
            past: "rdp-past",
            hasSlots: "rdp-hasSlots",
          }}
        />
        <style>{`
          .rdp-day { position: relative; }
          .rdp-available::after,
          .rdp-busy::after,
          .rdp-pastBusy::after {
            content: "";
            position: absolute;
            left: 50%;
            bottom: 4px;
            width: 6px;
            height: 6px;
            border-radius: 9999px;
            transform: translateX(-50%);
            pointer-events: none;
          }
          .rdp-available::after { background-color: #16a34a; }
          .rdp-busy::after { background-color: #dc2626; }
          .rdp-pastBusy::after { background-color: #991b1b; }
          .rdp-busy {
            background-color: rgba(220, 38, 38, 0.10) !important;
            color: #991b1b !important;
            font-weight: 600;
          }
          .rdp-pastBusy {
            background-color: rgba(120, 113, 108, 0.10) !important;
            color: #6b7280 !important;
            text-decoration: line-through;
          }
          .rdp-past {
            color: #9ca3af;
            cursor: default;
          }
          .rdp-past:not(.rdp-pastBusy) { opacity: 0.55; }
          .rdp-available:hover {
            background-color: rgba(22, 163, 74, 0.14) !important;
          }
          .rdp-hasSlots {
            box-shadow: inset 0 0 0 1px #1A6BAD;
          }
        `}</style>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-green-600" /> Disponibile
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-red-600" /> Occupato
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-red-900" /> Storico
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 border border-[#1A6BAD]" /> Slot specifici impostati
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {pending ? "Salvataggio…" : `${futureBusyCount} date occupate · ${pastBusy.length} in storico · ${dateSlots.length} slot specifici`}
      </p>

      {openIso && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <button type="button" aria-label="Chiudi" className="absolute inset-0" onClick={close} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto bg-background p-6 shadow-2xl sm:rounded-lg">
            <button
              type="button"
              onClick={close}
              aria-label="Chiudi"
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <p className="accent-label">{isOpenBusy ? "occupato" : "disponibile"}</p>
            <h3 className="mt-1 font-display text-2xl uppercase">{formatHuman(openIso)}</h3>

            <div className="mt-5 space-y-3">
              <Button
                type="button"
                variant={isOpenBusy ? "outline" : "default"}
                onClick={toggleBusy}
                disabled={pending}
              >
                {isOpenBusy ? "Rendi disponibile" : "Segna come occupato"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Se occupato, gli utenti non vedranno slot orari per questo giorno.
              </p>
            </div>

            {!isOpenBusy && (
              <div className="mt-6 space-y-4 border-t border-border pt-5">
                <header>
                  <h4 className="font-display text-base uppercase">Slot orari specifici</h4>
                  <p className="text-xs text-muted-foreground">
                    Se aggiungi slot qui, questi <strong>sostituiscono</strong> gli slot
                    generali per questo giorno. Se non aggiungi nulla, valgono i generali.
                  </p>
                </header>

                {slotsForOpenDate.length > 0 && (
                  <ul className="divide-y divide-border">
                    {slotsForOpenDate.map((s) => (
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
                          onClick={() => removeSlot(s.id)}
                          disabled={pending || s.id.startsWith("tmp-")}
                          aria-label="Rimuovi slot"
                          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Etichetta</Label>
                    <Input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="opzionale"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Inizio</Label>
                    <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Fine</Label>
                    <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addSlot} disabled={pending}>
                      <Plus className="size-4" /> Aggiungi
                    </Button>
                  </div>
                </div>
                {slotError && <p className="text-sm text-red-600">{slotError}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
