"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export type HeroArtistImage = { src: string; alt: string };

const easing = [0.22, 1, 0.36, 1] as const;

// Posizioni delle immagini fluttuanti attorno al phone (% relativi al wrapper).
// Mix di slot più alti e più bassi per dare profondità.
type FloatPos = {
  top: string;
  left?: string;
  right?: string;
  width: string;
  rotate: number;
  z: number;
  fromX: number;
  fromY: number;
  delay: number;
  floatX?: string;
  floatY?: string;
};

const POSITIONS: FloatPos[] = [
  // Sinistra alta
  { top: "18%", left: "2%", width: "180px", rotate: -10, z: 20, fromX: -120, fromY: -40, delay: 0.55, floatX: "0px", floatY: "0px" },
  // Sinistra centro
  { top: "44%", left: "-3%", width: "200px", rotate: -6, z: 15, fromX: -160, fromY: 20, delay: 0.65 },
  // Sinistra bassa
  { top: "62%", left: "8%", width: "210px", rotate: 4, z: 18, fromX: -100, fromY: 80, delay: 0.75 },
  // Centro basso (sotto il phone)
  { top: "70%", left: "32%", width: "300px", rotate: -2, z: 5, fromX: 0, fromY: 120, delay: 0.85 },
  // Destra bassa
  { top: "62%", right: "5%", width: "240px", rotate: 8, z: 18, fromX: 100, fromY: 80, delay: 0.78 },
  // Destra centro
  { top: "38%", right: "-2%", width: "220px", rotate: 10, z: 15, fromX: 160, fromY: 0, delay: 0.68 },
  // Destra alta
  { top: "12%", right: "6%", width: "190px", rotate: -8, z: 20, fromX: 120, fromY: -50, delay: 0.58 },
  // Centro alto (dietro al phone, piccolo)
  { top: "5%", left: "42%", width: "150px", rotate: 4, z: 8, fromX: 0, fromY: -80, delay: 0.5 },
];

