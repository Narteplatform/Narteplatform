"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { segnaLetta, segnaTutteLette } from "@/app/_actions/notifiche";
import type { AreaNotifiche, NotificaItem } from "@/lib/notifications/types";
import { NotificaRiga } from "@/components/notifications/NotificaRiga";
import { useNotificheRealtime } from "@/hooks/useNotificheRealtime";

function gruppo(iso: string): "Oggi" | "Questa settimana" | "Prima" {
  const d = new Date(iso);
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  if (d >= oggi) return "Oggi";
  if (d.getTime() >= oggi.getTime() - 6 * 86_400_000) return "Questa settimana";
  return "Prima";
}

/**
 * Pagina Notifiche: elenco completo, raggruppato come su Instagram (Oggi /
 * Questa settimana / Prima), con il testo intero. Le lette restano in
 * trasparenza per 30 giorni; poi la query lato server smette di mostrarle
 * (nessuna cancellazione).
 */
export function NotificheElenco({
  initialItems,
  area,
  userId,
}: {
  initialItems: NotificaItem[];
  area: AreaNotifiche;
  userId: string;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [, start] = React.useTransition();

  React.useEffect(() => setItems(initialItems), [initialItems]);

  // Nuove notifiche: si rilegge dal server, che applica filtro per profilo e link.
  useNotificheRealtime(
    userId,
    React.useCallback(() => router.refresh(), [router]),
  );

  const nonLette = items.filter((n) => !n.read_at).length;

  function apri(n: NotificaItem) {
    if (!n.read_at) {
      const adesso = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: adesso } : x)));
      start(async () => {
        await segnaLetta(n.id);
      });
    }
    if (n.link) router.push(n.link);
  }

  function tutteLette() {
    const adesso = new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.read_at ? x : { ...x, read_at: adesso })));
    start(async () => {
      const res = await segnaTutteLette(area);
      if (!res.ok) router.refresh();
    });
  }

  const gruppi = (["Oggi", "Questa settimana", "Prima"] as const)
    .map((g) => ({ g, righe: items.filter((n) => gruppo(n.created_at) === g) }))
    .filter((x) => x.righe.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight md:text-3xl">Notifiche</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {nonLette > 0
              ? `${nonLette} da leggere. Le notifiche lette restano qui per 30 giorni.`
              : "Sei in pari. Le notifiche lette restano qui per 30 giorni."}
          </p>
        </div>
        {nonLette > 0 && (
          <button
            type="button"
            onClick={tutteLette}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corallo"
          >
            Segna tutte come lette
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <Bell className="size-8 text-corallo" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nessuna notifica negli ultimi 30 giorni.</p>
        </div>
      ) : (
        gruppi.map(({ g, righe }) => (
          <section key={g} aria-labelledby={`notifiche-${g}`}>
            <h2 id={`notifiche-${g}`} className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {g}
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
              {righe.map((n) => (
                <li key={n.id}>
                  <NotificaRiga n={n} onOpen={apri} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
