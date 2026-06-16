"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignConsultantToSlot } from "@/app/(admin)/admin/consulenza/_actions";

// #12 — Dropdown per assegnare un consulente reale a uno slot legacy (consultant_id NULL).
export function AssignConsultantSelect({
  slotId,
  consultants,
}: {
  slotId: string;
  consultants: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (consultants.length === 0) {
    return (
      <span className="text-[11px] text-muted-foreground">
        Nessun consulente attivo da assegnare.
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        defaultValue=""
        disabled={pending}
        onChange={(e) => {
          const consultantId = e.target.value;
          if (!consultantId) return;
          setError(null);
          start(async () => {
            const res = await assignConsultantToSlot(slotId, consultantId);
            if (!res.ok) {
              setError(res.error ?? "Errore");
              return;
            }
            router.refresh();
          });
        }}
        className="h-8 rounded-md border border-accent/60 bg-background px-2 text-xs"
        aria-label="Assegna consulente"
      >
        <option value="">Assegna consulente…</option>
        {consultants.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {pending && <span className="text-[10px] text-muted-foreground">Salvataggio…</span>}
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </span>
  );
}
