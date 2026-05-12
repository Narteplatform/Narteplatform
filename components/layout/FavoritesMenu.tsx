"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Heart, X, MapPin } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

export function FavoritesMenu() {
  const { items, hydrated, remove } = useFavorites();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = hydrated ? items.length : 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Artisti preferiti"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex size-9 items-center justify-center rounded-full border border-foreground/20 text-foreground/80 transition-colors hover:border-foreground hover:text-foreground"
      >
        <Heart
          className={"size-4 " + (count > 0 ? "fill-corallo text-corallo" : "")}
        />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-corallo px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[320px] origin-top-right overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="font-display text-sm uppercase tracking-wider">
                I miei preferiti
              </p>
              <p className="text-xs text-muted-foreground">
                {count === 0
                  ? "Nessun artista salvato"
                  : `${count} artist${count === 1 ? "a" : "i"} salvat${count === 1 ? "o" : "i"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chiudi"
              className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {count === 0 ? (
              <div className="px-4 py-8 text-center">
                <Heart className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Aggiungi i tuoi artisti preferiti cliccando il cuore sulla loro pagina.
                </p>
                <Link
                  href="/artisti"
                  onClick={() => setOpen(false)}
                  className="mt-4 inline-block rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-wider hover:border-accent hover:text-accent"
                >
                  Esplora artisti
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((a) => (
                  <li
                    key={a.slug}
                    className="group flex items-center gap-3 px-4 py-3"
                  >
                    <Link
                      href={`/artisti/${a.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {a.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.cover_image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm uppercase">
                          {a.stage_name}
                        </p>
                        {a.city && (
                          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" /> {a.city}
                          </p>
                        )}
                      </div>
                    </Link>
                    <button
                      type="button"
                      aria-label="Rimuovi"
                      onClick={() => remove(a.slug)}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
