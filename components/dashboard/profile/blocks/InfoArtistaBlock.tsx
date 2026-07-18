"use client";

import * as React from "react";
import { Controller, useWatch } from "react-hook-form";
import { User } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import { Field, ProfileSectionForm } from "@/components/dashboard/profile/ProfileSectionForm";
import { useProfileSectionForm } from "@/components/dashboard/profile/useProfileSectionForm";
import { INSTRUMENT_OPTIONS } from "@/lib/constants/artist-options";
import {
  infoSectionSchema,
  toInfoPayload,
  type InfoSectionValues,
} from "@/lib/validators/artist-profile";
import type { ArtistProfileData } from "@/components/dashboard/profile/types";

const PERCORSO_LABEL = {
  cover_artist: "Cover artist",
  tribute_band: "Tribute band",
  progetto_inedito: "Progetto inedito",
} as const;

/** Stesse soglie di lib/artist/profile-completion.ts: bio ≥ 30 caratteri. */
const MIN_BIO_LENGTH = 30;

export function InfoArtistaBlock({
  artist,
  genreOptions,
}: {
  artist: ArtistProfileData;
  genreOptions: string[];
}) {
  const tier = artist.tier ?? "free";
  const canEditPercorso = tier === "pro" || tier === "max";

  const defaultValues = React.useMemo<InfoSectionValues>(
    () => ({
      stage_name: artist.stage_name,
      city: artist.city ?? "",
      genre: artist.genre ?? [],
      instruments: artist.instruments ?? [],
      bio: artist.bio ?? "",
      cover_image: artist.cover_image ?? "",
      percorso_artistico: (artist.percorso_artistico ??
        "") as InfoSectionValues["percorso_artistico"],
    }),
    [artist]
  );

  const { form, onSubmit, isDirty, isSubmitting, serverError } = useProfileSectionForm({
    artistId: artist.id,
    section: "info",
    schema: infoSectionSchema,
    defaultValues,
    toPayload: (v) => toInfoPayload(v, canEditPercorso),
    successMessage: "Informazioni artista salvate",
  });

  const values = useWatch({ control: form.control });
  const complete =
    Boolean(values?.cover_image) &&
    (values?.bio?.trim().length ?? 0) >= MIN_BIO_LENGTH &&
    (values?.genre?.length ?? 0) > 0;

  const genreOpts = genreOptions.map((g) => ({ value: g, label: g }));
  const instrumentOpts = INSTRUMENT_OPTIONS.map((i) => ({ value: i, label: i }));
  const errors = form.formState.errors;

  return (
    <ProfileSection
      id="info"
      title="Informazioni artista"
      description="Identità, generi, strumenti, bio e immagine principale"
      icon={<User className="size-4" />}
      status={
        complete ? { tone: "complete", label: "Completo" } : { tone: "todo", label: "Da compilare" }
      }
      dirty={isDirty}
    >
      <ProfileSectionForm
        onSubmit={onSubmit}
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        serverError={serverError}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome d'arte" error={errors.stage_name?.message}>
            <Input {...form.register("stage_name")} />
          </Field>
          <Field label="Città" error={errors.city?.message}>
            <Input {...form.register("city")} />
          </Field>
        </div>

        <Field label="Generi musicali (max 3)" error={errors.genre?.message}>
          <Controller
            control={form.control}
            name="genre"
            render={({ field }) => (
              <MultiSelect
                options={genreOpts}
                value={field.value ?? []}
                onChange={field.onChange}
                max={3}
                placeholder="Seleziona da 1 a 3 generi…"
                searchPlaceholder="Cerca genere…"
                emptyText="Nessun genere trovato"
              />
            )}
          />
        </Field>

        <Field label="Strumenti suonati live">
          <Controller
            control={form.control}
            name="instruments"
            render={({ field }) => (
              <MultiSelect
                options={instrumentOpts}
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Seleziona gli strumenti che suoni dal vivo…"
                searchPlaceholder="Cerca strumento…"
                emptyText="Nessuno strumento trovato"
              />
            )}
          />
        </Field>

        <Field
          label="Bio"
          hint={`Almeno ${MIN_BIO_LENGTH} caratteri perché conti nel completamento del profilo.`}
          error={errors.bio?.message}
        >
          <Textarea rows={5} {...form.register("bio")} />
        </Field>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Label>Percorso artistico</Label>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                tier === "free" ? "border-border text-muted-foreground" : "border-accent text-accent"
              }`}
            >
              Piano: {tier}
            </span>
          </div>
          {canEditPercorso ? (
            <select
              {...form.register("percorso_artistico")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">— Non specificato —</option>
              <option value="cover_artist">{PERCORSO_LABEL.cover_artist}</option>
              <option value="tribute_band">{PERCORSO_LABEL.tribute_band}</option>
              <option value="progetto_inedito">{PERCORSO_LABEL.progetto_inedito}</option>
            </select>
          ) : (
            <p className="text-sm text-muted-foreground">
              Il campo <em>Percorso artistico</em> (cover artist, tribute band, progetto inedito) è
              disponibile solo con piano <strong>Pro</strong> o <strong>Max</strong>.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-5">
          <Label>Immagine principale</Label>
          <Controller
            control={form.control}
            name="cover_image"
            render={({ field }) => (
              <ImageUpload
                label="Cover (3:4) — verrà usata come copertina del profilo"
                value={field.value ?? ""}
                onChange={field.onChange}
                kind="artist"
              />
            )}
          />
        </div>
      </ProfileSectionForm>
    </ProfileSection>
  );
}
