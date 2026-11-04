"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { segnaLetta, segnaTutteLette } from "@/app/_actions/notifiche";
import { linkNotifica, type NotificaItem, type NotificheIniziali } from "@/lib/notifications/types";
import { activeArtistFromCookie } from "@/lib/artist/active-cookie-client";
import { useNotificheRealtime, type NotificaRealtime } from "@/hooks/useNotificheRealtime";
import { NotificaRiga } from "@/components/notifications/NotificaRiga";

/** Minimo fra due refresh al ritorno sulla finestra, per non martellare il server. */
const REFRESH_MIN_MS = 30_000;

/** Tipi di notifica che hanno gia' il loro toast (useUnreadToasts, chat). */
const SENZA_TOAST = new Set(["messaggio_chat"]);

/**
 * Campanella della topbar (artista, organizzatore, superadmin).
 *
 * Corallo quando c'e' qualcosa da leggere. Le notifiche lette non spariscono:
 * restano in trasparenza (per 30 giorni, lo decide la query lato server).
 * Arrivano in tempo reale (useNotificheRealtime); ogni evento fa anche un
 * router.refresh() ritardato, cosi' i badge della sidebar si aggiornano da soli.
 */
export function NotificationBell({ notifications }: { notifications: NotificheIniziali }) {
  const { userId, area, pageHref } = notifications;
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificaItem[]>(notifications.items);
  const [count, setCount] = React.useState(notifications.count);
  const [, startTransition] = React.useTransition();
  const ultimoRefresh = React.useRef(0);
  const refreshTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Il server ricalcola dopo ogni revalidate/refresh: i suoi dati prevalgono.
  React.useEffect(() => {
    setItems(notifications.items);
    setCount(notifications.count);
  }, [notifications.items, notifications.count]);

  const refreshRitardato = React.useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      ultimoRefresh.current = Date.now();
      router.refresh();
    }, 800);
  }, [router]);

  React.useEffect(
    () => () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    },
    [],
  );

  // Ripiego se il realtime non e' disponibile: rilettura al ritorno sulla scheda.
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

  const onRealtime = React.useCallback(
    (n: NotificaRealtime, tipo: "INSERT" | "UPDATE") => {
      refreshRitardato();
      const active = area === "artist" ? activeArtistFromCookie() : null;
      // Notifica di un altro profilo: la segnala il badge nel selettore profilo
      // (aggiornato dal refresh), non la campanella di questo profilo.
      if (area === "artist" && n.artist_id && active && n.artist_id !== active) return;
      if (n.read_at) return;

      const item: NotificaItem = { ...n, link: linkNotifica(n, active) };
      // UPDATE = notifica raggruppata (chat) che risale in cima: non e' nuova,
      // il conteggio non cambia.
      setItems((prev) => [item, ...prev.filter((x) => x.id !== n.id)]);
      if (tipo === "INSERT") setCount((c) => c + 1);

      if (tipo === "INSERT" && !SENZA_TOAST.has(n.kind)) {
        toast(n.title, {
          description: n.body ?? undefined,
          duration: 6000,
          action: item.link
            ? {
                label: "Apri",
                onClick: () => {
                  void segnaLetta(n.id);
                  router.push(item.link as string);
                },
              }
            : undefined,
        });
      }
    },
    [area, refreshRitardato, router],
  );

  useNotificheRealtime(userId, onRealtime);

  const ripristina = React.useCallback(() => router.refresh(), [router]);

  function apri(n: NotificaItem) {
    if (!n.read_at) {
      const adesso = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: adesso } : x)));
      setCount((c) => Math.max(0, c - 1));
      startTransition(async () => {
        const res = await segnaLetta(n.id);
        if (!res.ok) ripristina();
      });
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  function tutteLette() {
    const adesso = new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.read_at ? x : { ...x, read_at: adesso })));
    setCount(0);
    startTransition(async () => {
      const res = await segnaTutteLette(area);
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
          className={[
            "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border bg-background transition hover:bg-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corallo focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
            count > 0 ? "border-corallo/50 text-corallo" : "border-border text-corallo/80",
          ].join(" ")}
        >
          <Bell className="size-[18px]" aria-hidden="true" fill={count > 0 ? "currentColor" : "none"} />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-corallo px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-background"
            >
              {badge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="font-display text-sm tracking-tight">Notifiche</p>
          {count > 0 && (
            <button
              type="button"
              onClick={tutteLette}
              className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corallo"
            >
              Segna tutte come lette
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nessuna notifica</p>
        ) : (
          <ul className="max-h-[min(26rem,65vh)] overflow-y-auto py-1">
            {items.map((n) => (
              <li key={n.id}>
                <NotificaRiga n={n} onOpen={apri} compatta />
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border p-2">
          <Link
            href={pageHref}
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center justify-center rounded-md text-sm font-medium text-corallo hover:bg-corallo-subtle"
          >
            Vedi tutte le notifiche
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
