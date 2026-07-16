"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateArtistTier } from "@/app/(admin)/admin/artisti/_actions";
import type { ArtistTier } from "@/lib/supabase/types";

/**
 * Concessione manuale del piano (omaggio, partnership, comp).
 *
 * Non imposta `artists.tier` — quella è una cache derivata dal ledger degli
 * abbonamenti. Qui si scrive un override, che ha precedenza sulle subscription
 * Stripe finché non scade.
 */
export function ArtistTierSelect({
  artistId,
  effectiveTier,
  override,
  overrideExpiresAt,
  overrideReason,
}: {
  artistId: string;
  effectiveTier: ArtistTier;
  override: ArtistTier | null;
  overrideExpiresAt: string | null;
  overrideReason: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tier, setTier] = useState<ArtistTier>(override ?? "free");
  const [expiresAt, setExpiresAt] = useState(overrideExpiresAt?.slice(0, 10) ?? "");
  const [reason, setReason] = useState(overrideReason ?? "");
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    setError(null);
    start(async () => {
      const res = await updateArtistTier(artistId, {
        tier,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
        reason: reason.trim() || null,
      });
      if (!res.ok) setError(res.error ?? "Errore");
      else router.refresh();
    });
  }

  const isOverridden = override !== null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Piano effettivo: <strong className="uppercase">{effectiveTier}</strong>
        {isOverridden ? " (da concessione manuale)" : " (da abbonamento)"}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={tier}
          disabled={pending}
          onChange={(e) => setTier(e.target.value as ArtistTier)}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="free">Nessuna concessione</option>
          <option value="pro">Concedi Pro</option>
          <option value="max">Concedi Max</option>
        </select>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Scade il</span>
          <input
            type="date"
            value={expiresAt}
            disabled={pending || tier === "free"}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm disabled:opacity-50"
          />
        </label>
      </div>

      <input
        type="text"
        value={reason}
        disabled={pending || tier === "free"}
        placeholder="Motivo della concessione (es. partnership, omaggio lancio)"
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm disabled:opacity-50"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Salvataggio…" : "Salva concessione"}
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      <p className="text-xs text-muted-foreground">
        Lasciare la data vuota per una concessione senza scadenza. &quot;Nessuna concessione&quot;
        rimuove l&apos;override: se l&apos;artista ha un abbonamento attivo, quello continua a valere.
      </p>
    </div>
  );
}
