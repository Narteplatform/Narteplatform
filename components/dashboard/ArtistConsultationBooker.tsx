"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { bookConsultationAsArtist } from "@/app/(artist)/dashboard/consulenza/_actions";

export type ConsultantWithSlots = {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
  slots: { id: string; slot_at: string; duration_min: number }[];
};

export function ArtistConsultationBooker({ consultants }: { consultants: ConsultantWithSlots[] }) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedConsultantName, setSelectedConsultantName] = useState<string>("");
  const [needs, setNeeds] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [successFor, setSuccessFor] = useState<string | null>(null);

  function openBooking(slotId: string, consultantName: string) {
    setSelectedSlot(slotId);
    setSelectedConsultantName(consultantName);
    setNeeds("");
    setError(null);
  }

  function confirm() {
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
    });
  }

  if (consultants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nessun consulente con slot disponibili al momento. Riprova più tardi.
        </p>
      </div>
    );
  }

  return (
    <>
      {successFor && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold">Appuntamento confermato!</p>
            <p className="mt-0.5 text-muted-foreground">
              Riceverai una email di conferma. Il consulente ti contatterà al telefono.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {consultants.map((c) => {
          const slotsByDate = new Map<string, typeof c.slots>();
          for (const s of c.slots) {
            const date = new Date(s.slot_at).toLocaleDateString("it-IT", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            });
            if (!slotsByDate.has(date)) slotsByDate.set(date, []);
            slotsByDate.get(date)!.push(s);
          }
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-background p-5 md:p-6">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar src={c.avatar_url} name={c.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg md:text-xl">{c.name}</h3>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {c.role ?? "Consulente N'arte"}
                  </p>
                  {c.bio && <p className="mt-2 text-sm text-muted-foreground">{c.bio}</p>}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {Array.from(slotsByDate.entries()).map(([date, list]) => (
                  <div key={date}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {date}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {list.map((s) => {
                        const time = new Date(s.slot_at).toLocaleTimeString("it-IT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const booked = bookedIds.has(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={booked}
                            onClick={() => openBooking(s.id, c.name)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${
                              booked
                                ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                                : "border-border bg-muted hover:border-accent hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            <Phone className="size-3.5" />
                            {time} ({s.duration_min}m)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
            <h3 className="font-display text-xl uppercase tracking-tight">
              Conferma appuntamento
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Con {selectedConsultantName}. L&apos;appuntamento sarà confermato automaticamente.
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
                onClick={confirm}
              >
                {pending ? "Conferma..." : "Conferma appuntamento"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
