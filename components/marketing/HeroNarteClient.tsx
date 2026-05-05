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

  const instrumentsY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const instrumentsScale = useTransform(scrollYProgress, [0, 1], [1, 1.04]);
  const instrumentsRotate = useTransform(scrollYProgress, [0, 1], [0, -1.2]);

  const titleAnim = (delay: number) => ({
    initial: reduce ? false : { y: 40, opacity: 0 },
    animate: reduce ? undefined : { y: 0, opacity: 1 },
    transition: { duration: 1, ease: easing, delay },
  });

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-background pb-10 md:min-h-[100svh] md:pt-40 md:pb-12 lg:pt-44 lg:pb-24"
    >
      {/* MOBILE: banner immagine a tutto schermo, testo sotto */}
      <div className="relative md:hidden">
        <div className="relative h-[70svh] min-h-[480px] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image
            src="/hero-mobile.webp"
            alt="N'arte — la piattaforma degli artisti"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/0 to-background"
          />
        </div>
        <div className="container-narte -mt-8 text-center">
          <motion.h1
            {...titleAnim(0.05)}
            className="font-display tracking-tight"
            style={{ lineHeight: 0.92 }}
          >
            <span className="block text-[14vw] font-normal leading-[0.92] text-foreground">
              N&apos;arte.
            </span>
          </motion.h1>
          <motion.h2
            {...titleAnim(0.18)}
            className="mt-1 font-display tracking-tight text-foreground"
            style={{ lineHeight: 0.95 }}
          >
            <span className="block text-[8vw] leading-[1]">La piattaforma</span>
            <span className="block text-[8vw] leading-[1]">degli artisti.</span>
          </motion.h2>
        </div>
      </div>

      {/* DESKTOP: layout esistente con strumenti parallax */}
      <div className="relative hidden md:block">
        <div
          aria-hidden="true"
          className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 sm:h-[1100px] sm:w-[1100px]"
        />
        <div className="container-narte relative z-10">
          <div className="relative z-20 text-center">
            <motion.h1
              {...titleAnim(0.05)}
              className="font-display tracking-tight"
              style={{ lineHeight: 0.92 }}
            >
              <span className="block text-[7vw] font-normal leading-[0.92] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] lg:text-[7rem] xl:text-[8.5rem]">
                N&apos;arte.
              </span>
            </motion.h1>
            <motion.h2
              {...titleAnim(0.18)}
              className="font-display tracking-tight text-foreground"
              style={{ lineHeight: 0.95 }}
            >
              <span className="block text-[5.5vw] leading-[1] lg:text-[5.5rem] xl:text-[6.5rem]">
                La piattaforma
              </span>
              <span className="mt-1 block text-[5.5vw] leading-[1] lg:text-[5.5rem] xl:text-[6.5rem]">
                degli artisti.
              </span>
            </motion.h2>
          </div>
        </div>

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
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: easing, delay: 0.35 }}
          className="pointer-events-none absolute inset-x-0 top-24 bottom-0 z-30"
        >
          <Image
            src="/hero-strumenti.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="select-none object-cover object-center"
          />
        </motion.div>
      </div>
    </section>
  );
}
