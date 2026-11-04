"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { switchArtistProfile } from "@/app/(artist)/dashboard/profili/_actions";
import type { OwnedArtist } from "@/lib/artist/current";

/**
 * Selettore del profilo artista attivo.
 *
 * Compare solo se l'account possiede più di un profilo, oppure se il piano ne
 * consente altri: a un artista Free con un solo profilo non serve un menu a
 * tendina con dentro una voce sola.
 *
 * Ogni profilo ha le sue chat, richieste e notifiche: accanto a ciascuno c'e'
 * il numero delle sue novita' (`news`), e un pallino sul pulsante avvisa quando
 * ne ha un profilo diverso da quello attivo. Per questo non e' piu' un <select>
 * nativo: un <option> non puo' contenere un badge.
 */
export function ArtistProfileSwitcher({
  owned,
  activeId,
  canCreateMore,
  news = {},
}: {
  owned: OwnedArtist[];
  activeId: string | null;
  canCreateMore: boolean;
  news?: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  // Arrivo da /dashboard/profili/passa: avviso del cambio e pulizia dell'URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    const passato = url.searchParams.get("profilo");
    if (!passato) return;
    const nome = owned.find((a) => a.id === passato)?.stage_name;
    if (nome) toast(`Sei ora su «${nome}»`);
    url.searchParams.delete("profilo");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [owned]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelectorAll<HTMLElement>("[role=option]")[focusIndex]?.focus();
  }, [open, focusIndex]);

  if (owned.length <= 1 && !canCreateMore) return null;

  function choose(id: string) {
    setOpen(false);
    if (id === activeId) return;
    start(async () => {
      const res = await switchArtistProfile(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function openMenu() {
    const i = owned.findIndex((a) => a.id === activeId);
    setFocusIndex(i >= 0 ? i : 0);
    setOpen(true);
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      rootRef.current?.querySelector<HTMLElement>("button")?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => Math.min(owned.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const attivo = owned.find((a) => a.id === activeId) ?? null;
  const altreNovita = owned
    .filter((a) => a.id !== activeId)
    .reduce((sum, a) => sum + (news[a.id] ?? 0), 0);

  return (
    <div className="flex items-center gap-2">
      {owned.length > 1 && attivo ? (
        <Avatar artist={attivo} />
      ) : null}
      {owned.length > 1 ? (
        <div ref={rootRef} className="relative">
          <button
            type="button"
            disabled={pending}
            onClick={() => (open ? setOpen(false) : openMenu())}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && !open) {
                e.preventDefault();
                openMenu();
              }
            }}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={
              altreNovita > 0
                ? `Profilo artista attivo: ${attivo?.stage_name ?? ""}. Novità su altri profili: ${altreNovita}`
                : `Profilo artista attivo: ${attivo?.stage_name ?? ""}`
            }
            className="relative inline-flex h-9 max-w-[14rem] items-center gap-2 rounded-md border border-border bg-background pl-3 pr-2 text-sm disabled:opacity-50"
          >
            <span className="truncate">{attivo?.stage_name ?? "Scegli profilo"}</span>
            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            {altreNovita > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 size-2.5 rounded-full bg-corallo ring-2 ring-background"
              />
            )}
          </button>

          {open && (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Profili artista"
              onKeyDown={onListKey}
              className="absolute left-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-background p-1 shadow-lg"
            >
              {owned.map((a, i) => {
                const n = news[a.id] ?? 0;
                const selected = a.id === activeId;
                return (
                  <li
                    key={a.id}
                    role="option"
                    aria-selected={selected}
                    tabIndex={i === focusIndex ? 0 : -1}
                    onClick={() => choose(a.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        choose(a.id);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-none hover:bg-muted focus-visible:bg-muted"
                  >
                    <Avatar artist={a} small />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.stage_name}</span>
                      {a.status !== "approved" && (
                        <span className="block text-xs text-muted-foreground">In revisione</span>
                      )}
                    </span>
                    {n > 0 && (
                      <span
                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-corallo px-1.5 text-[11px] font-semibold text-white"
                        aria-label={`${n} novità`}
                      >
                        {n > 99 ? "99+" : n}
                      </span>
                    )}
                    {selected && <Check className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  </li>
                );
              })}
            </ul>
          )}
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

function Avatar({ artist, small = false }: { artist: OwnedArtist; small?: boolean }) {
  const size = small ? "size-7" : "size-9";
  return artist.cover_image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={artist.cover_image} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      aria-hidden="true"
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold`}
    >
      {artist.stage_name.slice(0, 1).toUpperCase()}
    </span>
  );
}
