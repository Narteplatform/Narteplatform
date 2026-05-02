"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export function ArtistAvailability({
  availability,
}: {
  availability: { date: string; status: "available" | "busy" }[];
}) {
  const busyDates = availability
    .filter((a) => a.status === "busy")
    .map((a) => new Date(a.date));

  return (
    <div className="mt-4">
      <DayPicker
        mode="single"
        modifiers={{ busy: busyDates }}
        modifiersClassNames={{
          busy: "bg-foreground text-background line-through opacity-60",
        }}
        disabled={busyDates}
      />
      <div className="mt-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 border border-foreground" /> Libero
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 bg-foreground" /> Occupato
        </span>
      </div>
    </div>
  );
}
