"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Search } from "lucide-react";
import { ArtistTierBadges } from "@/components/marketing/ArtistBadges";
import type { SearchHit } from "@/app/api/search/route";

type SearchBarProps = {
  /** Focus automatico all'apertura, usato dal pannello a lente della top bar. */
  autoFocus?: boolean;
  /** Chiamata dopo che si è navigato verso un risultato: chi ospita la barra
   *  (pannello a lente, drawer mobile) la usa per chiudersi. */
  onNavigate?: () => void;
};

export function SearchBar({ autoFocus = false, onNavigate }: SearchBarProps = {}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounce + fetch
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(t)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data: { hits: SearchHit[] } = await res.json();
        setHits(data.hits);
        setOpen(true);
      } catch {
        // ignore aborts
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function go(hit: SearchHit) {
    setOpen(false);
    setQ("");
    router.push(hit.type === "artist" ? `/artisti/${hit.slug}` : `/eventi/${hit.slug}`);
    onNavigate?.();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && hits.length > 0) {
      e.preventDefault();
      go(hits[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const artists = hits.filter((h) => h.type === "artist");
  const events = hits.filter((h) => h.type === "event");

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={q}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="cerca artista o evento…"
        className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
        aria-label="Cerca"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-background shadow-2xl">
          {loading && (
            <p className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
              Cerco…
            </p>
          )}
          {!loading && hits.length === 0 && (
            <p className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
              Nessun risultato per &quot;{q}&quot;
            </p>
          )}
          {artists.length > 0 && (
            <Group label="Artisti">
              {artists.map((h) => (
                <HitRow key={`a-${h.slug}`} hit={h} onSelect={() => go(h)} />
              ))}
            </Group>
          )}
          {events.length > 0 && (
            <Group label="Eventi">
              {events.map((h) => (
                <HitRow key={`e-${h.slug}`} hit={h} onSelect={() => go(h)} />
              ))}
            </Group>
          )}
          {hits.length > 0 && (
            <div className="border-t border-border px-4 py-2 text-right text-[11px] uppercase tracking-wide text-muted-foreground">
              <Link
                href={`/artisti`}
                onClick={() => setOpen(false)}
                className="mr-3 hover:underline"
              >
                tutti gli artisti
              </Link>
              <Link
                href={`/eventi`}
                onClick={() => setOpen(false)}
                className="hover:underline"
              >
                tutti gli eventi
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-0">
      <p className="px-4 pt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <ul className="py-1">{children}</ul>
    </div>
  );
}

/**
 * `hit.locked` arriva dal server per gli artisti quando chi cerca non ha una
 * sessione: il nome non è nella risposta, `hit.title` è un segnaposto e va
 * sfocato come sulle card del roster. Renderlo in chiaro qui vanificherebbe
 * il blocco applicato ovunque altro.
 */
function HitRow({ hit, onSelect }: { hit: SearchHit; onSelect: () => void }) {
  const locked = hit.locked === true;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-label={locked ? "Iscriviti per vedere i dettagli dell'artista" : undefined}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted"
      >
        <span className="relative size-10 shrink-0 overflow-hidden bg-muted">
          {hit.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hit.image}
              alt=""
              className={`h-full w-full object-cover ${
                locked ? "scale-125 blur-[6px]" : ""
              }`}
            />
          ) : null}
          {locked && (
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center bg-notte/45"
            >
              <Lock className="size-3.5 text-palco" />
            </span>
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5">
            <span
              className={`truncate font-display text-sm ${
                locked ? "select-none blur-[3px]" : ""
              }`}
              aria-hidden={locked}
            >
              {hit.title}
            </span>
            <ArtistTierBadges tier={hit.tier} compact className="shrink-0" />
          </span>
          {hit.subtitle && (
            <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
          )}
        </span>
      </button>
    </li>
  );
}
