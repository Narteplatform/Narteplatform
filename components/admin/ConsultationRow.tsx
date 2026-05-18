"use client";

import { useState, useTransition } from "react";
import {
  updateConsultationStatus,
  updateConsultationNotes,
} from "@/app/(admin)/admin/consulenza/_actions";

type Status = "requested" | "confirmed" | "completed" | "cancelled";

export function ConsultationStatusSelect({
  consultationId,
  status,
}: {
  consultationId: string;
  status: Status;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Status;
        start(async () => {
          await updateConsultationStatus(consultationId, next);
        });
      }}
      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
    >
      <option value="requested">Richiesto</option>
      <option value="confirmed">Confermato</option>
      <option value="completed">Completato</option>
      <option value="cancelled">Annullato</option>
    </select>
  );
}

export function ConsultationNotes({
  consultationId,
  initialNotes,
}: {
  consultationId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        onBlur={() => {
          if ((initialNotes ?? "") === notes) return;
          start(async () => {
            const res = await updateConsultationNotes(consultationId, notes);
            if (res.ok) setSaved(true);
          });
        }}
        rows={2}
        placeholder="Note interne…"
        className="w-full resize-y rounded-md border border-border bg-muted px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-foreground/30"
      />
      {pending && <span className="text-[10px] text-muted-foreground">Salvataggio…</span>}
      {saved && !pending && <span className="text-[10px] text-green-600">Salvato</span>}
    </div>
  );
}
