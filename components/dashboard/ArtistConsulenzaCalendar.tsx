"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { bookConsultationAsArtist } from "@/app/(artist)/dashboard/consulenza/_actions";

export type CalendarConsultant = {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export type CalendarSlot = {
  id: string;
  slot_at: string;
  duration_min: number;
  consultant_id: string;
  is_booked: boolean;
};

export function ArtistConsulenzaCalendar({
  consultants,
  slots,
}: {
  consultants: CalendarConsultant[];
  slots: CalendarSlot[];
}) {
  const today = new Date();
  const [cursor, setCursor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [needs, setNeeds] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [successFor, setSuccessFor] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const consultantById = useMemo(() => {
    const m = new Map<string, CalendarConsultant>();
    for (const c of consultants) m.set(c.id, c);
    return m;
  }, [consultants]);

  // Mappa giorno → {free, booked}
  const dayStats = useMemo(() => {
    const map = new Map<string, { free: number; booked: number }>();
    for (const s of slots) {
      const day = s.slot_at.slice(0, 10);
      const cur = map.get(day) ?? { free: 0, booked: 0 };
      const bookedNow = bookedIds.has(s.id) || s.is_booked;
      if (bookedNow) cur.booked += 1;
      else cur.free += 1;
      map.set(day, cur);
    }
    return map;
  }, [slots, bookedIds]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, CalendarSlot[]>();
    for (const s of slots) {
      const day = s.slot_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.slot_at.localeCompare(b.slot_at));
    }
    return map;
  }, [slots]);

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

  function prevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }

  function confirmBooking() {
    if (!selectedSlot) return;
    setError(null);
    start(async () => {
      const res = await bookConsultationAsArtist({ slotId: selectedSlot, needs });
      if (!res.ok) {
        setError(res.error ?? "Errore");
        return;
      }
      setBookedIds((s) => new Set(s).add(selectedSlot));
      setSuccessFor(selectedSlot);
      setSelectedSlot(null);
      setNeeds("");
    });
  }

  const monthLabel = cursor.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const todayIso = toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  return (
    <>
      {successFor && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold">Appuntamento confermato!</p>
            <p className="mt-0.5 text-muted-foreground">
              Riceverai una email di conferma. Il consulente ti contatterà al telefono nello slot scelto.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* CALENDAR */}
        <div className="rounded-2xl border border-border bg-background p-5 md:p-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="inline-flex size-9 items-center justify-center rounded-md border border-border hover:bg-muted"
              aria-label="Mese precedente"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="font-display text-lg capitalize">{monthLabel}</p>
            <button
              type="button"
              onClick={nextMonth}
              className="inline-flex size-9 items-center justify-center rounded-md border border-border hover:bg-muted"
              aria-label="Mese successivo"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Contenitore scorrevole: a 360px sette colonne producono celle da
              ~44px, sotto la soglia comoda per il dito e troppo strette per il
              contenuto. Meglio far scorrere il calendario che comprimerlo. */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="min-w-[19rem]">
  <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {(() => {
              const cells: React.ReactNode[] = [];
              const firstDow = (daysInMonth.first.getDay() + 6) % 7;
              for (let i = 0; i < firstDow; i++) cells.push(<div key={`pad-${i}`} />);
              for (const d of daysInMonth.days) {
                const isPast = d.iso < todayIso;
                const stats = dayStats.get(d.iso);
                const hasAny = !!stats;
                const hasFree = (stats?.free ?? 0) > 0;
                const allBooked = hasAny && !hasFree;
                const isSelected = selectedDay === d.iso;
                cells.push(
                  <button
                    key={d.iso}
                    type="button"
                    disabled={isPast || !hasAny}
                    onClick={() => {
                      if (!hasFree) return;
                      setSelectedDay(d.iso);
                      setError(null);
                    }}
                    aria-label={
                      hasFree
                        ? `${d.date.getDate()} - ${stats!.free} slot disponibili`
                        : allBooked
                        ? `${d.date.getDate()} - tutti gli slot occupati`
                        : `${d.date.getDate()} - nessuno slot`
                    }
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : isPast
                        ? "cursor-not-allowed text-muted-foreground/40"
                        : hasFree
                        ? "border border-transparent hover:border-accent hover:bg-muted"
                        : "cursor-not-allowed text-muted-foreground/60"
                    }`}
                  >
                    <span>{d.date.getDate()}</span>
                    {hasAny && (
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 inline-block size-2 rounded-full ${
                          isSelected
                            ? "bg-white"
                            : hasFree
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                    )}
                  </button>
                );
              }
              return cells;
            })()}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-green-500" /> Slot disponibili
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-red-500" /> Tutti occupati
            </span>
          </div>
        </div>

        {/* DAY DETAIL */}
        <div className="rounded-2xl border border-border bg-muted p-5 md:p-6">
          {!selectedDay ? (
            <div className="text-sm text-muted-foreground">
              <p>Seleziona un giorno con <strong className="text-green-600">pallino verde</strong> per vedere gli slot disponibili e prenotare.</p>
              <p className="mt-3">
                Gli orari sono raggruppati per consulente. Cliccando su uno slot la prenotazione
                viene <strong>confermata automaticamente</strong>.
              </p>
            </div>
          ) : (
            <DayPanel
              dayIso={selectedDay}
              slots={(slotsByDay.get(selectedDay) ?? []).filter(
                (s) => !s.is_booked && !bookedIds.has(s.id)
              )}
              consultantById={consultantById}
              onPickSlot={setSelectedSlot}
            />
          )}
        </div>
      </div>

      {selectedSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !pending && setSelectedSlot(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const slot = slots.find((s) => s.id === selectedSlot);
              const c = slot ? consultantById.get(slot.consultant_id) : null;
              const when = slot
                ? new Date(slot.slot_at).toLocaleString("it-IT", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })
                : "";
              return (
                <>
                  <h3 className="font-display text-xl">
                    Conferma appuntamento
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Con <strong className="text-foreground">{c?.name ?? "Consulente"}</strong> · {when}
                  </p>
                  <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cosa vorresti discutere? (opzionale)
                  </label>
                  <textarea
                    value={needs}
                    onChange={(e) => setNeeds(e.target.value)}
                    rows={4}
                    placeholder="Es: vorrei capire come migliorare il mio EPK e ottenere più date…"
                    className="mt-1 w-full resize-y rounded-md border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/30"
                  />
                  {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                  <div className="mt-5 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setSelectedSlot(null)}
                    >
                      Annulla
                    </Button>
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      disabled={pending}
                      onClick={confirmBooking}
                    >
                      {pending ? "Conferma..." : "Conferma appuntamento"}
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

function DayPanel({
  dayIso,
  slots,
  consultantById,
  onPickSlot,
}: {
  dayIso: string;
  slots: CalendarSlot[];
  consultantById: Map<string, CalendarConsultant>;
  onPickSlot: (id: string) => void;
}) {
  const dayLabel = new Date(dayIso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Raggruppa per consulente
  const byConsultant = new Map<string, CalendarSlot[]>();
  for (const s of slots) {
    if (!byConsultant.has(s.consultant_id)) byConsultant.set(s.consultant_id, []);
    byConsultant.get(s.consultant_id)!.push(s);
  }

  return (
    <div>
      <p className="font-display text-base capitalize">{dayLabel}</p>
      {slots.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nessuno slot disponibile per questo giorno.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {Array.from(byConsultant.entries()).map(([cid, list]) => {
            const c = consultantById.get(cid);
            if (!c) return null;
            return (
              <div key={cid} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <Avatar src={c.avatar_url} name={c.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm">{c.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {c.role ?? "Consulente"}
                    </p>
                    {c.bio && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{c.bio}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {list.map((s) => {
                    const time = new Date(s.slot_at).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onPickSlot(s.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs transition hover:border-accent hover:bg-accent hover:text-accent-foreground"
                      >
                        <Phone className="size-3" />
                        {time} ({s.duration_min}m)
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function toLocalIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
