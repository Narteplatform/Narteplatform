"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { segnaMessaggioTeamGestito } from "@/app/(admin)/admin/consulenza/_actions";

export function TeamMessageHandledButton({ id, gestito }: { id: string; gestito: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={gestito ? "ghost" : "outline"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await segnaMessaggioTeamGestito(id, !gestito);
          if (!res.ok) toast.error(res.error);
          else router.refresh();
        })
      }
    >
      {gestito ? "Riapri" : "Segna come gestito"}
    </Button>
  );
}
