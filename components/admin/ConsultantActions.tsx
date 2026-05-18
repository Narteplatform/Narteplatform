"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toggleConsultant, deleteConsultant } from "@/app/(admin)/admin/consulenza/_actions";

export function ConsultantToggle({
  consultantId,
  isActive,
}: {
  consultantId: string;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={isActive}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          start(async () => {
            await toggleConsultant(consultantId, next);
          });
        }}
      />
      Attivo
    </label>
  );
}

export function ConsultantDelete({
  consultantId,
  name,
}: {
  consultantId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Eliminare definitivamente "${name}"?`)) return;
        start(async () => {
          const res = await deleteConsultant(consultantId);
          if (res.ok) router.push("/admin/consulenza/consulenti");
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-red-500/50 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-500 hover:text-white"
    >
      <Trash2 className="size-3.5" /> Elimina
    </button>
  );
}
