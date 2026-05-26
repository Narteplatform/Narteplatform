"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateArtistTier } from "@/app/(admin)/admin/artisti/_actions";

type Tier = "free" | "pro" | "max";

export function ArtistTierSelect({
  artistId,
  tier,
}: {
  artistId: string;
  tier: Tier;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onChange(next: Tier) {
    if (next === tier) return;
    start(async () => {
      const res = await updateArtistTier(artistId, next);
      if (!res.ok) alert(res.error ?? "Errore");
      else router.refresh();
    });
  }
  return (
    <div className="flex items-center gap-3">
      <select
        defaultValue={tier}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as Tier)}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm"
      >
        <option value="free">Free</option>
        <option value="pro">Pro</option>
        <option value="max">Max</option>
      </select>
      {pending && <span className="text-xs text-muted-foreground">Salvataggio…</span>}
    </div>
  );
}
