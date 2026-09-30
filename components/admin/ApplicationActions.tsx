"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { approveApplication, rejectApplication } from "@/app/(admin)/admin/artisti/_actions";

const REASON_MIN = 10;

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  if (rejecting) {
    return (
      <div className="flex w-72 max-w-full flex-col items-end gap-2">
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
          disabled={pending}
          aria-label="Motivazione del rifiuto"
          placeholder="Motivazione del rifiuto (obbligatoria, almeno 10 caratteri)"
          className="min-h-0 text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          La motivazione viene inviata al candidato per email, con il modo per contestare la decisione.
        </p>
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
                const res = await rejectApplication(applicationId, reason.trim());
                if (!res.ok) setError(res.error ?? "Errore");
                else router.refresh();
              })
            }
          >
            {pending ? "Invio…" : "Conferma rifiuto"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
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
              const res = await approveApplication(applicationId);
              if (!res.ok) setError(res.error ?? "Errore");
              else router.refresh();
            })
          }
        >
          Approva
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
          Rifiuta
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
