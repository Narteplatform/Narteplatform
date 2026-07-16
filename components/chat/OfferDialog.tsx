"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Clock, Euro, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { sendOffer } from "@/lib/chat/actions";
import { cn } from "@/lib/utils";

const SLOTS: { value: "mattina" | "pomeriggio" | "sera" | "notte"; label: string; emoji: string }[] = [
  { value: "mattina", label: "Mattina", emoji: "🌅" },
  { value: "pomeriggio", label: "Pomeriggio", emoji: "☀️" },
  { value: "sera", label: "Sera", emoji: "🌆" },
  { value: "notte", label: "Notte", emoji: "🌙" },
];

function formatBudget(cents: number): string {
  if (!cents) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function OfferDialog({
  open,
  onClose,
  conversationId,
}: {
  open: boolean;
  onClose: () => void;
  conversationId: string;
}) {
  const [eventDate, setEventDate] = useState("");
  const [timeSlot, setTimeSlot] = useState<"mattina" | "pomeriggio" | "sera" | "notte">("sera");
  const [budgetEur, setBudgetEur] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  if (!open) return null;

  const budgetCents = Math.round((Number(budgetEur) || 0) * 100);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!eventDate) {
      setError("Seleziona una data");
      return;
    }
    if (budgetCents <= 0) {
      setError("Inserisci un budget");
      return;
    }
    startTransition(async () => {
      const res = await sendOffer({
        conversation_id: conversationId,
        event_date: eventDate,
        time_slot: timeSlot,
        budget_cents: budgetCents,
        description: description.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEventDate("");
      setBudgetEur("");
      setDescription("");
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-notte/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-surface border border-border shadow-xl overflow-hidden max-h-[95dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-lg text-notte">Fai un&apos;offerta</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Stile Vinted — la controparte accetta o rifiuta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted min-h-11 min-w-11"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div>
            <Label htmlFor="offer-date" className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" /> Data evento
            </Label>
            <Input
              id="offer-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> Fascia oraria
            </Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {SLOTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setTimeSlot(s.value)}
                  className={cn(
                    "rounded-xl border-[1.5px] px-2 py-2.5 text-xs font-medium transition",
                    timeSlot === s.value
                      ? "border-azzurro bg-azzurro-subtle text-azzurro-dark"
                      : "border-border bg-background text-foreground hover:bg-muted/60",
                  )}
                >
                  <div className="text-lg leading-none">{s.emoji}</div>
                  <div className="mt-1">{s.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="offer-budget" className="inline-flex items-center gap-1.5">
              <Euro className="size-3.5" /> Budget proposto
            </Label>
            <div className="relative">
              <Input
                id="offer-budget"
                type="number"
                min={0}
                step={10}
                inputMode="numeric"
                value={budgetEur}
                onChange={(e) => setBudgetEur(e.target.value)}
                placeholder="Es. 400"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
            </div>
            {budgetCents > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">{formatBudget(budgetCents)}</p>
            )}
          </div>
          <div>
            <Label htmlFor="offer-desc">Descrizione (opzionale)</Label>
            <textarea
              id="offer-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Dettagli sul live, location, durata…"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-azzurro focus:ring-[3px] focus:ring-azzurro/15"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Quando l&apos;altra parte accetta, la data viene confermata e bloccata sui calendari.
          </p>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        </form>
        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 min-h-11" disabled={busy}>
            Annulla
          </Button>
          <Button type="button" onClick={submit} className="flex-1 min-h-11" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Invia offerta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
