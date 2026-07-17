"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { PlanBadge } from "@/components/billing/PlanBadge";
import { updateArtistTier } from "@/app/(admin)/admin/artisti/_actions";
import { PLAN_SHORT_LABELS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import type { ArtistTier } from "@/lib/supabase/types";

const OPTIONS: ArtistTier[] = ["free", "pro", "max"];

/**
 * Assegnazione rapida del piano dal roster, senza aprire la pagina artista.
 *
 * Scrive una CONCESSIONE (override) via updateArtistTier → RPC
 * admin_set_artist_tier: bypassa Stripe e ha precedenza sull'abbonamento.
 * `free` rimuove l'override (l'eventuale abbonamento attivo resta valido).
 */
export function ArtistTierQuickAssign({
  artistId,
  tier,
  hasOverride,
}: {
  artistId: string;
  /** Piano effettivo (cache `artists.tier`). */
  tier: ArtistTier;
  /** `true` se `tier_override` è valorizzato (concessione manuale attiva). */
  hasOverride: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function assign(next: ArtistTier) {
    if (pending) return;
    setError(null);
    start(async () => {
      const res = await updateArtistTier(artistId, { tier: next });
      if (!res.ok) setError(res.error ?? "Errore");
      else router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label="Cambia piano"
          title={hasOverride ? "Concessione manuale attiva" : "Piano da abbonamento"}
          className={cn(
            "inline-flex items-center gap-1 rounded-full outline-none transition hover:opacity-80 disabled:opacity-50",
            "focus-visible:ring-2 focus-visible:ring-accent/40"
          )}
        >
          <PlanBadge tier={tier} />
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Concedi piano</DropdownMenuLabel>
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt}
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              assign(opt);
            }}
            className="justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <PlanBadge tier={opt} />
              <span>{opt === "free" ? "Nessuna concessione" : `Concedi ${PLAN_SHORT_LABELS[opt]}`}</span>
            </span>
            {opt === tier && <Check className="size-4 shrink-0 text-accent" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Concessione manuale: bypassa il pagamento e ha precedenza sull&apos;abbonamento.
          &quot;Nessuna concessione&quot; la rimuove; un eventuale abbonamento attivo resta valido.
        </p>
        {error && <p className="px-3 pb-2 text-[11px] text-error">{error}</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
