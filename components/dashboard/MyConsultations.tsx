"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { cancelConsultationAsArtist } from "@/app/(artist)/dashboard/consulenza/_actions";

export type MiaConsulenza = { id: string; slotAt: string | null; status: string };

const PREAVVISO_MS = 24 * 3600 * 1000;

/** Le consulenze prenotate dall'artista, con disdetta fino a 24 ore prima. */
export function MyConsultations({ consulenze }: { consulenze: MiaConsulenza[] }) {
  if (consulenze.length === 0) {
    return <p className="text-sm text-muted-foreground">Non hai consulenze in programma.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {consulenze.map((c) => (
        <Riga key={c.id} c={c} />
      ))}
    </ul>
  );
}

function Riga({ c }: { c: MiaConsulenza }) {
  const [pending, start] = useTransition();
  const [stato, setStato] = useState<"attiva" | "disdetta">("attiva");
  const [error, setError] = useState<string | null>(null);
  const quando = c.slotAt
    ? new Date(c.slotAt).toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" })
    : "Data da definire";
  const disdicibile = c.slotAt ? new Date(c.slotAt).getTime() - Date.now() >= PREAVVISO_MS : true;

  function onDisdici() {
    if (!window.confirm("Disdire questa consulenza? Lo slot tornerà disponibile.")) return;
    setError(null);
    start(async () => {
      const res = await cancelConsultationAsArtist(c.id);
      if (!res.ok) setError(res.error);
      else setStato("disdetta");
    });
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div>
        <p className="font-medium">{quando}</p>
        {stato === "disdetta" && <p className="text-xs text-muted-foreground">Disdetta.</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      {stato === "attiva" &&
        (disdicibile ? (
          <Button size="sm" variant="outline" onClick={onDisdici} disabled={pending}>
            {pending ? "Disdetta…" : "Disdici"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Meno di 24 ore: per disdire scrivi al team.
          </span>
        ))}
    </li>
  );
}
