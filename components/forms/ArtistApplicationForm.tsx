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
import { ApplicationVideoUpload } from "@/components/forms/ApplicationVideoUpload";
import { submitArtistApplication } from "@/app/(public)/candidatura-artista/_actions";
import { INSTRUMENT_OPTIONS } from "@/lib/constants/artist-options";

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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ArtistApplicationInput>({
    resolver: zodResolver(artistApplicationSchema),
    defaultValues: {
      genres: [],
      instruments: [],
      video_url: "",
      video_path: "",
    },
  });

  const videoUrl = watch("video_url");

  async function onSubmit(values: ArtistApplicationInput) {
    setError(null);
    const res = await submitArtistApplication(values);
    if (!res.ok) setError(res.error ?? "Errore");
    else setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-6">
        <p className="font-display text-xl">Candidatura inviata</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Abbiamo ricevuto la tua candidatura. Riceverai un&apos;email quando sarà approvata
          con le istruzioni per impostare la password e accedere alla tua dashboard artista.
        </p>
      </div>
    );
  }

  const genreOpts = genreOptions.map((g) => ({ value: g, label: g }));
  const instrumentOpts = INSTRUMENT_OPTIONS.map((s) => ({ value: s, label: s }));

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
        >
          <Controller
            control={control}
            name="genres"
            render={({ field }) => (
              <MultiSelect
                options={genreOpts}
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
        <Field
          label="Strumenti (opzionale, massimo 3)"
          error={errors.instruments?.message}
          hint="Seleziona fino a 3 strumenti che suoni dal vivo."
          className="md:col-span-2"
        >
          <Controller
            control={control}
            name="instruments"
            render={({ field }) => (
              <MultiSelect
                options={instrumentOpts}
                value={field.value ?? []}
                onChange={field.onChange}
                max={3}
                placeholder="Seleziona fino a 3 strumenti…"
                searchPlaceholder="Cerca strumento…"
                emptyText="Nessuno strumento trovato"
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
      <Field
        label="Video di riferimento (opzionale)"
        error={errors.video_url?.message}
        hint="Carica un video che mostri la tua performance dal vivo. Max 50MB, formato mp4/webm/mov."
      >
        {/* Hidden RHF fields that store the upload result */}
        <input type="hidden" {...register("video_url")} />
        <input type="hidden" {...register("video_path")} />
        <ApplicationVideoUpload
          uploadedUrl={videoUrl ?? ""}
          onUploaded={({ url, path }) => {
            setValue("video_url", url, { shouldValidate: true });
            setValue("video_path", path, { shouldValidate: false });
          }}
          onRemoved={() => {
            setValue("video_url", "", { shouldValidate: false });
            setValue("video_path", "", { shouldValidate: false });
          }}
        />
      </Field>
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
