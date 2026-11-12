import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { TETTO_ANNUO } from "@/lib/inviti/regole";

/**
 * Richiamo discreto nella home della dashboard. La pagina lo mostra solo
 * finché l'artista non ha ancora guadagnato un premio: dopo, sa dove trovarlo.
 */
export function InvitoTeaser() {
  return (
    <Link
      href="/dashboard/invita"
      className="group flex items-center gap-4 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.03] p-4 transition hover:border-accent hover:bg-accent/[0.06]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <UserPlus aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Invita un artista, guadagna mesi di Pro</span>
        <span className="block text-sm text-muted-foreground">
          1 mese di Pro per ogni artista che si abbona dal tuo link, fino a {TETTO_ANNUO} l&apos;anno.
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      />
    </Link>
  );
}
