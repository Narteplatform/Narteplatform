"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Send, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { sendMessage } from "@/lib/chat/actions";
import { OfferDialog } from "./OfferDialog";
import type { ChatPartyMeta } from "@/lib/chat/queries";

export function MessageComposer({
  meta,
  disabled,
  disabledReason,
}: {
  meta: ChatPartyMeta;
  disabled: boolean;
  disabledReason?: string;
}) {
  const [text, setText] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  function submit() {
    if (!text.trim()) return;
    setError(null);
    const body = text;
    startTransition(async () => {
      const res = await sendMessage({ booking_request_id: meta.bookingRequestId, body });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setText("");
      if (taRef.current) taRef.current.style.height = "auto";
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  if (disabled) {
    return (
      <div className="border-t border-border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
        {disabledReason ?? "Composer disabilitato"}
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-surface px-3 py-2.5">
      {error && <p className="px-1 pb-1 text-xs text-[var(--color-error)]">{error}</p>}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowOffer(true)}
          disabled={busy}
          className="shrink-0"
          aria-label="Invia offerta"
        >
          <Tag className="size-4" />
          <span className="hidden sm:inline">Offerta</span>
        </Button>
        <textarea
          ref={taRef}
          value={text}
          onChange={autoResize}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Scrivi un messaggio…"
          className="flex-1 resize-none rounded-2xl border-[1.5px] border-border bg-background px-3.5 py-2 text-sm leading-relaxed focus:outline-none focus:border-azzurro focus:ring-[3px] focus:ring-azzurro/15"
        />
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={busy || !text.trim()}
          aria-label="Invia messaggio"
          className="shrink-0"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
      <OfferDialog
        open={showOffer}
        onClose={() => setShowOffer(false)}
        bookingRequestId={meta.bookingRequestId}
        defaults={{
          eventDate: meta.eventDate,
          timeSlot: meta.timeSlot,
          budget: meta.budget,
        }}
      />
    </div>
  );
}
