"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  artistApplicationSchema,
  type ArtistApplicationInput,
} from "@/lib/validators/schemas";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitArtistApplication } from "@/app/(public)/candidatura-artista/_actions";

export function ArtistApplicationForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ArtistApplicationInput>({
    resolver: zodResolver(artistApplicationSchema),
  });

  async function onSubmit(values: ArtistApplicationInput) {
    setError(null);
    const res = await submitArtistApplication(values);
    if (!res.ok) setError(res.error ?? "Errore");
    else setDone(true);
  }

  if (done) {
    return (
      <div className="border border-foreground p-6">
        <p className="font-display text-xl uppercase">Candidatura inviata</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ti contatteremo dopo la revisione con un link per completare il profilo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome e cognome" error={errors.name?.message}>
          <Input {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </Field>
        <Field label="Nome d'arte" error={errors.stageName?.message}>
          <Input {...register("stageName")} />
        </Field>
        <Field label="Genere" error={errors.genre?.message}>
          <Input placeholder="es. Indie, Trap, Jazz" {...register("genre")} />
        </Field>
      </div>
      <Field label="Bio" error={errors.bio?.message}>
        <Textarea rows={4} {...register("bio")} />
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Instagram" error={errors.instagram?.message}>
          <Input placeholder="@username" {...register("instagram")} />
        </Field>
        <Field label="Spotify" error={errors.spotify?.message}>
          <Input placeholder="link profilo" {...register("spotify")} />
        </Field>
        <Field label="Sito" error={errors.website?.message}>
          <Input placeholder="https://" {...register("website")} />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Invio..." : "Invia candidatura"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
