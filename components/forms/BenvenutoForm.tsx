"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Mic2 } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { richiediOrganizzatoreAction, type BenvenutoState } from "@/app/(auth)/benvenuto/_actions";

type Scelta = "artist" | "organizer";

const SCELTE: { key: Scelta; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    key: "artist",
    label: "Sono un artista",
    hint: "Candidati per entrare nel roster: il team valuta il tuo profilo",
    icon: <Mic2 className="size-4" />,
  },
  {
    key: "organizer",
    label: "Ho bisogno di un artista",
    hint: "Per locali, eventi e privati: richieste, chat e calendario, dopo l'approvazione del team",
    icon: <CalendarCheck className="size-4" />,
  },
];

export function BenvenutoForm() {
  const [scelta, setScelta] = useState<Scelta | null>(null);
  const [state, action, pending] = useActionState<BenvenutoState, FormData>(
    richiediOrganizzatoreAction,
    {}
  );

  return (
    <div className="space-y-5">
      <div>
        <Label id="benvenuto-label">Come vuoi usare N&rsquo;arte?</Label>
        <div role="radiogroup" aria-labelledby="benvenuto-label" className="grid grid-cols-2 gap-2">
          {SCELTE.map((k) => {
            const selected = scelta === k.key;
            return (
              <button
                key={k.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setScelta(k.key)}
                className={`rounded-xl border-[1.5px] p-3 text-left transition-colors ${
                  selected
                    ? "border-azzurro bg-azzurro/10"
                    : "border-border bg-surface hover:border-foreground/40"
                }`}
              >
                <span
                  className={`inline-flex size-8 items-center justify-center rounded-lg ${
                    selected ? "bg-azzurro text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {k.icon}
                </span>
                <span className="mt-2 block text-sm font-semibold">{k.label}</span>
                <span className="block text-xs text-muted-foreground">{k.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {scelta === "artist" && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <p>
            Il profilo artista non si crea da qui: passa da una candidatura che il team valuta prima di
            pubblicarlo.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/candidatura-artista">Vai alla candidatura</Link>
          </Button>
        </div>
      )}

      {scelta === "organizer" && (
        <form action={action} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="b-nome">Locale o realtà che rappresenti</Label>
            <Input id="b-nome" name="organizerName" maxLength={120} required placeholder="Es. Duel Club" />
            {state.fieldErrors?.organizerName && (
              <p className="mt-1.5 text-xs text-corallo">{state.fieldErrors.organizerName}</p>
            )}
          </div>
          <div>
            <Label htmlFor="b-citta">Città</Label>
            <Input id="b-citta" name="city" maxLength={80} required placeholder="Es. Napoli" />
            {state.fieldErrors?.city && <p className="mt-1.5 text-xs text-corallo">{state.fieldErrors.city}</p>}
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-corallo">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Invio in corso…" : "Invia la richiesta"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Il team verifica ogni account prima di attivare richieste, chat e calendario.
          </p>
        </form>
      )}
    </div>
  );
}
