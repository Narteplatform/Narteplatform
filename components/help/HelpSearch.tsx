"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import type { HelpCategory, HelpArticle } from "@/lib/help/content";

type Indexed = { category: HelpCategory; article: HelpArticle; hay: string };

export function HelpSearch({
  index,
  placeholder = "Cerca nel Centro Assistenza…",
  size = "lg",
}: {
  index: { category: HelpCategory; article: HelpArticle }[];
  placeholder?: string;
  size?: "lg" | "sm";
}) {
  const [query, setQuery] = useState("");

  const items: Indexed[] = useMemo(
    () =>
      index.map((i) => ({
        ...i,
        hay: `${i.article.title} ${i.article.excerpt}`.toLowerCase(),
      })),
    [index]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return items.filter((i) => i.hay.includes(q)).slice(0, 8);
  }, [items, query]);

  const open = query.trim().length >= 2;
  const inputClass =
    size === "lg"
      ? "h-14 w-full rounded-full border border-border bg-background pl-14 pr-5 text-base shadow-lg shadow-black/5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      : "h-11 w-full rounded-full border border-border bg-background pl-11 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
  const iconClass =
    size === "lg"
      ? "pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
      : "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground";

  return (
    <div className="relative">
      <Search className={iconClass} />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
        aria-label="Cerca aiuto"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
          {results.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              Nessun risultato per <strong>"{query}"</strong>. Prova con altre parole.
            </p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {results.map((r) => (
                <li key={`${r.category.slug}/${r.article.slug}`}>
                  <Link
                    href={`/help/${r.category.slug}/${r.article.slug}`}
                    className="group flex items-start gap-4 border-b border-border px-5 py-4 last:border-b-0 hover:bg-muted/40"
                    onClick={() => setQuery("")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                        {r.category.title}
                      </p>
                      <p className="mt-1 font-display text-base group-hover:text-accent">
                        {r.article.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {r.article.excerpt}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
