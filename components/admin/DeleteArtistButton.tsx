"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteArtist } from "@/app/(admin)/admin/artisti/_actions";

export function DeleteArtistButton({
  artistId,
  artistName,
}: {
  artistId: string;
  artistName: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        const confirmed = window.confirm(
          `Sicuro di voler eliminare definitivamente "${artistName}"? L'azione non è reversibile.`
        );
        if (!confirmed) return;
        start(async () => {
          await deleteArtist(artistId);
        });
      }}
      className="border-red-500/50 text-red-600 hover:bg-red-500 hover:text-white"
    >
      {pending ? "Eliminazione..." : "Elimina"}
    </Button>
  );
}
