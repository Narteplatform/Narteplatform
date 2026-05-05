import Image from "next/image";

type Props = {
  /**
   * Variante del logo:
   * - "dark"  : usa l'asset bianco-su-nero (per sfondi scuri / public site)
   * - "light" : usa l'asset nero-su-bianco (per sfondi chiari / dashboard light theme)
   * - "auto"  : sceglie la variante in base al tema corrente via CSS (matchMedia non supportato server-side, fallback a dark)
   */
  variant?: "dark" | "light";
  /** Larghezza in px del logo. Altezza calcolata mantenendo l'aspect ratio originale (~1.38:1). */
  width?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

const ASPECT = 371 / 512; // height / width sull'asset 512×371

export function NarteLogo({
  variant = "dark",
  width = 120,
  className,
  priority = false,
  alt = "N'arte",
}: Props) {
  const src = variant === "light" ? "/logo-narte-light.png" : "/logo-narte.png";
  const height = Math.round(width * ASPECT);
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      sizes={`${width}px`}
    />
  );
}
