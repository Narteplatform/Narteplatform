"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { teamMessageSchema, type TeamMessageInput } from "@/lib/validators/schemas";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { inviaMessaggioAlTeam } from "@/app/(artist)/dashboard/consulenza/_actions";

/** «Scrivi al team N'arte»: pagina Consulente, anche quando non ci sono slot. */
export function TeamMessageForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamMessageInput>({
    resolver: zodResolver(teamMessageSchema),
    defaultValues: { subject: "", body: "" },
  });

  function onSubmit(values: TeamMessageInput) {
    setError(null);
    start(async () => {
      const res = await inviaMessaggioAlTeam(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      reset();
    });
  }

  if (done) {
    return (
      <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="inline-flex items-center gap-2">
          <CheckCircle2 className="size-4" aria-hidden="true" /> Messaggio inviato. Il team ti risponde
          all&apos;indirizzo email del tuo account, di solito entro 1-2 giorni lavorativi.
        </p>
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setDone(false)}>
          Scrivi un altro messaggio
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="team-subject">Oggetto</Label>
        <Input id="team-subject" placeholder="Di cosa vuoi parlare?" {...register("subject")} />
        {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
      </div>
      <div>
        <Label htmlFor="team-body">Messaggio</Label>
        <Textarea
          id="team-body"
          rows={5}
          placeholder="Scrivi la tua domanda: ti rispondiamo per email."
          {...register("body")}
        />
        {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Invio…" : "Invia al team N'arte"}
      </Button>
    </form>
  );
}
