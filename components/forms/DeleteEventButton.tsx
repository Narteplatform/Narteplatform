"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { deleteEvent } from "@/app/(admin)/admin/eventi/_actions";

export function DeleteEventButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Eliminare questo evento?")) return;
        start(async () => {
          await deleteEvent(id);
          router.push("/admin/eventi");
          router.refresh();
        });
      }}
    >
      {pending ? "Eliminazione..." : "Elimina"}
    </Button>
  );
}
