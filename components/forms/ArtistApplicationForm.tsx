"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  artistApplicationSchema,
  type ArtistApplicationInput,
} from "@/lib/validators/schemas";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { submitArtistApplication } from "@/app/(public)/candidatura-artista/_actions";

export function ArtistApplicationForm({
  genreOptions = [],
}: {
  genreOptions?: string[];
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ArtistApplicationInput>({
    resolver: zodResolver(artistApplicationSchema),
    defaultValues: { genres: [] },
  });

  async function onSubmit(values: ArtistApplicationInput) {
    setError(null);
    const res = await submitArtistApplication(values);
    if (!res.ok) setError(res.error ?? "Errore");
    else setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-6">
        <p className="font-display text-xl uppercase">Candidatura inviata</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Abbiamo ricevuto la tua candidatura. Riceverai un&apos;email quando sarà approvata
          con le istruzioni per impostare la password e accedere alla tua dashboard artista.
        </p>
      </div>
    );
  }

  const options = genreOptions.map((g) => ({ value: g, label: g }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome e cognome" error={errors.name?.message}>
          <Input {...register("name")} autoComplete="name" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} autoComplete="email" />
        </Field>
        <Field label="Nome d'arte" error={errors.stageName?.message}>
          <Input {...register("stageName")} />
        </Field>
        <Field
          label="Generi musicali (massimo 3)"
          error={errors.genres?.message}
          hint="Scegli al massimo 3 generi che descrivono meglio il tuo progetto."
          className="md:col-span-2"
        >
          <Controller
            control={control}
            name="genres"
            render={({ field }) => (
              <MultiSelect
                options={options}
                value={field.value ?? []}
                onChange={field.onChange}
                max={3}
                placeholder="Seleziona da 1 a 3 generi…"
                searchPlaceholder="Cerca genere…"
                emptyText="Nessun genere disponibile"
              />
            )}
          />
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
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
