"use client";

import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PhotoWithFallback } from "@/components/marketing/PhotoWithFallback";
import type { Milestone } from "@/lib/content/milestones";

/**
 * Linea del tempo delle tappe di N'arte.
 *
 * Accessibilità: è un `tablist` costruito su @radix-ui/react-tabs (già in
 * dipendenza). Radix porta roving tabindex, frecce, Home/End e la coppia
 * aria-selected / aria-controls corretta — riscriverli a mano qui sarebbe
 * riscrivere codice che abbiamo già. Si importa Radix direttamente e non
 * components/ui/Tabs.tsx perché quel wrapper è una pill-bar (rounded-full,
 * bg-muted, trigger h-8) e andrebbe smontato a colpi di override.
 *
 * `activationMode="manual"`: la freccia sposta il focus, Invio o Spazio
 * aprono. Con l'attivazione automatica ogni passaggio di focus farebbe partire
 * l'animazione del pannello.
 *
 * `orientation` resta "horizontal" a ogni larghezza: Radix non ha un
 * orientamento responsive e alternarlo con una media query lato JS
 * introdurrebbe un disallineamento di idratazione. Sotto lg i pallini sono
 * impilati ma ← → continuano a funzionare, ed è il compromesso migliore.
 *
 * Il rail diventa orizzontale da lg e non da md: con sei tappe, a 768px ogni
 * colonna scende sotto i 110px e titoli come "Capodanno in Piazza del
 * Plebiscito" si spezzano su cinque righe. Da 1024px in su le colonne stanno
 * sopra i 150px e il titolo respira. Se le tappe diventano molte di più,
 * conviene rivedere il breakpoint (o passare a un rail scorrevole).
 */
export function MilestonesTimeline({
  items,
  initialSelectedId,
  className,
}: {
  items: Milestone[];
  initialSelectedId?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(
    initialSelectedId ?? items[0]?.id ?? ""
  );

  if (items.length === 0) return null;

  // La linea deve partire dal centro del primo pallino e finire in quello
  // dell'ultimo: con i trigger a larghezza uguale il centro cade a mezza
  // colonna dal bordo, cioè 50/n percento.
  const halfColumn = `${50 / items.length}%`;

  return (
    <Tabs.Root
      value={value}
      onValueChange={setValue}
      orientation="horizontal"
      activationMode="manual"
      className={className}
    >
      <div className="relative">
        {/* Due linee distinte, mai visibili insieme: una verticale sotto lg
            (left-5 = centro di un pallino size-10) e una orizzontale da lg
            (top-8 = centro di un pallino size-16). Sono separate perché
            l'orizzontale ha bisogno di un inset calcolato che la verticale non
            usa. */}
        <span
          aria-hidden="true"
          className="absolute bottom-5 left-5 top-5 w-px bg-border lg:hidden"
        />
        <span
          aria-hidden="true"
          style={{ left: halfColumn, right: halfColumn }}
          className="absolute top-8 hidden h-px bg-border lg:block"
        />

        <Tabs.List
          aria-label="Le tappe di N'arte"
          className="relative flex flex-col gap-6 lg:flex-row lg:gap-4"
        >
          {items.map((m) => {
            const isActive = m.id === value;
            return (
              <Tabs.Trigger
                key={m.id}
                value={m.id}
                className="group flex items-center gap-4 rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 lg:flex-1 lg:flex-col lg:items-center lg:gap-0 lg:text-center"
              >
                <span
                  className={cn(
                    "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-muted transition-colors duration-220 ease-[var(--ease-out)] lg:size-16",
                    isActive
                      ? "border-accent"
                      : "border-border group-hover:border-muted-foreground"
                  )}
                >
                  <PhotoWithFallback
                    src={m.photo}
                    alt={m.photoAlt}
                    className={cn(
                      "size-full object-cover transition-[filter,opacity] duration-220 ease-[var(--ease-out)]",
                      !isActive && "opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0"
                    )}
                    fallback={
                      <span
                        aria-hidden="true"
                        className="font-display text-[11px] font-bold tabular-nums text-muted-foreground lg:text-sm"
                      >
                        {m.year}
                      </span>
                    }
                  />
                  {/* L'anello attivo scivola da un pallino all'altro con
                      layoutId. Con reduced motion niente layoutId: il
                      kill-switch CSS di globals.css non ferma i transform
                      inline di Framer Motion, serve la guardia qui. */}
                  {isActive &&
                    (reduce ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full ring-2 ring-accent"
                      />
                    ) : (
                      <motion.span
                        aria-hidden="true"
                        layoutId="milestone-ring"
                        className="absolute inset-0 rounded-full ring-2 ring-accent"
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      />
                    ))}
                </span>

                <span className="min-w-0 lg:mt-4">
                  <span
                    className={cn(
                      "narte-label block transition-colors",
                      isActive ? "text-accent" : "text-muted-foreground"
                    )}
                  >
                    {m.year}
                  </span>
                  <span className="mt-1 block text-balance font-display text-base font-bold leading-tight lg:text-[15px] xl:text-base">
                    {m.title}
                  </span>
                </span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
      </div>

      {/* Il pannello sta sotto tutto il rail a entrambi i breakpoint: Radix
          vuole i Content come fratelli della List, quindi non può stare
          inline sotto il singolo pallino senza duplicare il contenuto. */}
      <div className="mt-8 md:mt-12">
        {items.map((m) => (
          <Tabs.Content
            key={m.id}
            value={m.id}
            className="rounded-2xl border border-border bg-card p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:p-8"
          >
            {/* Niente AnimatePresence: Radix monta solo il pannello attivo, e
                il cambio di `key` fa ripartire l'animazione d'ingresso. Senza
                uscita non c'è il collasso a zero che farebbe saltare il layout. */}
            <motion.div
              key={m.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduce ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }
              }
            >
              <p className="narte-label text-accent">{m.date}</p>
              <h3 className="mt-2 text-balance font-display text-2xl font-bold md:text-3xl">
                {m.title}
              </h3>
              <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
                {m.description}
              </p>
            </motion.div>
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
