import Link from "next/link";
import { Lock, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Chat per un profilo Free: al posto delle conversazioni, cosa fare.
 * Con il piano Free si tratta via email (i recapiti sono nelle richieste);
 * la chat con offerte è dei piani Pro e Max.
 */
export function ChatPaywall() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-6 text-center sm:p-10">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-muted">
        <Lock className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-display text-2xl tracking-tight">La chat è inclusa in Pro e Max</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Con il piano Free tratti con organizzatori e locali <strong className="text-foreground">via email</strong>:
        quando premi «Inizia trattativa» su una richiesta, trovi lì il loro indirizzo. Quando vi siete
        accordati, l&apos;organizzatore registra data e compenso e tu li confermi per bloccare la data.
      </p>
      <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm">
        <li className="flex gap-2">
          <MessageSquare className="mt-0.5 size-4 shrink-0 text-azzurro" aria-hidden="true" />
          Con Pro tratti in chat e usi le offerte: la data si blocca quando l&apos;altra parte accetta,
          al prezzo indicato.
        </li>
        <li className="flex gap-2">
          <Mail className="mt-0.5 size-4 shrink-0 text-[#B87020]" aria-hidden="true" />
          Con Free ricevi tutte le richieste e rispondi via email: nessuna richiesta va persa.
        </li>
      </ul>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/dashboard/abbonamento">Passa a Pro</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/leads">Vai alle richieste</Link>
        </Button>
      </div>
    </div>
  );
}
