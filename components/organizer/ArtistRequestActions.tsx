"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Input";
import {
  artistAcceptRequest,
  artistDeclineRequest,
} from "@/app/(organizer)/organizzatore/_actions";
import type { BookingStatus } from "@/lib/supabase/types";

export function ArtistRequestActions({
  requestId,
  status,
}: {
  requestId: string;
  status: BookingStatus;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  if (status !== "pending") return null;

  return (
    <div className="space-y-2">
      {showNotes && (
        <div className="space-y-1">
          <Label htmlFor={`notes-${requestId}`}>Note / controproposta (opzionale)</Label>
          <Textarea
            id={`notes-${requestId}`}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Es. orario diverso, fee proposta, condizioni…"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!showNotes) {
              setShowNotes(true);
              return;
            }
            start(async () => {
              setError(null);
              const r = await artistAcceptRequest(requestId, notes);
              if (!r.ok) setError(r.error);
            });
          }}
        >
          <CheckCircle2 className="size-4" />{" "}
          {showNotes ? "Conferma accettazione" : "Accetta proposta"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await artistDeclineRequest(requestId);
              if (!r.ok) setError(r.error);
            })
          }
        >
          <X className="size-4" /> Rifiuta
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
