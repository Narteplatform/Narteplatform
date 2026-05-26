"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const easing = [0.22, 1, 0.36, 1] as const;

// Sfondo concerto Unsplash — folla + luci palco. Sostituibile con asset locale.
const CONCERT_BG =
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=2400&q=80";

export function HeroNarteClient() {
  const reduce = useReducedMotion();

  const titleAnim = (delay: number) => ({
    initial: reduce ? false : { y: 32, opacity: 0 },
    animate: reduce ? undefined : { y: 0, opacity: 1 },
    transition: { duration: 1, ease: easing, delay },
  });

  return (
    <section className="relative isolate w-full overflow-hidden bg-notte">
      {/* Background concerto con opacita' abbassata */}
      <div className="absolute inset-0 -z-10">
        <Image
          src={CONCERT_BG}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-40"
        />
        {/* Overlay scuro per garantire leggibilita' del titolo */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-notte/60 via-notte/40 to-notte/80"
        />
      </div>

      <div className="relative z-10 flex min-h-[78svh] items-center justify-center px-6 py-28 md:min-h-[100svh] md:py-40">
        <div className="text-center">
          <motion.h1
            {...titleAnim(0.05)}
            className="font-display tracking-tight text-palco"
            style={{ lineHeight: 0.92 }}
          >
            <span className="block text-[18vw] font-black leading-[0.92] drop-shadow-[0_6px_28px_rgba(0,0,0,0.6)] sm:text-[14vw] md:text-[10vw] lg:text-[9rem] xl:text-[11rem]">
              N&apos;Arte.
            </span>
          </motion.h1>
          <motion.h2
            {...titleAnim(0.2)}
            className="mt-2 font-display tracking-tight text-palco"
            style={{ lineHeight: 0.95 }}
          >
            <span className="block text-[7vw] font-semibold leading-[1.05] md:text-[3.5vw] lg:text-[2.75rem] xl:text-[3.25rem]">
              La piattaforma{" "}
              <span className="italic text-azzurro-light">degli artisti</span>
            </span>
          </motion.h2>
        </div>
      </div>
    </section>
  );
}
