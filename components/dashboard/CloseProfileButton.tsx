"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chiudiProfilo } from "@/app/(artist)/dashboard/profili/_actions";
import { Button } from "@/components/ui/Button";

export function CloseProfileButton({ artistId, stageName }: { artistId: string; stageName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    start(async () => {
      const res = await chiudiProfilo(artistId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Chiudi questo profilo
      </Button>
    );
  }

  return (
    <div className="w-full basis-full space-y-2 rounded-md border border-border p-3 text-sm" role="alert">
      <p>
        Chiudere il profilo &laquo;{stageName}&raquo; lo toglie dal catalogo pubblico. I contenuti non
        vengono cancellati. Vuoi continuare?
      </p>
      {error && <p className="text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onConfirm} disabled={pending}>
          {pending ? "Chiusura…" : "Sì, chiudi il profilo"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Annulla
        </Button>
      </div>
    </div>
  );
}
