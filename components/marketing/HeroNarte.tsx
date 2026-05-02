"use client";

import { motion, useReducedMotion } from "framer-motion";

const easing = [0.22, 1, 0.36, 1] as const;

export function HeroNarte() {
  const reduce = useReducedMotion();
  const initial = reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 };
  const animate = reduce ? undefined : { clipPath: "inset(0 0% 0 0)", opacity: 1 };

  return (
    <section className="container-narte pt-8 pb-12">
      <motion.h1
        initial={initial}
        animate={animate}
        transition={{ duration: 1.1, ease: easing }}
        className="display-xl text-[22vw] leading-[0.9] md:text-[18vw]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2000&q=70')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "contrast(1.05)",
        }}
        aria-label="N'arte"
      >
        N&apos;ARTE
      </motion.h1>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: easing }}
        className="mt-6 h-40 w-full overflow-hidden md:h-56"
      >
        <img
          src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2000&q=70"
          alt="Pubblico a un concerto N'arte"
          className="h-full w-full object-cover"
          loading="eager"
        />
      </motion.div>
    </section>
  );
}
