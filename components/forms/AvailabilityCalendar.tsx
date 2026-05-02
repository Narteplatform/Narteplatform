"use client";

import { useMemo, useState, useTransition } from "react";
import { DayPicker } from "react-day-picker";
import { it } from "date-fns/locale";
import "react-day-picker/style.css";
import { setAvailability, removeAvailability } from "@/app/(artist)/dashboard/_actions";

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

export function AvailabilityCalendar({
  artistId,
  initialBusy,
  pastBusy = [],
}: {
  artistId: string;
  initialBusy: string[];
  pastBusy?: string[];
}) {
  const [busy, setBusy] = useState<Set<string>>(new Set(initialBusy));
  const [pending, startTransition] = useTransition();

  const today = startOfToday();
  const pastBusySet = useMemo(() => new Set(pastBusy), [pastBusy]);

  function toggle(date: Date) {
    // Le date passate sono read-only (storico)
    if (date < today) return;
    const iso = toIsoDate(date);
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

  // Tutte le date occupate (inclusi futuri e passati)
  const busyDates = Array.from(busy).map((d) => new Date(d));
  // Date passate occupate (storico read-only — pallino rosso scuro)
  const pastBusyDates = Array.from(pastBusySet).map((d) => new Date(d));
  // Tutte le date passate (per disabilitarle e mostrare uno stato distinto)
  const isPast = (d: Date) => d < today;
  // Disponibili future (default green): tutto ciò che non è busy e non è passato
  const isAvailableFuture = (d: Date) => !isPast(d) && !busy.has(toIsoDate(d));

  const futureBusyCount = Array.from(busy).filter((d) => new Date(d) >= today).length;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-background p-4">
        <DayPicker
          mode="multiple"
          locale={it}
          weekStartsOn={1}
          selected={busyDates}
          onDayClick={toggle}
          modifiers={{
            busy: busyDates,
            pastBusy: pastBusyDates,
            availableFuture: isAvailableFuture,
            past: isPast,
          }}
          modifiersClassNames={{
            busy: "rdp-busy",
            pastBusy: "rdp-pastBusy",
            availableFuture: "rdp-available",
            past: "rdp-past",
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
        `}</style>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-green-600" /> Disponibile (default)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-red-600" /> Occupato — clicca per liberare
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-red-900" /> Date passate (storico)
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {pending ? "Salvataggio…" : `${futureBusyCount} date occupate nel futuro · ${pastBusy.length} date passate in storico`}
      </p>
    </div>
  );
}
