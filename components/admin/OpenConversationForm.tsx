"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label, Textarea, Input } from "@/components/ui/Input";
import {
  apriConversazioneMotivata,
  type AccessoState,
} from "@/app/(admin)/admin/chat/_actions";

const CATEGORIE = [
  { value: "assistenza", label: "Assistenza a una delle parti" },
  { value: "contestazione", label: "Contestazione su una trattativa" },
  { value: "segnalazione", label: "Segnalazione ricevuta" },
  { value: "obbligo_di_legge", label: "Obbligo di legge" },
] as const;

const initial: AccessoState = {};

export function OpenConversationForm({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(apriConversazioneMotivata, initial);

  return (
    <form action={action} className="mx-auto w-full max-w-lg space-y-4 p-6">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-start gap-3">
        <Lock className="mt-1 size-5 shrink-0 text-corallo" aria-hidden />
        <div>
          <h2 className="font-display text-lg text-notte">Conversazione riservata</h2>
          <p className="text-sm text-muted-foreground">
            Le chat sono private. Il Team le apre solo per assistenza, contestazioni,
            segnalazioni o obblighi di legge. Il motivo che indichi viene registrato con il tuo
            nome e l&apos;accesso dura due ore.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="category">Motivo dell&apos;accesso *</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-3 text-sm focus:border-azzurro focus:outline-none focus:ring-[3px] focus:ring-azzurro/15"
        >
          <option value="" disabled>
            Scegli…
          </option>
          {CATEGORIE.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="reason">Motivazione (almeno 10 caratteri) *</Label>
        <Textarea
          id="reason"
          name="reason"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          placeholder="Es: l'organizzatore ha scritto al supporto lamentando che l'offerta non risulta accettata."
        />
      </div>

      <div>
        <Label htmlFor="reference">Riferimento segnalazione (facoltativo)</Label>
        <Input
          id="reference"
          name="reference"
          placeholder="S-1A2B3C4D"
          maxLength={10}
          pattern="[SRDsrd]-[0-9A-Fa-f]{8}"
          title="S-, R- o D- seguito da 8 caratteri esadecimali"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Registro l'accesso…" : "Registra e apri la conversazione"}
      </Button>
    </form>
  );
}
