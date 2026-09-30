"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import {
  inviaSegnalazioneProfilo,
  type SegnalazioneState,
} from "@/app/(admin)/admin/proposte/_actions";

export type CandidatoDestinatario = {
  /** "venue:<id>" oppure "org:<id>" */
  value: string;
  name: string;
  detail: string;
};

const initial: SegnalazioneState = {};

export function ProfileReferralForm({
  artists,
  defaultArtistId,
  candidates,
}: {
  artists: { id: string; name: string }[];
  defaultArtistId: string;
  candidates: CandidatoDestinatario[];
}) {
  const [state, action, pending] = useActionState(inviaSegnalazioneProfilo, initial);
  const [recipient, setRecipient] = useState<string>(candidates[0]?.value ?? "manual");

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="artistId">Artista (piano Max) *</Label>
        <select
          id="artistId"
          name="artistId"
          required
          defaultValue={defaultArtistId}
          className="h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-3 text-sm focus:border-azzurro focus:outline-none focus:ring-[3px] focus:ring-azzurro/15"
        >
          <option value="" disabled>
            Scegli…
          </option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-[12px] font-semibold tracking-[0.02em]">Destinatario *</legend>
        {candidates.map((c) => (
          <label key={c.value} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="recipient"
              value={c.value}
              checked={recipient === c.value}
              onChange={() => setRecipient(c.value)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">{c.name}</span>{" "}
              <span className="text-muted-foreground">{c.detail}</span>
            </span>
          </label>
        ))}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="recipient"
            value="manual"
            checked={recipient === "manual"}
            onChange={() => setRecipient("manual")}
            className="mt-1"
          />
          <span className="font-medium">Inserisci a mano</span>
        </label>
        {recipient === "manual" && (
          <div className="grid gap-3 pl-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="manualName">Nome della struttura *</Label>
              <Input id="manualName" name="manualName" maxLength={120} required />
            </div>
            <div>
              <Label htmlFor="manualEmail">Email *</Label>
              <Input id="manualEmail" name="manualEmail" type="email" maxLength={200} required />
            </div>
          </div>
        )}
      </fieldset>

      <div>
        <Label htmlFor="note">Nota (facoltativa, max 500 caratteri)</Label>
        <Textarea
          id="note"
          name="note"
          maxLength={500}
          rows={3}
          placeholder="Perché pensiamo che sia in linea con la struttura."
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-corallo-dark">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-[#1F7A46]">
          {state.ok}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        <Send className="size-4" aria-hidden="true" />
        {pending ? "Invio…" : "Segnala questo artista"}
      </Button>
    </form>
  );
}
