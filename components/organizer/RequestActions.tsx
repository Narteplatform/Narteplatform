"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { confirmBookingRequest, cancelBookingRequest } from "@/app/(organizer)/organizzatore/_actions";
import type { BookingStatus } from "@/lib/supabase/types";

export function RequestActions({
  requestId,
  status,
}: {
  requestId: string;
  status: BookingStatus;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "confermata" || status === "rifiutata" || status === "annullata") {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "in_trattativa" && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await confirmBookingRequest(requestId);
                if (!r.ok) setError(r.error);
              })
            }
          >
            <CheckCircle2 className="size-4" /> Conferma data
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await cancelBookingRequest(requestId);
              if (!r.ok) setError(r.error);
            })
          }
        >
          <X className="size-4" /> Annulla richiesta
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
