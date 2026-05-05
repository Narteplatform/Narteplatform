"use client";

import { useMemo, useState } from "react";
import { ArtistCard } from "@/components/marketing/ArtistCard";

export type ExplorerArtist = {
  id: string;
  slug: string;
  stage_name: string;
  city: string | null;
  cover_image: string | null;
  genre: string[];
  instruments: string[];
};

const ROLE_GROUPS: { key: string; label: string; match: (instr: string) => boolean }[] = [
  { key: "cantante", label: "Cantante", match: (i) => /voce|cori/i.test(i) },
  { key: "chitarrista", label: "Chitarrista", match: (i) => /chitarra/i.test(i) },
  { key: "bassista", label: "Bassista", match: (i) => /^basso$|contrabbasso/i.test(i) },
  { key: "batterista", label: "Batterista", match: (i) => /batteria|percussioni|cajón|cajon/i.test(i) },
  { key: "tastierista", label: "Tastierista", match: (i) => /pianoforte|tastiere|organo|synth/i.test(i) },
  { key: "fiati", label: "Fiati", match: (i) => /sax|tromba|trombone|flauto|clarinetto/i.test(i) },
  { key: "archi", label: "Archi", match: (i) => /violino|viola|violoncello|arpa/i.test(i) },
  { key: "dj", label: "DJ", match: (i) => /dj|controller|loop station/i.test(i) },
];

export function ArtistsExplorer({ artists }: { artists: ExplorerArtist[] }) {
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const a of artists) for (const g of a.genre ?? []) set.add(g);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [artists]);

  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    for (const a of artists) {
      for (const i of a.instruments ?? []) {
        for (const g of ROLE_GROUPS) if (g.match(i)) set.add(g.key);
      }
    }
    return ROLE_GROUPS.filter((g) => set.has(g.key));
  }, [artists]);

  const filtered = useMemo(() => {
    return artists.filter((a) => {
      if (genreFilter && !(a.genre ?? []).includes(genreFilter)) return false;
      if (roleFilter) {
        const group = ROLE_GROUPS.find((g) => g.key === roleFilter);
        if (!group) return true;
        const hit = (a.instruments ?? []).some((i) => group.match(i));
        if (!hit) return false;
      }
      return true;
    });
  }, [artists, genreFilter, roleFilter]);

  const hasFilters = genreFilter !== null || roleFilter !== null;

  return (
    <div>
      <div className="space-y-6">
        {availableRoles.length > 0 && (
          <FilterRow label="Tipologia">
            <Chip active={roleFilter === null} onClick={() => setRoleFilter(null)}>
              Tutti
            </Chip>
            {availableRoles.map((r) => (
              <Chip
                key={r.key}
                active={roleFilter === r.key}
                onClick={() => setRoleFilter(roleFilter === r.key ? null : r.key)}
              >
                {r.label}
              </Chip>
            ))}
          </FilterRow>
        )}
        {allGenres.length > 0 && (
          <FilterRow label="Genere">
            <Chip active={genreFilter === null} onClick={() => setGenreFilter(null)}>
              Tutti
            </Chip>
            {allGenres.map((g) => (
              <Chip
                key={g}
                active={genreFilter === g}
                onClick={() => setGenreFilter(genreFilter === g ? null : g)}
              >
                {g}
              </Chip>
            ))}
          </FilterRow>
        )}
        {hasFilters && (
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>
              {filtered.length} {filtered.length === 1 ? "artista" : "artisti"} trovati
            </span>
            <button
              type="button"
              onClick={() => {
                setGenreFilter(null);
                setRoleFilter(null);
              }}
              className="rounded-full border border-border bg-background px-3 py-1.5 uppercase tracking-wide transition hover:border-accent hover:text-accent"
            >
              Reset filtri
            </button>
          </div>
        )}
      </div>

      <div className="mt-10">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Nessun artista corrisponde ai filtri selezionati.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((a) => (
              <ArtistCard
                key={a.id}
                slug={a.slug}
                stageName={a.stage_name}
                city={a.city}
                coverImage={a.cover_image}
                genres={a.genre}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="accent-label shrink-0 sm:min-w-[88px]">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-background text-foreground hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}
