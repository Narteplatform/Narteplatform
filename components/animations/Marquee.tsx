"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

/**
 * Nastro orizzontale a scorrimento continuo.
 *
 * `speed` è la durata in secondi di un giro completo, non una velocità: più
 * basso = più veloce.
 *
 * Il binario è duplicato per chiudere il loop. Le due copie stanno in due
 * gruppi di larghezza identica — `pr-12` compensa il gap che manca in coda —
 * così `-50%` corrisponde esattamente a un gruppo e la giunzione non si vede.
 * La copia è `aria-hidden` + `inert`: senza, ogni figlio verrebbe annunciato
 * due volte e occuperebbe due posizioni nel tab order.
 */
export function Marquee({
  children,
  speed = 30,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // ⚠️  `pr-*` deve sempre valere quanto il `gap-*`: compensa il gap che manca
  //     in coda al gruppo, ed è ciò che rende invisibile la giunzione fra le
  //     due copie. Cambiando l'uno va cambiato l'altro, breakpoint compreso.
  //     Su mobile il passo è più stretto: a 48px di gap su uno schermo da 390
  //     entrava in pratica un logo per volta, con l'aria intorno a farla da
  //     padrona.
  const track = "flex w-max shrink-0 items-center gap-8 pr-8 sm:gap-12 sm:pr-12";

  // Con reduced motion il nastro diventa una striscia che si scorre a mano.
  // Senza `overflow-x-auto` i contenuti sborderebbero dal contenitore e a
  // trascinare sarebbe la pagina, con scroll orizzontale su mobile.
  if (reduce) {
    return (
      <div className={`overflow-x-auto ${className ?? ""}`}>
        <div className={track}>{children}</div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <motion.div
        className="flex w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        <div className={track}>{children}</div>
        <div className={track} aria-hidden="true" inert>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
