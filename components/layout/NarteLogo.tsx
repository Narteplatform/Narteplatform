import Image from "next/image";
import { cn } from "@/lib/utils";

type Variant = "dark" | "light";

type Props = {
  /**
   * Variante:
   * - "dark"  → asset bianco trasparente, render diretto (sfondi notte/azzurro)
   * - "light" → applica CSS filter per virare a azzurro (sfondi palco)
   */
  variant?: Variant;
  /** Larghezza in px. L'altezza segue l'aspect ratio dell'asset (2000×601 ≈ 3.328:1). */
  width?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

const LOGO_ASPECT = 601 / 2000; // height / width
const MONO_ASPECT = 1413 / 2000;

export function NarteLogo({
  variant = "dark",
  width = 120,
  className,
  priority = false,
  alt = "N'Arte",
}: Props) {
  const height = Math.round(width * LOGO_ASPECT);
  return (
    <Image
      src="/brand/narte-logo.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn(variant === "light" && "logo-tint-azzurro", className)}
      sizes={`${width}px`}
    />
  );
}

export function NarteMonogram({
  variant = "dark",
  width = 40,
  className,
  priority = false,
  alt = "N'Arte",
}: Props) {
  const height = Math.round(width * MONO_ASPECT);
  return (
    <Image
      src="/brand/narte-monogram.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn(variant === "light" && "logo-tint-azzurro", className)}
      sizes={`${width}px`}
    />
  );
}
