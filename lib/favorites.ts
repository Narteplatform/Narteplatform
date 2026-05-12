"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "narte:favorites:artists";
const EVENT = "narte:favorites:changed";

export type FavoriteArtist = {
  slug: string;
  stage_name: string;
  cover_image: string | null;
  city: string | null;
};

function read(): FavoriteArtist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is FavoriteArtist =>
        a && typeof a.slug === "string" && typeof a.stage_name === "string"
    );
  } catch {
    return [];
  }
}

function write(items: FavoriteArtist[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useFavorites() {
  const [items, setItems] = useState<FavoriteArtist[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(read());
    setHydrated(true);
    const onChange = () => setItems(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const has = useCallback(
    (slug: string) => items.some((a) => a.slug === slug),
    [items]
  );

  const toggle = useCallback((artist: FavoriteArtist) => {
    const cur = read();
    const exists = cur.some((a) => a.slug === artist.slug);
    const next = exists
      ? cur.filter((a) => a.slug !== artist.slug)
      : [artist, ...cur];
    write(next);
    setItems(next);
  }, []);

  const remove = useCallback((slug: string) => {
    const cur = read();
    const next = cur.filter((a) => a.slug !== slug);
    write(next);
    setItems(next);
  }, []);

  return { items, hydrated, has, toggle, remove };
}
