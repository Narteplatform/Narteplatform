"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * Blocco collassabile dell'editor profilo — pattern APG "Disclosure"
 * (button aria-expanded + region), non un accordion.
 *
 * Perché scritto a mano e non @radix-ui/react-accordion: Radix SMONTA il
 * contenuto del pannello chiuso. Qui dentro ci sono un useForm con stato dirty,
 * un useFieldArray e componenti di upload con stato proprio (un caricamento può
 * essere in corso): smontarli butterebbe via modifiche non salvate e
 * interromperebbe l'upload. Qui il contenuto resta SEMPRE montato e `inert` lo
 * toglie da tab order e albero di accessibilità.
 *
 * Le sezioni sono indipendenti e apribili tutte insieme: la semantica accordion
 * (una alla volta, frecce fra i trigger) sarebbe anche sbagliata.
 */

export type SectionStatus = {
  label: string;
  tone: "complete" | "todo" | "count";
};

const TONE_CLASS: Record<SectionStatus["tone"], string> = {
  complete: "border-border text-muted-foreground",
  todo: "border-accent/40 bg-accent/10 text-accent",
  count: "border-border text-muted-foreground",
};

const STORAGE_KEY = "narte:profile-sections";

function readOpenState(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function ProfileSection({
  id,
  title,
  description,
  icon,
  status,
  dirty = false,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  status?: SectionStatus;
  /** Modifiche non salvate: il pallino resta visibile anche a blocco chiuso. */
  dirty?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Lettura in effect, non durante il render: localStorage non esiste sul
  // server e leggerlo qui romperebbe l'idratazione.
  React.useEffect(() => {
    const saved = readOpenState();
    if (typeof saved[id] === "boolean") setOpen(saved[id]);
    if (window.location.hash === `#${id}`) {
      setOpen(true);
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // solo al mount: dopo, lo stato lo comanda l'utente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...readOpenState(), [id]: next })
        );
      } catch {
        // localStorage non disponibile (private browsing): lo stato resta
        // comunque corretto per questa sessione.
      }
      return next;
    });
  }

  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;

  return (
    <Card id={id} className="overflow-hidden">
      <h2>
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground"
        >
          {icon && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
              {icon}
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-display text-base leading-tight">{title}</span>
              {dirty && (
                <span
                  className="size-2 shrink-0 rounded-full bg-accent"
                  title="Modifiche non salvate"
                  aria-label="Modifiche non salvate"
                />
              )}
            </span>
            {description && (
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                {description}
              </span>
            )}
          </span>

          {status && (
            <span
              className={cn(
                "hidden shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-block",
                TONE_CLASS[status.tone]
              )}
            >
              {status.label}
            </span>
          )}

          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </h2>

      <motion.div
        id={panelId}
        ref={panelRef}
        role="region"
        aria-labelledby={triggerId}
        inert={!open}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
        }
        style={{ overflow: "hidden" }}
      >
        <div className="border-t border-border px-5 py-5">{children}</div>
      </motion.div>
    </Card>
  );
}