export function HeroNarteClient({ images }: { images: HeroArtistImage[] }) {
  const reduce = useReducedMotion();

  const titleAnim = (delay: number) => ({
    initial: reduce ? false : { y: 40, opacity: 0 },
    animate: reduce ? undefined : { y: 0, opacity: 1 },
    transition: { duration: 1, ease: easing, delay },
  });

  const phoneAnim = {
    initial: reduce ? false : { y: 60, opacity: 0, scale: 0.92 },
    animate: reduce ? undefined : { y: 0, opacity: 1, scale: 1 },
    transition: { duration: 1.1, ease: easing, delay: 0.3 },
  };

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-background pt-24 pb-16 lg:pt-28 lg:pb-24">
      {/* Glow di sfondo (radial verde-viola) */}
      <div
        aria-hidden="true"
        className="hero-glow-ring pointer-events-none absolute left-1/2 top-1/2 h-[1100px] w-[1100px] -translate-x-1/2 -translate-y-1/2"
      />

      <div className="container-narte relative z-10">
        {/* Headline */}
        <div className="text-center">
          <motion.h1
            {...titleAnim(0.05)}
            className="font-display tracking-tight"
            style={{ lineHeight: 0.92 }}
          >
            <span className="hero-text-stroke block text-[12vw] font-normal leading-[0.92] sm:text-[10vw] md:text-[7.5rem] lg:text-[8.5rem] xl:text-[10rem]">
              N&apos;arte.
            </span>
          </motion.h1>
          <motion.h2
            {...titleAnim(0.18)}
            className="font-display tracking-tight text-foreground"
            style={{ lineHeight: 0.92 }}
          >
            <span className="block text-[12vw] leading-[0.92] sm:text-[10vw] md:text-[7.5rem] lg:text-[8.5rem] xl:text-[10rem]">
              La piattaforma
            </span>
            <span className="mt-1 block text-[12vw] leading-[0.92] sm:text-[10vw] md:text-[7.5rem] lg:text-[8.5rem] xl:text-[10rem]">
              degli artisti.
            </span>
          </motion.h2>
        </div>

        {/* Stage: phone + immagini fluttuanti */}
        <div className="relative mx-auto mt-10 h-[560px] w-full max-w-5xl sm:h-[620px] md:mt-14 md:h-[640px] lg:h-[680px]">
          {/* Arco luminoso sotto il phone */}
          <div
            aria-hidden="true"
            className="hero-glow-arc pointer-events-none absolute inset-x-0 bottom-0 h-[280px]"
          />

          {/* Floating artist images */}
          {POSITIONS.map((pos, i) => {
            const img = images[i % images.length];
            return (
              <motion.div
                key={i}
                initial={
                  reduce ? false : { x: pos.fromX, y: pos.fromY, opacity: 0, scale: 0.85 }
                }
                animate={
                  reduce ? undefined : { x: 0, y: 0, opacity: 1, scale: 1 }
                }
                transition={{ duration: 1.1, ease: easing, delay: pos.delay }}
                style={{
                  top: pos.top,
                  left: pos.left,
                  right: pos.right,
                  width: pos.width,
                  zIndex: pos.z,
                }}
                className="absolute"
              >
                <div
                  className="hero-float-anim overflow-hidden rounded-2xl border border-white/10 bg-muted shadow-2xl"
                  style={
                    {
                      "--fr": `${pos.rotate}deg`,
                      transform: `rotate(${pos.rotate}deg)`,
                      animationDelay: `${i * 0.4}s`,
                    } as React.CSSProperties
                  }
                >
                  <div className="relative aspect-[16/10] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="h-full w-full object-cover"
                      loading="eager"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Phone mockup (centro, sopra a tutto) */}
          <motion.div
            {...phoneAnim}
            className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
            style={{ width: "280px" }}
          >
            <PhoneMockup images={images} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup({ images }: { images: HeroArtistImage[] }) {
  return (
    <div className="relative mx-auto aspect-[9/19.5] w-[280px] rounded-[42px] border border-white/15 bg-[#0d0d0d] p-1.5 shadow-[0_30px_80px_-15px_rgba(196,255,90,0.25)]">
      <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-[#0a0a0a]">
        {/* Notch */}
        <div className="absolute left-1/2 top-2 z-20 h-[26px] w-[100px] -translate-x-1/2 rounded-full bg-black" />

        {/* Screen content */}
        <div className="flex h-full flex-col px-4 pb-4 pt-12 text-white">
          {/* Status bar */}
          <div className="flex items-center justify-between text-[10px] font-medium">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            </div>
          </div>

          {/* Header */}
          <div className="mt-4 flex items-center justify-between">
            <h3 className="font-display text-2xl tracking-tight">Scopri</h3>
            <div className="size-7 overflow-hidden rounded-full bg-gradient-to-br from-purple-400 to-pink-500" />
          </div>

          {/* Tabs */}
          <div className="mt-3 flex gap-1.5 text-[10px] font-medium">
            <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">Tutti</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/80">Artisti</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/80">Eventi</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/80">Generi</span>
          </div>

          {/* Generi popolari */}
          <p className="mt-4 text-[11px] font-semibold text-white/90">Generi popolari</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-[10px] font-semibold">
              Pop
            </div>
            <div className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-[10px] font-semibold">
              Rock
            </div>
            <div className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-[10px] font-semibold text-black">
              Jazz
            </div>
            <div className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-[10px] font-semibold">
              House
            </div>
          </div>

          {/* Artisti emergenti */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-white/90">Artisti emergenti</p>
            <ChevronDown className="size-3 text-white/50" />
          </div>
          <div className="mt-2 flex flex-1 flex-col gap-1.5 overflow-hidden">
            {images.slice(0, 3).map((img, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-white/5 p-1.5"
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-md bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.src} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-medium">{img.alt || "Artista"}</p>
                  <p className="truncate text-[8px] text-white/50">In primo piano</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
