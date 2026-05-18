"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarDays, Clock, Euro, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { respondToOffer } from "@/lib/chat/actions";
import type { ChatMessage } from "@/lib/chat/queries";

function formatDateIt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

function formatBudgetCents(c: number | null): string {
  if (c == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(c / 100);
}

const SLOT_LABEL: Record<string, string> = {
  mattina: "Mattina",
  pomeriggio: "Pomeriggio",
  sera: "Sera",
  notte: "Notte",
};

const statusBadge: Record<NonNullable<ChatMessage["offerStatus"]>, { label: string; variant: "warning" | "success" | "danger" | "muted" }> = {
  pending: { label: "In attesa", variant: "warning" },
  accepted: { label: "Accettata", variant: "success" },
  rejected: { label: "Rifiutata", variant: "danger" },
  superseded: { label: "Sostituita", variant: "muted" },
};

export function OfferCard({
  msg,
  canRespond,
  readOnly,
  bookingLinkBase,
}: {
  msg: ChatMessage;
  canRespond: boolean;
  readOnly: boolean;
  bookingLinkBase?: string;
}) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = msg.offerStatus ?? "pending";
  const badge = statusBadge[status];

  function respond(action: "accept" | "reject") {
    setError(null);
    startTransition(async () => {
      const res = await respondToOffer(msg.id, action);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-[460px] rounded-2xl border-[1.5px] border-azzurro bg-azzurro-subtle/40 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="font-display text-base text-notte">Offerta</div>
          <Badge variant={badge.variant} dot>{badge.label}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="size-3" /> Data
            </span>
            <span className="font-semibold text-notte">{formatDateIt(msg.offerEventDate)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Clock className="size-3" /> Fascia
            </span>
            <span className="font-semibold text-notte">{msg.offerTimeSlot ? (SLOT_LABEL[msg.offerTimeSlot] ?? msg.offerTimeSlot) : "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Euro className="size-3" /> Budget
            </span>
            <span className="font-semibold text-notte">{formatBudgetCents(msg.offerBudgetCents)}</span>
          </div>
        </div>
        {msg.offerDescription && (
          <p className="mt-3 text-sm whitespace-pre-wrap text-foreground">{msg.offerDescription}</p>
        )}
        {canRespond && !readOnly && status === "pending" && (
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={busy}
              onClick={() => respond("accept")}
              className="flex-1 min-h-11"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Accetta"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => respond("reject")}
              className="flex-1 min-h-11"
            >
              Rifiuta
            </Button>
          </div>
        )}
        {status === "accepted" && msg.offerBookingRequestId && bookingLinkBase && (
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link href={`${bookingLinkBase}/${msg.offerBookingRequestId}`}>
              <ExternalLink className="size-3.5" /> Vedi booking confermato
            </Link>
          </Button>
        )}
        {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    </div>
  );
}
