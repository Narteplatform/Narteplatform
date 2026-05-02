"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadInput } from "@/lib/validators/schemas";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitLead } from "@/app/(user)/artisti/[slug]/_actions";

export function ArtistRequestForm({
  artistId,
  defaultEmail,
}: {
  artistId: string;
  defaultEmail: string;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: { artistId, contactEmail: defaultEmail },
  });

  async function onSubmit(values: LeadInput) {
    setError(null);
    const res = await submitLead(values);
    if (!res.ok) setError(res.error ?? "Errore");
    else setDone(true);
  }

  if (done) {
    return (
      <div className="border border-foreground p-4">
        <p className="font-display text-lg uppercase">Richiesta inviata</p>
        <p className="mt-2 text-sm text-muted-foreground">
          L&apos;artista riceverà la tua richiesta via email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("artistId")} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Data evento</Label>
          <Input type="date" {...register("eventDate")} />
          {errors.eventDate && <p className="text-xs text-red-600">{errors.eventDate.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Luogo</Label>
          <Input {...register("eventLocation")} />
          {errors.eventLocation && <p className="text-xs text-red-600">{errors.eventLocation.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Budget (€)</Label>
          <Input type="number" min="0" step="50" {...register("budget")} />
        </div>
        <div className="space-y-1">
          <Label>Telefono</Label>
          <Input type="tel" {...register("contactPhone")} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Email contatto</Label>
        <Input type="email" {...register("contactEmail")} />
        {errors.contactEmail && <p className="text-xs text-red-600">{errors.contactEmail.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Messaggio</Label>
        <Textarea
          rows={5}
          placeholder="Racconta brevemente l'evento, l'orario, il pubblico previsto..."
          {...register("message")}
        />
        {errors.message && <p className="text-xs text-red-600">{errors.message.message}</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Invio..." : "Invia richiesta"}
      </Button>
    </form>
  );
}
