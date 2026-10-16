"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import { updateArtistStatus } from "@/app/(admin)/admin/artisti/_actions";

const REASON_MIN = 10;

/** Approva o rifiuta un profilo in attesa, con `updateArtistStatus`. */
export function NewProfileActions({ artistId }: { artistId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  if (rejecting) {
    return (
      <div className="flex w-72 max-w-full flex-col items-end gap-2">
        <MotivazioneField
          compact
          label="Motivazione del rifiuto"
          disabled={pending}
          onChange={setReason}
          hint="La motivazione viene inviata al proprietario del profilo per email, con il modo per contestare la decisione."
          className="w-full"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setRejecting(false);
              setReason("");
              setError(null);
            }}
          >
            Annulla
          </Button>
          <Button
            size="sm"
            disabled={pending || reason.trim().length < REASON_MIN}
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await updateArtistStatus(artistId, "rejected", reason.trim());
                if (!res.ok) setError(res.error);
                else router.refresh();
              })
            }
          >
            {pending ? "Invio…" : "Conferma rifiuto"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await updateArtistStatus(artistId, "approved");
              if (!res.ok) setError(res.error);
              else router.refresh();
            })
          }
        >
          {pending ? "Approvo…" : "Approva"}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
          Rifiuta
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
