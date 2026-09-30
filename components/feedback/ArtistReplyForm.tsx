"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { replyToFeedback, removeFeedbackReply } from "@/lib/feedback/_actions";

/**
 * Risposta pubblica dell'artista a una recensione. Una sola, modificabile.
 * È visibile sul profilo dove la recensione è pubblica (piani Pro e Max).
 */
export function ArtistReplyForm({
  feedbackId,
  initialReply,
}: {
  feedbackId: string;
  initialReply: string | null;
}) {
  const [saved, setSaved] = useState<string | null>(initialReply);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initialReply ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salva() {
    setError(null);
    startTransition(async () => {
      const res = await replyToFeedback(feedbackId, text);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(text.trim());
      setEditing(false);
    });
  }

  function rimuovi() {
    setError(null);
    startTransition(async () => {
      const res = await removeFeedbackReply(feedbackId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(null);
      setText("");
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        {saved && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground">La tua risposta</p>
            <p className="mt-1 whitespace-pre-wrap">{saved}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {saved ? "Modifica la risposta" : "Rispondi pubblicamente"}
          </Button>
          {saved && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={rimuovi}
              disabled={pending}
              className="text-red-600 hover:text-red-700"
            >
              Rimuovi
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Rispondi con misura: la risposta è pubblica accanto alla recensione (2–1000 caratteri)."
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={salva} disabled={pending}>
          {pending ? "Salvataggio…" : "Pubblica risposta"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setText(saved ?? "");
            setEditing(false);
            setError(null);
          }}
          disabled={pending}
        >
          Annulla
        </Button>
      </div>
    </div>
  );
}
