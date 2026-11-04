"use client";

import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import type { NotificaItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

function tempoRelativo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: it });
  } catch {
    return "";
  }
}

/**
 * Una notifica in elenco (campanella e pagina Notifiche). Non letta: pallino
 * corallo e testo pieno. Letta: in trasparenza, resta consultabile.
 * `compatta` (campanella) tronca il testo a due righe; la pagina lo mostra intero.
 */
export function NotificaRiga({
  n,
  onOpen,
  compatta = false,
}: {
  n: NotificaItem;
  onOpen: (n: NotificaItem) => void;
  compatta?: boolean;
}) {
  const letta = Boolean(n.read_at);
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        "flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left transition",
        "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-corallo",
        "motion-reduce:transition-none",
        !letta && "bg-corallo-subtle/60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", letta ? "bg-transparent" : "bg-corallo")}
      />
      <span className={cn("flex min-w-0 flex-1 flex-col gap-0.5", letta && "opacity-55")}>
        <span className={cn("text-sm text-foreground", letta ? "font-normal" : "font-semibold")}>
          {n.title}
          {!letta && <span className="sr-only"> (non letta)</span>}
        </span>
        {n.body && (
          <span
            className={cn(
              "text-xs leading-relaxed text-muted-foreground",
              compatta ? "line-clamp-2" : "whitespace-pre-line",
            )}
          >
            {n.body}
          </span>
        )}
        <span className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground/80">
          {tempoRelativo(n.created_at)}
        </span>
      </span>
    </button>
  );
}
