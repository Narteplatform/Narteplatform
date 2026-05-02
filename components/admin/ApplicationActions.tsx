"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { approveApplication, rejectApplication } from "@/app/(admin)/admin/artisti/_actions";

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await rejectApplication(applicationId);
              if (!res.ok) setError(res.error ?? "Errore");
              else router.refresh();
            })
          }
        >
          Rifiuta
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
