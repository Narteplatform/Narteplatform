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
  // Confermare blocca la data nel calendario dell'artista: prima di farlo
  // l'organizzatore legge che l'accordo è solo fra le parti.
  const [confirming, setConfirming] = useState(false);

  if (status === "confermata" || status === "rifiutata" || status === "annullata") {
    return null;
  }

  if (confirming) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
        <p>
          Confermando dichiari di aver raggiunto un accordo <strong>direttamente</strong> con
          l&rsquo;artista. La data viene bloccata nel suo calendario.
        </p>
        <p className="text-muted-foreground">
          L&rsquo;accordo è solo fra voi: N&rsquo;arte non è parte del contratto e non gestisce il
          pagamento. SIAE, agibilità, permessi e sicurezza dell&rsquo;evento restano a carico di chi
          organizza.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await confirmBookingRequest(requestId);
                if (!r.ok) setError(r.error);
                setConfirming(false);
              })
            }
          >
            <CheckCircle2 className="size-4" /> Confermo l&rsquo;accordo
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
            Indietro
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(status === "in_trattativa" || status === "accettata") && (
          <Button size="sm" disabled={pending} onClick={() => setConfirming(true)}>
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
