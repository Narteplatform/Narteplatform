"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { switchArtistProfile } from "@/app/(artist)/dashboard/profili/_actions";
import type { OwnedArtist } from "@/lib/artist/current";

/**
 * Selettore del profilo artista attivo.
 *
 * Compare solo se l'account possiede più di un profilo, oppure se il piano ne
 * consente altri: a un artista Free con un solo profilo non serve un menu a
 * tendina con dentro una voce sola.
 */
export function ArtistProfileSwitcher({
  owned,
  activeId,
  canCreateMore,
}: {
  owned: OwnedArtist[];
  activeId: string | null;
  canCreateMore: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (owned.length <= 1 && !canCreateMore) return null;

  function onChange(id: string) {
    if (id === activeId) return;
    start(async () => {
      const res = await switchArtistProfile(id);
      if (!res.ok) return;
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {owned.length > 1 ? (
        <div className="relative">
          <select
            value={activeId ?? ""}
            disabled={pending}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Profilo artista attivo"
            className="h-9 w-full appearance-none rounded-md border border-border bg-background pl-3 pr-8 text-sm disabled:opacity-50"
          >
            {owned.map((a) => (
              <option key={a.id} value={a.id}>
                {a.stage_name}
                {a.status !== "approved" ? " (in revisione)" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      ) : null}

      {canCreateMore && (
        <Link
          href="/dashboard/profili"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Profilo</span>
        </Link>
      )}
    </div>
  );
}
