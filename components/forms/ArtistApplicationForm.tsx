"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
        <p className="font-display text-xl uppercase">Candidatura inviata · Account creato</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Il tuo account è attivo: puoi già accedere con email e password che hai scelto.
          Riceverai una email di conferma quando la candidatura sarà approvata e il profilo
          artista pubblicato.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center rounded-full bg-accent px-5 py-2 text-sm font-semibold uppercase tracking-wide text-accent-foreground hover:opacity-90"
        >
          Accedi ora
        </Link>
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
        <Field
          label="Password (min 8 caratteri)"
          error={errors.password?.message}
          hint="Userai questa password per accedere alla tua dashboard artista."
        >
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Field label="Nome d'arte" error={errors.stageName?.message}>
          <Input {...register("stageName")} />
        </Field>
        <Field
          label="Generi musicali"
          error={errors.genres?.message}
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
                placeholder="Seleziona uno o più generi…"
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
