"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Event = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  slug: string | null;
  cover: string | null;
  time: string | null;
};

const DOW = ["L", "M", "M", "G", "V", "S", "D"];

export function OrganizerCalendar({ events }: { events: Event[] }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const eventsByDate = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of events) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // lun=0…dom=6
  const firstDow = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();

  const cells: ({ d: number; date: string } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ d, date });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = cursor.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-display text-sm uppercase tracking-wider">{monthLabel}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
        {DOW.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="aspect-square" />;
          const evs = eventsByDate.get(c.date) ?? [];
          const isToday =
            c.date === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={i}
              className={
                "aspect-square rounded-md border p-1 text-left text-xs transition " +
                (evs.length > 0
                  ? "border-azzurro bg-azzurro/10 text-foreground"
                  : "border-border bg-surface text-muted-foreground")
              }
            >
              <div className="flex items-center justify-between">
                <span className={isToday ? "font-bold text-foreground" : ""}>{c.d}</span>
                {evs.length > 1 && (
                  <span className="rounded-full bg-foreground/10 px-1.5 text-[10px]">
                    {evs.length}
                  </span>
                )}
              </div>
              {evs[0] && (
                <p className="mt-1 line-clamp-2 break-words text-[10px] leading-tight">
                  {evs[0].title}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
