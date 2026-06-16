"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { deleteFormat } from "@/app/(admin)/admin/format/_actions";

export function DeleteFormatButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Eliminare questo format?")) return;
        start(async () => {
          await deleteFormat(id);
          router.push("/admin/format");
          router.refresh();
        });
      }}
    >
      {pending ? "Eliminazione..." : "Elimina"}
    </Button>
  );
}
