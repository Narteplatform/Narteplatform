"use client";

import { useActionState } from "react";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { richiediOrganizzatoreAction, type BenvenutoState } from "@/app/(auth)/benvenuto/_actions";

/**
 * Completamento della richiesta organizzatore per chi si è iscritto con Google
 * dalla scheda «Ho bisogno di un artista». La scelta l'ha già fatta in
 * registrazione: qui restano solo locale e città, gli stessi campi (e la
 * stessa azione) del modulo di /benvenuto.
 */
export function OrganizzatoreForm() {
  const [state, action, pending] = useActionState<BenvenutoState, FormData>(
    richiediOrganizzatoreAction,
    {}
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="bo-nome">Locale o realtà che rappresenti</Label>
        <Input id="bo-nome" name="organizerName" maxLength={120} required placeholder="Es. Duel Club" />
        {state.fieldErrors?.organizerName && (
          <p className="mt-1.5 text-xs text-corallo">{state.fieldErrors.organizerName}</p>
        )}
      </div>
      <div>
        <Label htmlFor="bo-citta">Città</Label>
        <Input id="bo-citta" name="city" maxLength={80} required autoComplete="address-level2" placeholder="Es. Napoli" />
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
  );
}
