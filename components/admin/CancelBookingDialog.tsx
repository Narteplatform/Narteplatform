"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { cancelConfirmedBooking } from "@/app/(admin)/admin/artisti/_actions";

type Props = {
  bookingId: string;
  artistName: string;
  organizerName: string;
  eventDate: string;
};

export function CancelBookingDialog({ bookingId, artistName, organizerName, eventDate }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    if (reason.trim().length < 10) {
      setError("La motivazione deve avere almeno 10 caratteri.");
      return;
    }
    start(async () => {
      const res = await cancelConfirmedBooking({ bookingId, reason: reason.trim() });
      if (!res.ok) {
        setError(res.error ?? "Errore durante l'annullamento");
        return;
      }
      setOpen(false);
      setReason("");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-500/50 text-red-600 hover:bg-red-500 hover:text-white"
      >
        Annulla
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-booking-title"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cancel-booking-title" className="font-display text-lg tracking-tight">
              Annulla data confermata
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {artistName} · {organizerName} · {eventDate}
            </p>
            <p className="mt-4 text-sm">
              Stai per annullare definitivamente questa data confermata. L&apos;artista e
              l&apos;organizzatore riceveranno una email con la motivazione e la disponibilità
              dell&apos;artista verrà liberata.
            </p>
            <label
              htmlFor="cancel-reason"
              className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Motivazione (min 10 caratteri) *
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={pending}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro"
              placeholder="Es: richiesta organizzatore, indisponibilità sopravvenuta artista, ecc."
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  setReason("");
                  setError(null);
                }}
              >
                Indietro
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={submit}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {pending ? "Annullamento..." : "Conferma annullamento"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
