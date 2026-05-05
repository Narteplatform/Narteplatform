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
            <span className="block text-[16vw] font-normal leading-[0.92] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] sm:text-[14vw] md:text-[10rem] lg:text-[12rem] xl:text-[14rem]">
              N&apos;ARTE.
            </span>
          </motion.h1>
          <motion.h2
            {...titleAnim(0.18)}
            className="mt-2 font-display tracking-tight text-foreground/90"
            style={{ lineHeight: 0.95 }}
          >
            <span className="block text-[5vw] leading-[1] sm:text-[4vw] md:text-[2.75rem] lg:text-[3.25rem] xl:text-[3.75rem]">
              La piattaforma degli artisti.
            </span>
          </motion.h2>
        </div>

        {/* Strumenti — sovrappongono il testo */}
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
          className="pointer-events-none absolute inset-x-0 top-0 z-30 mx-auto flex h-full w-full max-w-[1400px] items-center justify-center px-4"
        >
          <div className="relative h-full w-full">
            <Image
              src="/hero-strumenti.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 1400px, 100vw"
              className="object-contain object-center select-none"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
