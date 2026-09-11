"use client";

import { useState, useTransition } from "react";
import { ShieldAlert, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { blockConversationUser, unblockConversationUser } from "@/lib/chat/moderation";
import type { ActiveConversationBlock } from "@/lib/chat/queries";

const REASON_MIN = 3;
const REASON_MAX = 500;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BlockSlot({
  conversationId,
  target,
  name,
  block,
  disabled,
}: {
  conversationId: string;
  target: "artist" | "organizer";
  name: string;
  block: ActiveConversationBlock | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const label = target === "artist" ? "artista" : "organizzatore";

  function closeAndReset() {
    setOpen(false);
    setReason("");
    setNote("");
    setError(null);
  }

  function submitBlock() {
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < REASON_MIN || trimmed.length > REASON_MAX) {
      setError(`La motivazione deve avere tra ${REASON_MIN} e ${REASON_MAX} caratteri.`);
      return;
    }
    start(async () => {
      const res = await blockConversationUser({ conversationId, target, reason: trimmed });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      closeAndReset();
    });
  }

  function submitUnblock() {
    if (!block) return;
    setError(null);
    const trimmedNote = note.trim();
    if (trimmedNote && (trimmedNote.length < REASON_MIN || trimmedNote.length > REASON_MAX)) {
      setError(`La nota deve avere tra ${REASON_MIN} e ${REASON_MAX} caratteri, oppure lasciala vuota.`);
      return;
    }
    start(async () => {
      const res = await unblockConversationUser({
        blockId: block.id,
        note: trimmedNote || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      closeAndReset();
    });
  }

  if (block) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="border-red-500/50 text-red-600 hover:bg-red-500 hover:text-white"
        >
          <ShieldOff className="size-3.5" /> {name} bloccato
        </Button>

        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`unblock-title-${block.id}`}
            onClick={() => !pending && closeAndReset()}
          >
            <div
              className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id={`unblock-title-${block.id}`} className="font-display text-lg tracking-tight">
                {name} è bloccato in questa conversazione
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Bloccato il {formatDate(block.createdAt)}
              </p>
              <p className="mt-3 text-sm">
                <span className="font-semibold">Motivo:</span> {block.reason}
              </p>
              <label
                htmlFor={`unblock-note-${block.id}`}
                className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Nota di sblocco (facoltativa)
              </label>
              <textarea
                id={`unblock-note-${block.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={REASON_MAX}
                disabled={pending}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro"
                placeholder="Es: chiarito il malinteso, richiesta accolta, ecc."
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                {note.trim().length}/{REASON_MAX}
              </p>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={closeAndReset}>
                  Indietro
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={submitUnblock}
                  className="bg-azzurro text-white hover:bg-azzurro-dark"
                >
                  {pending ? "Sblocco…" : "Sblocca"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Nessun account collegato da bloccare" : undefined}
      >
        <ShieldAlert className="size-3.5" /> Blocca {label}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-title"
          onClick={() => !pending && closeAndReset()}
        >
          <div
            className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="block-title" className="font-display text-lg tracking-tight">
              Blocca {name} in questa conversazione
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {name} non potrà più inviare messaggi, offerte o allegati in questa conversazione, finché
              non lo sblocchi. Le altre conversazioni non sono toccate.
            </p>
            <label
              htmlFor="block-reason"
              className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Motivazione (obbligatoria, {REASON_MIN}-{REASON_MAX} caratteri) *
            </label>
            <textarea
              id="block-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={REASON_MAX}
              disabled={pending}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azzurro"
              placeholder="Es: linguaggio offensivo, tentativo di aggirare la piattaforma, ecc."
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {reason.trim().length}/{REASON_MAX}
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={closeAndReset}>
                Indietro
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending || reason.trim().length < REASON_MIN}
                onClick={submitBlock}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {pending ? "Blocco…" : "Conferma blocco"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ConversationBlockControls({
  conversationId,
  artistName,
  organizerName,
  artistUserId,
  organizerUserId,
  activeBlocks,
}: {
  conversationId: string;
  artistName: string;
  organizerName: string;
  artistUserId: string | null;
  organizerUserId: string;
  activeBlocks: ActiveConversationBlock[];
}) {
  const artistBlock = activeBlocks.find((b) => b.blockedUserId === artistUserId) ?? null;
  const organizerBlock = activeBlocks.find((b) => b.blockedUserId === organizerUserId) ?? null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <BlockSlot
        conversationId={conversationId}
        target="artist"
        name={artistName}
        block={artistBlock}
        disabled={!artistUserId}
      />
      <BlockSlot
        conversationId={conversationId}
        target="organizer"
        name={organizerName}
        block={organizerBlock}
      />
    </div>
  );
}
