"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { updateArtistStatus } from "@/app/(admin)/admin/artisti/_actions";

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  pending: "In attesa",
  approved: "Approvato",
  rejected: "Rifiutato",
};

const REASON_MIN = 10;

export function ArtistStatusToggle({
  artistId,
  status,
}: {
  artistId: string;
  status: Status;
}) {
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<Status | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function apply(s: Status, motivo?: string) {
    start(async () => {
      setError(null);
      const res = await updateArtistStatus(artistId, s, motivo);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTarget(null);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Stato:</span>
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === status ? "default" : "outline"}
            disabled={pending || s === status}
            onClick={() => {
              // Riportare un profilo in catalogo non è una restrizione: nessuna
              // motivazione. Ogni altro passaggio la richiede.
              if (s === "approved") apply(s);
              else {
                setTarget(s);
                setError(null);
              }
            }}
          >
            {STATUS_LABEL[s]}
          </Button>
        ))}
      </div>
      {target && (
        <div className="max-w-md space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">
            Passa a &laquo;{STATUS_LABEL[target]}&raquo;
          </p>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            disabled={pending}
            aria-label="Motivazione"
            placeholder="Motivazione (obbligatoria, almeno 10 caratteri)"
            className="min-h-0 text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            La motivazione viene inviata al proprietario del profilo per email, con il modo per
            contestare la decisione.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setTarget(null);
                setReason("");
                setError(null);
              }}
            >
              Annulla
            </Button>
            <Button
              size="sm"
              disabled={pending || reason.trim().length < REASON_MIN}
              onClick={() => apply(target, reason.trim())}
            >
              {pending ? "Salvo…" : "Conferma"}
            </Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
