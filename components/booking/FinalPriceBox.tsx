"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Euro, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  proposeFinalPrice,
  confirmFinalPrice,
  resetFinalPrice,
} from "@/lib/booking/_actions";

type Role = "artist" | "organizer";

type Props = {
  bookingId: string;
  role: Role;
  currentUserId: string;
  finalPrice: number | null;
  proposedBy: string | null;
  proposedAt: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
};

function formatEur(n: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function FinalPriceBox({
  bookingId,
  role,
  currentUserId,
  finalPrice,
  proposedBy,
  proposedAt,
  confirmedBy,
  confirmedAt,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(finalPrice != null ? String(finalPrice) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isConfirmed = confirmedAt != null;
  const myProposal = proposedBy === currentUserId;

  function propose() {
    setError(null);
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Prezzo non valido");
      return;
    }
    startTransition(async () => {
      const res = await proposeFinalPrice({ booking_id: bookingId, price: n });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(false);
    });
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmFinalPrice({ booking_id: bookingId });
      if (!res.ok) setError(res.error);
    });
  }

  function reset() {
    if (!window.confirm("Azzerare prezzo definitivo e ricominciare?")) return;
    setError(null);
    startTransition(async () => {
      const res = await resetFinalPrice({ booking_id: bookingId });
      if (!res.ok) setError(res.error);
      else {
        setValue("");
        setEditing(false);
      }
    });
  }

  if (editing) {
    return (
      <div className="rounded-md border border-azzurro/40 bg-azzurro/5 p-3 space-y-3">
        <Label>Prezzo definitivo pattuito in chat (€)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step={1}
            placeholder="es. 500"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="max-w-[160px]"
          />
          <Button type="button" size="sm" onClick={propose} disabled={pending}>
            {pending ? "Salvataggio…" : "Proponi"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={pending}
          >
            Annulla
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (finalPrice == null) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            Nessun prezzo definitivo. Inserisci il valore pattuito in chat.
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Euro className="size-4" /> Inserisci prezzo
          </Button>
        </div>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <div>
              <p className="text-sm font-semibold">Prezzo confermato: {formatEur(finalPrice)}</p>
              <p className="text-[11px] opacity-80">
                Confermato il {confirmedAt ? new Date(confirmedAt).toLocaleString("it-IT") : "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              disabled={pending}
            >
              <Pencil className="size-3.5" /> Modifica
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={reset}
              disabled={pending}
            >
              <RefreshCw className="size-3.5" /> Reset
            </Button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // Proposed, not yet confirmed
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            Proposta: {formatEur(finalPrice)}
          </p>
          <p className="text-[11px] opacity-80">
            {myProposal
              ? `In attesa di conferma dell'${role === "artist" ? "organizzatore" : "artista"}.`
              : `Proposto dall'${role === "artist" ? "organizzatore" : "artista"}. Conferma se d'accordo.`}
            {proposedAt ? ` · ${new Date(proposedAt).toLocaleString("it-IT")}` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          {!myProposal && (
            <Button type="button" size="sm" onClick={confirm} disabled={pending}>
              <CheckCircle2 className="size-3.5" /> Conferma
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            disabled={pending}
          >
            <Pencil className="size-3.5" /> Modifica
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={reset}
            disabled={pending}
          >
            Reset
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
