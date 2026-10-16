"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { segnaLetta, segnaTutteLette } from "@/app/_actions/notifiche";
import type { NotificaItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

/** Minimo fra due refresh al ritorno sulla finestra, per non martellare il server. */
const REFRESH_MIN_MS = 30_000;

function tempoRelativo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: it });
  } catch {
    return "";
  }
}

export function NotificationBell({
  initialItems,
  initialCount,
}: {
  initialItems: NotificaItem[];
  initialCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificaItem[]>(initialItems);
  const [count, setCount] = React.useState(initialCount);
  const [, startTransition] = React.useTransition();
  const ultimoRefresh = React.useRef(0);

  // Il server ricalcola dopo ogni revalidate/refresh: i suoi dati prevalgono.
  React.useEffect(() => {
    setItems(initialItems);
    setCount(initialCount);
  }, [initialItems, initialCount]);

  // Al ritorno sulla scheda si rilegge dal server (niente realtime).
  React.useEffect(() => {
    const onFocus = () => {
      const adesso = Date.now();
      if (adesso - ultimoRefresh.current < REFRESH_MIN_MS) return;
      ultimoRefresh.current = adesso;
      router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const ripristina = React.useCallback(() => router.refresh(), [router]);

  function apri(n: NotificaItem) {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    setCount((c) => Math.max(0, c - 1));
    setOpen(false);
    startTransition(async () => {
      const res = await segnaLetta(n.id);
      if (!res.ok) ripristina();
    });
    if (n.href) router.push(n.href);
  }

  function tutteLette() {
    setItems([]);
    setCount(0);
    startTransition(async () => {
      const res = await segnaTutteLette();
      if (!res.ok) ripristina();
    });
  }

  const label = count > 0 ? `${count} non lett${count === 1 ? "a" : "e"}` : "nessuna non letta";
  const badge = count > 9 ? "9+" : String(count);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifiche (${label})`}
          className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
        >
          <Bell className="size-[18px]" aria-hidden="true" />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-foreground"
            >
              {badge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))]">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="font-display text-sm tracking-tight">Notifiche</p>
          {items.length > 0 && (
            <button
              type="button"
              onClick={tutteLette}
              className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Segna tutte come lette
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nessuna nuova notifica
          </p>
        ) : (
          <ul className="max-h-[min(24rem,70vh)] overflow-y-auto py-1">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => apri(n)}
                  className={cn(
                    "flex min-h-11 w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition",
                    "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                    "motion-reduce:transition-none"
                  )}
                >
                  <span className="text-sm font-medium text-foreground">{n.title}</span>
                  {n.body && (
                    <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {n.body}
                    </span>
                  )}
                  <span className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                    {tempoRelativo(n.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
