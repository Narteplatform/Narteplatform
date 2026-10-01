"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import { deleteArtist } from "@/app/(admin)/admin/artisti/_actions";

const REASON_MIN = 10;

export function DeleteArtistButton({
  artistId,
  artistName,
}: {
  artistId: string;
  artistName: string;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-500/50 text-red-600 hover:bg-red-500 hover:text-white"
      >
        Elimina
      </Button>
    );
  }

  return (
    <div className="w-80 max-w-full space-y-2 rounded-lg border border-red-200 p-3">
      <p className="text-sm font-semibold">Eliminare definitivamente &laquo;{artistName}&raquo;?</p>
      <p className="text-[11px] text-muted-foreground">L&apos;azione non è reversibile.</p>
      <MotivazioneField
        compact
        label="Motivazione dell'eliminazione"
        disabled={pending}
        onChange={setReason}
        hint="La motivazione viene inviata al proprietario del profilo per email, con il modo per contestare la decisione."
      />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(null);
          }}
        >
          Annulla
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || reason.trim().length < REASON_MIN}
          className="bg-red-600 text-white hover:bg-red-700"
          onClick={() =>
            start(async () => {
              setError(null);
              // In caso di successo l'azione fa redirect; torna qui solo con un errore.
              const res = await deleteArtist(artistId, reason.trim());
              if (res && !res.ok) setError(res.error);
            })
          }
        >
          {pending ? "Eliminazione..." : "Elimina definitivamente"}
        </Button>
      </div>
    </div>
  );
}
