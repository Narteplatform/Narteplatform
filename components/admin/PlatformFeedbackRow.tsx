"use client";

import { useTransition } from "react";
import { Eye, EyeOff, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  updatePlatformFeedbackStatus,
  deletePlatformFeedback,
} from "@/lib/feedback/_actions";

export function PlatformFeedbackActions({
  id,
  status,
}: {
  id: string;
  status: "new" | "read" | "archived";
}) {
  const [pending, startTransition] = useTransition();

  function setStatus(s: "new" | "read" | "archived") {
    startTransition(async () => {
      await updatePlatformFeedbackStatus({ id, status: s });
    });
  }

  function remove() {
    if (!confirm("Eliminare definitivamente il feedback?")) return;
    startTransition(async () => {
      await deletePlatformFeedback({ id });
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {status !== "read" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStatus("read")}
          disabled={pending}
        >
          <Eye className="size-3.5" /> Segna come letto
        </Button>
      )}
      {status === "read" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStatus("new")}
          disabled={pending}
        >
          <EyeOff className="size-3.5" /> Segna come non letto
        </Button>
      )}
      {status !== "archived" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStatus("archived")}
          disabled={pending}
        >
          <Archive className="size-3.5" /> Archivia
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={pending}
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="size-3.5" /> Elimina
      </Button>
    </div>
  );
}
