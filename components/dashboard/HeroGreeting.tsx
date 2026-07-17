import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface HeroGreetingCTA {
  label: string;
  href: string;
  variant?: "default" | "outline" | "accent";
  icon?: ReactNode;
}

export interface HeroGreetingProps {
  name?: string | null;
  description?: string;
  primary?: HeroGreetingCTA;
  secondary?: HeroGreetingCTA;
  illustration?: ReactNode;
  className?: string;
  /** Sovrascrive il saluto temporale generato da greetingPrefix(). */
  greeting?: string;
  /** Mostra un avatar dell'utente al posto dell'icona Sparkles nel badge. */
  avatarUrl?: string | null;
  /** Etichetta resa accanto al nome (es. il piano dell'artista). */
  badge?: ReactNode;
}

function greetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 5) return "Buona notte";
  if (h < 13) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export function HeroGreeting({
  name,
  description,
  primary,
  secondary,
  illustration,
  className,
  greeting,
  avatarUrl,
  badge,
}: HeroGreetingProps) {
  const display = name?.trim() || "ciao";
  const saluto = greeting ?? greetingPrefix();

  const badgeContent = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt={display}
      className="size-full rounded-2xl object-cover"
    />
  ) : (
    illustration ?? <Sparkles className="size-6" />
  );

  return (
    <section
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-muted px-6 py-7 sm:px-8 md:flex-row md:items-center md:justify-between md:gap-8",
        className
      )}
    >
      <div className="flex items-center gap-4 md:gap-5 min-w-0">
        <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-background text-foreground sm:inline-flex">
          {badgeContent}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-display text-2xl leading-tight tracking-tight sm:text-3xl">
              {saluto}, {display}!
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {(primary || secondary) && (
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:justify-end">
          {primary && (
            <Button asChild size="md" variant={primary.variant ?? "default"}>
              <Link href={primary.href}>
                {primary.icon}
                {primary.label}
              </Link>
            </Button>
          )}
          {secondary && (
            <Button asChild size="md" variant={secondary.variant ?? "outline"}>
              <Link href={secondary.href}>
                {secondary.icon}
                {secondary.label}
              </Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
