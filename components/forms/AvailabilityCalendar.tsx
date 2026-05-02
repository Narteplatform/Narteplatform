"use client";

import { useState, useTransition } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { setAvailability, removeAvailability } from "@/app/(artist)/dashboard/_actions";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AvailabilityCalendar({
  artistId,
  initialBusy,
}: {
  artistId: string;
  initialBusy: string[];
}) {
  const [busy, setBusy] = useState<Set<string>>(new Set(initialBusy));
  const [pending, startTransition] = useTransition();

  function toggle(date: Date) {
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

  const busyDates = Array.from(busy).map((d) => new Date(d));

  return (
    <div>
      <DayPicker
        mode="multiple"
        selected={busyDates}
        onDayClick={toggle}
        modifiers={{ busy: busyDates }}
        modifiersClassNames={{
          busy: "bg-foreground text-background",
        }}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        {pending ? "Salvataggio..." : `${busy.size} date occupate`}
      </p>
    </div>
  );
}
