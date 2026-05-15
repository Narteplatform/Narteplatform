"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { sendOffer } from "@/lib/chat/actions";

export function OfferDialog({
  open,
  onClose,
  bookingRequestId,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  bookingRequestId: string;
  defaults: { eventDate: string; timeSlot: string | null; budget: number | null };
}) {
  const [eventDate, setEventDate] = useState(defaults.eventDate);
  const [timeSlot, setTimeSlot] = useState(defaults.timeSlot ?? "");
  const [budget, setBudget] = useState(defaults.budget != null ? String(defaults.budget) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await sendOffer({
        booking_request_id: bookingRequestId,
        event_date: eventDate,
        time_slot: timeSlot.trim(),
        budget: Number(budget),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-notte/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-surface border border-border shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display text-lg text-notte">Invia offerta</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-muted"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={submit} className="px-5 py-5 space-y-4">
          <div>
            <Label htmlFor="offer-date">Data evento</Label>
            <Input
              id="offer-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="offer-slot">Fascia oraria</Label>
            <Input
              id="offer-slot"
              type="text"
              placeholder="Es. 22:00 - 00:30"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="offer-budget">Budget (€)</Label>
            <Input
              id="offer-budget"
              type="number"
              min={0}
              step={50}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Alla conferma dell&apos;altra parte la trattativa sarà chiusa e la data bloccata sui calendari.
          </p>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={busy}>
              Annulla
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Invia offerta"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
