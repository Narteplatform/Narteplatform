"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FaqEntry = {
  id: string;
  question: string;
  answer: ReactNode;
};

/**
 * Oltre questa soglia i pannelli smettono di essere `role="region"`: ogni
 * region è un landmark, e dodici landmark in fila rendono il documento
 * illeggibile con uno screen reader.
 */
const MAX_REGIONS = 6;

/**
 * Accordion di domande frequenti.
 *
 * È una serie di disclosure indipendenti (pattern APG), non un accordion con
 * navigazione a frecce: i trigger sono bottoni normali, quindi Tab li raggiunge
 * tutti e Invio/Spazio li apre, senza roving tabindex da mantenere.
 *
 * I pannelli restano SEMPRE montati e chiusi con height 0 + `inert`, come fa
 * dashboard/profile/ProfileSection. Due motivi concreti: `aria-controls`
 * punterebbe a un id inesistente se il pannello fosse smontato, e le risposte
 * non sarebbero nell'HTML iniziale (le FAQ sono contenuto che vogliamo
 * indicizzato).
 *
 * I colori arrivano da `currentColor`: il componente prende l'inchiostro della
 * sezione che lo ospita e funziona sia su fondo chiaro sia su fondo scuro.
 */
export function FaqAccordion({
  items,
  allowMultiple = false,
  defaultOpenId,
  className,
}: {
  items: FaqEntry[];
  allowMultiple?: boolean;
  defaultOpenId?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [openIds, setOpenIds] = useState<string[]>(
    defaultOpenId ? [defaultOpenId] : []
  );
  const useRegionRole = items.length <= MAX_REGIONS;

  function toggle(id: string) {
    setOpenIds((prev) => {
      const isOpen = prev.includes(id);
      if (allowMultiple) {
        return isOpen ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return isOpen ? [] : [id];
    });
  }

  return (
    <div className={cn("divide-y divide-current/15 border-y border-current/15", className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const triggerId = `faq-${item.id}-trigger`;
        const panelId = `faq-${item.id}-panel`;

        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                id={triggerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-4 rounded-md py-5 text-left transition-colors duration-150 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <span className="text-pretty font-display text-base font-bold md:text-lg">
                  {item.question}
                </span>
                {/* Un "+" che ruota di 45° diventa una "×": la stessa icona dice
                    sia "apri" sia "chiudi" senza sostituzioni a metà transizione. */}
                <Plus
                  aria-hidden="true"
                  className={cn(
                    "size-5 shrink-0 transition-transform duration-220 ease-[var(--ease-out)]",
                    isOpen && "rotate-45"
                  )}
                />
              </button>
            </h3>

            <motion.div
              id={panelId}
              role={useRegionRole ? "region" : undefined}
              aria-labelledby={useRegionRole ? triggerId : undefined}
              initial={false}
              animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }
              }
              className="overflow-hidden"
              inert={!isOpen}
            >
              <p className="max-w-2xl text-pretty pb-6 pr-8 text-sm leading-relaxed opacity-70 md:text-base">
                {item.answer}
              </p>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
