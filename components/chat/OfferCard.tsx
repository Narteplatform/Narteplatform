"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Clock, Euro, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { respondToOffer } from "@/lib/chat/actions";
import type { ChatMessage } from "@/lib/chat/queries";

function formatDateIt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

function formatBudget(b: number | null): string {
  if (b == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(b);
}

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
}: {
  msg: ChatMessage;
  canRespond: boolean;
  readOnly: boolean;
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
            <span className="font-semibold text-notte">{msg.offerTimeSlot ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Euro className="size-3" /> Budget
            </span>
            <span className="font-semibold text-notte">{formatBudget(msg.offerBudget)}</span>
          </div>
        </div>
        {canRespond && !readOnly && status === "pending" && (
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={busy}
              onClick={() => respond("accept")}
              className="flex-1"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Accetta"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => respond("reject")}
              className="flex-1"
            >
              Rifiuta
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    </div>
  );
}
