"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { oggiRoma } from "@/lib/date/roma";

type Event = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  slug: string | null;
  cover: string | null;
  time: string | null;
  venue: string | null;
};

const DOW = ["L", "M", "M", "G", "V", "S", "D"];
// Nomi visibili nella cella: oltre, «+N» e il resto nella finestra del giorno.
const NOMI_IN_CELLA = 2;

export function OrganizerCalendar({ events }: { events: Event[] }) {
  const today = useMemo(() => new Date(), []);
  const oggi = useMemo(() => oggiRoma(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [giornoAperto, setGiornoAperto] = useState<string | null>(null);

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
  const eventiAperti = giornoAperto ? (eventsByDate.get(giornoAperto) ?? []) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Mese precedente"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-display text-sm">{monthLabel}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Mese successivo"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Contenitore scorrevole: sette colonne su uno schermo da 360px darebbero
          celle da circa 44px, dentro cui il numero del giorno e il titolo
          dell'evento non ci stanno. Con una larghezza minima le celle restano
          leggibili e, quando lo spazio manca, è il calendario a scorrere —
          non il testo a schiacciarsi. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="min-w-[19rem]">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
            {DOW.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="aspect-square" />;
          const evs = eventsByDate.get(c.date) ?? [];
          const isToday = c.date === oggi;
          const numero = (
            <div className="flex items-center justify-between">
              <span className={isToday ? "font-bold text-foreground" : ""}>{c.d}</span>
              {evs.length > 1 && (
                <span className="rounded-full bg-foreground/10 px-1.5 text-[10px]">
                  {evs.length}
                </span>
              )}
            </div>
          );
          if (evs.length === 0) {
            return (
              <div
                key={i}
                className="aspect-square rounded-md border border-border bg-surface p-1 text-left text-xs text-muted-foreground"
              >
                {numero}
              </div>
            );
          }
          const altri = evs.length - NOMI_IN_CELLA;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setGiornoAperto(c.date)}
              aria-label={`${formatGiorno(c.date)}: ${
                evs.length === 1 ? "1 artista prenotato" : `${evs.length} artisti prenotati`
              }`}
              className="flex aspect-square flex-col overflow-hidden rounded-md border border-azzurro bg-azzurro/10 p-1 text-left text-xs text-foreground transition hover:bg-azzurro/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro"
            >
              {numero}
              <ul className="mt-1 min-w-0 space-y-0.5 text-[10px] leading-tight">
                {evs.slice(0, NOMI_IN_CELLA).map((e) => (
                  <li key={e.id} className="truncate">
                    {e.title}
                  </li>
                ))}
                {altri > 0 && <li className="font-medium text-muted-foreground">+{altri} altri</li>}
              </ul>
            </button>
          );
        })}
          </div>
        </div>
      </div>

      <Dialog.Root open={giornoAperto !== null} onOpenChange={(o) => !o && setGiornoAperto(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
          {/* Su mobile sale dal basso, su schermi larghi è centrata. */}
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-xl border border-border bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="font-display text-xl first-letter:uppercase">
                  {giornoAperto ? formatGiorno(giornoAperto) : ""}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {eventiAperti.length === 1
                    ? "1 artista prenotato"
                    : `${eventiAperti.length} artisti prenotati`}
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Chiudi"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border hover:bg-muted"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>

            <ul className="mt-4 divide-y divide-border">
              {eventiAperti.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {e.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.cover} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    {e.slug ? (
                      <Link
                        href={`/artisti/${e.slug}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {e.title}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium">{e.title}</p>
                    )}
                    <p className="truncate text-xs text-muted-foreground first-letter:uppercase">
                      {[e.time, e.venue].filter(Boolean).join(" · ") || "Data confermata"}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/organizzatore/richieste/${e.id}`}>Dettagli</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/** «sabato 14 novembre 2026» da YYYY-MM-DD, senza passare dal fuso UTC. */
function formatGiorno(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
