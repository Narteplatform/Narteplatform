"use client";

import { useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toggleFeedbackHidden, deleteFeedback } from "@/lib/feedback/_actions";

export function FeedbackModerationButtons({
  id,
  hidden,
}: {
  id: string;
  hidden: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      await toggleFeedbackHidden({ id });
    });
  }

  function onDelete() {
    if (!confirm("Eliminare definitivamente il feedback?")) return;
    startTransition(async () => {
      await deleteFeedback({ id });
    });
  }

  return (
    <div className="flex gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={onToggle} disabled={pending}>
        {hidden ? (
          <>
            <Eye className="size-3.5" /> Mostra
          </>
        ) : (
          <>
            <EyeOff className="size-3.5" /> Nascondi
          </>
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={pending}
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="size-3.5" /> Elimina
      </Button>
    </div>
  );
}
