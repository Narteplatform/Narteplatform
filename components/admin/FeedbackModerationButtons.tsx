"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import { toggleFeedbackHidden, deleteFeedback } from "@/lib/feedback/_actions";

type Azione = "toggle" | "delete";

/**
 * Pulsanti di moderazione di una recensione. Ogni azione richiede una
 * motivazione (minimo 10 caratteri) che viene registrata e comunicata
 * all'autore e all'artista.
 */
export function FeedbackModerationButtons({
  id,
  hidden,
  deleted = false,
}: {
  id: string;
  hidden: boolean;
  deleted?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [azione, setAzione] = useState<Azione | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (deleted) return null;

  function chiudi() {
    setAzione(null);
    setReason("");
    setError(null);
  }

  function conferma() {
    if (!azione) return;
    if (reason.trim().length < 10) {
      setError("La motivazione deve avere almeno 10 caratteri.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res =
        azione === "toggle"
          ? await toggleFeedbackHidden(id, reason)
          : await deleteFeedback(id, reason);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      chiudi();
    });
  }

  const titolo =
    azione === "delete"
      ? "Motivo dell'eliminazione"
      : hidden
        ? "Motivo del ripristino"
        : "Motivo dell'oscuramento";

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAzione("toggle")}
          disabled={pending}
        >
          {hidden ? (
            <>
              <Eye className="size-3.5" /> Ripristina
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
          onClick={() => setAzione("delete")}
          disabled={pending}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="size-3.5" /> Elimina
        </Button>
      </div>

      {azione && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-xs font-medium">{titolo}</p>
          <MotivazioneField
            compact
            disabled={pending}
            onChange={setReason}
            hint="Viene comunicato per email all'autore e all'artista, con il link per contestare."
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={conferma} disabled={pending || reason.length === 0}>
              {pending ? "Invio…" : "Conferma"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={chiudi} disabled={pending}>
              Annulla
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
