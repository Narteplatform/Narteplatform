"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/components/favorites/FavoritesProvider";
import type { FavoriteArtist } from "@/lib/favorites/types";

type Variant = "default" | "card" | "hero";

export function FavoriteToggle({
  artist,
  variant = "default",
  label,
}: {
  artist: FavoriteArtist;
  variant?: Variant;
  label?: string;
}) {
  const { has, toggle, hydrated } = useFavorites();
  const active = hydrated && has(artist.slug);

  const base =
    "inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  const cls =
    variant === "card"
      ? `${base} absolute right-3 top-3 size-9 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70`
      : variant === "hero"
        ? `${base} gap-2 rounded-full border border-foreground/20 bg-background/70 px-4 py-2 text-sm backdrop-blur hover:border-accent hover:text-accent`
        : `${base} gap-1.5 text-sm hover:text-accent`;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(artist);
      }}
      className={cls}
    >
      <Heart
        className={"size-4 " + (active ? "fill-corallo text-corallo" : "")}
        strokeWidth={2}
      />
      {label && <span>{label}</span>}
    </button>
  );
}
