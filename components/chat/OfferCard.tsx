"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarDays, Check, CheckCheck, Clock, Euro, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { respondToOffer } from "@/lib/chat/actions";
import { confirmBookingRequest } from "@/app/(organizer)/organizzatore/_actions";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat/queries";

function formatDateIt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

function formatBudgetCents(c: number | null): string {
  if (c == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(c / 100);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

const SLOT_LABEL: Record<string, string> = {
  mattina: "Mattina",
  pomeriggio: "Pomeriggio",
  sera: "Sera",
  notte: "Notte",
};

const statusBadge: Record<NonNullable<ChatMessage["offerStatus"]>, { label: string; variant: "warning" | "success" | "danger" | "muted" }> = {
  pending: { label: "In sospeso", variant: "warning" },
  accepted: { label: "Accettata", variant: "success" },
  rejected: { label: "Rifiutata", variant: "danger" },
  superseded: { label: "Sostituita", variant: "muted" },
};

type TickState = "sent" | "delivered" | "read";

function Ticks({ state, isOwn }: { state: TickState; isOwn: boolean }) {
  if (!isOwn) return null;
  if (state === "sent") return <Check className="size-3.5 opacity-70" />;
  if (state === "delivered") return <CheckCheck className="size-3.5 opacity-70" />;
  return <CheckCheck className="size-3.5 text-[#34B7F1]" />;
}

export function OfferCard({
  msg,
  canRespond,
  readOnly,
  bookingHref,
  isOwn = false,
  tick = "delivered",
  viewerRole,
  onChange,
}: {
  msg: ChatMessage;
  canRespond: boolean;
  readOnly: boolean;
  /** Href completo verso il booking confermato; undefined = nessun link. */
  bookingHref?: string;
  isOwn?: boolean;
  tick?: TickState;
  /** Chi sta guardando: decide i testi e chi conferma le offerte «accettata». */
  viewerRole?: "artist" | "organizer" | "superadmin";
  /** Dopo una risposta: rilegge i messaggi, così il widget vede lo stato della richiesta. */
  onChange?: () => void;
}) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Accettare un'offerta blocca la data nel calendario di entrambi: prima di
  // farlo la persona legge che l'accordo è solo fra le parti.
  const [confirming, setConfirming] = useState(false);
  const status = msg.offerStatus ?? "pending";
  const badge = statusBadge[status];

  function respond(action: "accept" | "reject") {
    setError(null);
    startTransition(async () => {
      const res = await respondToOffer(msg.id, action);
      if (!res.ok) setError(res.error);
      setConfirming(false);
      onChange?.();
    });
  }

  // Solo richieste precedenti alla 0080: l'artista ha accettato l'offerta e
  // manca il sì dell'organizzatore, che lo dà da qui al prezzo dell'offerta.
  const [confermaFinale, setConfermaFinale] = useState(false);
  function confermaData() {
    if (!msg.offerBookingRequestId) return;
    const id = msg.offerBookingRequestId;
    setError(null);
    startTransition(async () => {
      const res = await confirmBookingRequest(id);
      if (!res.ok) setError(res.error);
      setConfermaFinale(false);
      onChange?.();
    });
  }
  const daConfermare = status === "accepted" && msg.offerBookingStatus === "accettata";
  const confermata = status === "accepted" && msg.offerBookingStatus === "confermata";

  const isRejected = status === "rejected" || status === "superseded";

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "w-full max-w-[78%] sm:max-w-[420px] rounded-2xl border-[1.5px] p-3.5 shadow-sm",
          isOwn
            ? "border-azzurro bg-azzurro text-white rounded-br-md"
            : "border-azzurro/40 bg-azzurro-subtle/40 text-notte rounded-bl-md",
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className={cn("font-display text-sm", isOwn ? "text-white" : "text-notte")}>
            Offerta
          </div>
          <Badge variant={badge.variant} dot>{badge.label}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className={cn("inline-flex items-center gap-1 text-[10px] uppercase tracking-wider", isOwn ? "text-white/70" : "text-muted-foreground")}>
              <CalendarDays className="size-3" /> Data
            </span>
            <span className={cn("font-semibold text-sm", isOwn ? "text-white" : "text-notte", isRejected && "line-through opacity-70")}>
              {formatDateIt(msg.offerEventDate)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={cn("inline-flex items-center gap-1 text-[10px] uppercase tracking-wider", isOwn ? "text-white/70" : "text-muted-foreground")}>
              <Clock className="size-3" /> Fascia
            </span>
            <span className={cn("font-semibold text-sm", isOwn ? "text-white" : "text-notte", isRejected && "line-through opacity-70")}>
              {msg.offerTimeSlot ? (SLOT_LABEL[msg.offerTimeSlot] ?? msg.offerTimeSlot) : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={cn("inline-flex items-center gap-1 text-[10px] uppercase tracking-wider", isOwn ? "text-white/70" : "text-muted-foreground")}>
              <Euro className="size-3" /> Compenso
            </span>
            <span className={cn("font-semibold text-sm", isOwn ? "text-white" : "text-notte", isRejected && "line-through opacity-70")}>
              {formatBudgetCents(msg.offerBudgetCents)}
            </span>
          </div>
        </div>
        {msg.offerDescription && (
          <p className={cn("mt-2.5 text-sm whitespace-pre-wrap", isOwn ? "text-white/95" : "text-foreground")}>
            {msg.offerDescription}
          </p>
        )}
        {canRespond && !readOnly && status === "pending" && confirming && (
          <div
            className={cn(
              "mt-3 rounded-xl p-3 text-xs leading-relaxed",
              isOwn ? "bg-white/10 text-white" : "bg-white text-foreground border border-azzurro/30",
            )}
          >
            <p>
              Accettando confermi l&rsquo;accordo raggiunto <strong>direttamente</strong> con
              {viewerRole === "artist" ? " l\u2019organizzatore" : " l\u2019artista"}:{" "}
              <strong>{formatDateIt(msg.offerEventDate)}</strong> a{" "}
              <strong>{formatBudgetCents(msg.offerBudgetCents)}</strong>. La data viene confermata e
              bloccata nel calendario di entrambi.
            </p>
            <p className="mt-1.5">
              L&rsquo;accordo è solo fra voi. N&rsquo;arte non è parte del contratto e non
              gestisce il pagamento.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="default"
                disabled={busy}
                onClick={() => respond("accept")}
                className="flex-1 min-h-10"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : (<><Check className="size-4" /> Confermo l&rsquo;accordo</>)}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className={cn("flex-1 min-h-10", isOwn && "bg-white/10 text-white border-white/30 hover:bg-white/20")}
              >
                Indietro
              </Button>
            </div>
          </div>
        )}
        {canRespond && !readOnly && status === "pending" && !confirming && (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={busy}
              onClick={() => setConfirming(true)}
              className="flex-1 min-h-10"
            >
              <Check className="size-4" /> Accetta
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => respond("reject")}
              className={cn("flex-1 min-h-10", isOwn && "bg-white/10 text-white border-white/30 hover:bg-white/20")}
            >
              <X className="size-4" /> Rifiuta
            </Button>
          </div>
        )}
        {daConfermare && viewerRole === "organizer" && !readOnly && (
          confermaFinale ? (
            <div
              className={cn(
                "mt-3 rounded-xl p-3 text-xs leading-relaxed",
                isOwn ? "bg-white/10 text-white" : "bg-white text-foreground border border-azzurro/30",
              )}
            >
              <p>
                L&rsquo;artista ha accettato. Confermando, la data è bloccata nel calendario di
                entrambi a <strong>{formatBudgetCents(msg.offerBudgetCents)}</strong>. L&rsquo;accordo
                è solo fra voi: N&rsquo;arte non è parte del contratto e non gestisce il pagamento.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={busy} onClick={confermaData} className="flex-1 min-h-10">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : (<><Check className="size-4" /> Confermo l&rsquo;accordo</>)}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfermaFinale(false)}
                  className={cn("flex-1 min-h-10", isOwn && "bg-white/10 text-white border-white/30 hover:bg-white/20")}
                >
                  Indietro
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant={isOwn ? "outline" : "default"}
              disabled={busy}
              onClick={() => setConfermaFinale(true)}
              className={cn("mt-3 w-full min-h-10", isOwn && "bg-white text-azzurro border-white hover:bg-white/90")}
            >
              <Check className="size-4" /> Conferma data a {formatBudgetCents(msg.offerBudgetCents)}
            </Button>
          )
        )}
        {daConfermare && viewerRole !== "organizer" && (
          <p className={cn("mt-3 text-xs", isOwn ? "text-white/90" : "text-muted-foreground")}>
            Offerta accettata: manca la conferma dell&rsquo;organizzatore.
          </p>
        )}
        {confermata && (
          <p className={cn("mt-3 inline-flex items-center gap-1.5 text-xs font-semibold", isOwn ? "text-white" : "text-[#1F7A46]")}>
            <CheckCheck className="size-3.5" /> Data confermata da entrambi a {formatBudgetCents(msg.offerBudgetCents)}
          </p>
        )}
        {confermata && bookingHref && (
          <Button asChild size="sm" variant={isOwn ? "outline" : "default"} className={cn("mt-2 w-full", isOwn && "bg-white/10 text-white border-white/30 hover:bg-white/20")}>
            <Link href={bookingHref}>
              <ExternalLink className="size-3.5" /> Vedi booking confermato
            </Link>
          </Button>
        )}
        {error && <p className={cn("mt-2 text-xs", isOwn ? "text-white/90" : "text-[var(--color-error)]")}>{error}</p>}
        <div className={cn("mt-2 flex items-center justify-end gap-1 text-[10px]", isOwn ? "text-white/70" : "text-muted-foreground")}>
          <span>{formatTime(msg.createdAt)}</span>
          <Ticks state={tick} isOwn={isOwn} />
        </div>
      </div>
    </div>
  );
}
