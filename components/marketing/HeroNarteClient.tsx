"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export type HeroArtistImage = { src: string; alt: string };

const easing = [0.22, 1, 0.36, 1] as const;

export function HeroNarteClient(_props: { images?: HeroArtistImage[] }) {
  const reduce = useReducedMotion();
  const sectionRef = React.useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const instrumentsY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const instrumentsScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const instrumentsRotate = useTransform(scrollYProgress, [0, 1], [0, -3]);

  const titleAnim = (delay: number) => ({
    initial: reduce ? false : { y: 40, opacity: 0 },
    animate: reduce ? undefined : { y: 0, opacity: 1 },
    transition: { duration: 1, ease: easing, delay },
  });

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] w-full overflow-hidden bg-background pt-24 pb-16 lg:pt-28 lg:pb-24"
    >
      {/* Glow di sfondo */}
      <div
        aria-hidden="true"
        className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[1100px] w-[1100px] -translate-x-1/2 -translate-y-1/2"
      />

      <div className="container-narte relative z-10">
        {/* Headline */}
        <div className="relative z-20 text-center">
          <motion.h1
            {...titleAnim(0.05)}
            className="font-display tracking-tight"
            style={{ lineHeight: 0.92 }}
          >
            <span className="block text-[10vw] font-normal leading-[0.92] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] sm:text-[8.5vw] md:text-[6rem] lg:text-[7rem] xl:text-[8.5rem]">
              N&apos;arte.
            </span>
          </motion.h1>
          <motion.h2
            {...titleAnim(0.18)}
            className="font-display tracking-tight text-foreground"
            style={{ lineHeight: 0.92 }}
          >
            <span className="block text-[10vw] leading-[0.92] sm:text-[8.5vw] md:text-[6rem] lg:text-[7rem] xl:text-[8.5rem]">
              La piattaforma
            </span>
            <span className="mt-1 block text-[10vw] leading-[0.92] sm:text-[8.5vw] md:text-[6rem] lg:text-[7rem] xl:text-[8.5rem]">
              degli artisti.
            </span>
          </motion.h2>
        </div>
      </div>

      {/* Strumenti — full screen, sovrappongono il testo */}
      <motion.div
        aria-hidden="true"
        style={
          reduce
            ? undefined
            : {
                y: instrumentsY,
                scale: instrumentsScale,
                rotate: instrumentsRotate,
              }
        }
        initial={reduce ? false : { opacity: 0, y: 60 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: easing, delay: 0.35 }}
        className="pointer-events-none absolute inset-0 z-30"
      >
        <Image
          src="/hero-strumenti.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center select-none"
        />
      </motion.div>
    </section>
  );
}
