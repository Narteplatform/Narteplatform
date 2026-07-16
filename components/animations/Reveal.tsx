"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

const easing = [0.22, 1, 0.36, 1] as const;

type RevealProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
};

export function Reveal({ children, delay = 0, y = 24, duration = 0.6, ...rest }: RevealProps) {
  const reduce = useReducedMotion();
  // Senza className qui, i layout che passano classi a <Reveal> (es. h-full)
  // si rompono per chi ha prefers-reduced-motion attivo.
  if (reduce) return <div className={rest.className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, delay, ease: easing }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({
  children,
  delayStep = 0.08,
  className,
}: {
  children: ReactNode[];
  delayStep?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: i * delayStep, ease: easing }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

export function HeroReveal({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}
      animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
      transition={{ duration: 1.1, ease: easing }}
    >
      {children}
    </motion.div>
  );
}
