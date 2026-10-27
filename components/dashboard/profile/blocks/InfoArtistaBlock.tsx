"use client";

import * as React from "react";
import { Controller, useWatch } from "react-hook-form";
import { Clock3, User } from "lucide-react";
import { toast } from "sonner";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import { Field, ProfileSectionForm } from "@/components/dashboard/profile/ProfileSectionForm";
import { useProfileSectionForm } from "@/components/dashboard/profile/useProfileSectionForm";
import { useDirittiContenuti } from "@/components/dashboard/profile/DirittiContenuti";
import { PendingMediaNotice } from "@/components/dashboard/PendingMediaNotice";
import { PendingMediaThumbs } from "@/components/dashboard/PendingMediaThumbs";
import { inviaCopertina } from "@/app/(artist)/dashboard/_actions";
import { INSTRUMENT_OPTIONS } from "@/lib/constants/artist-options";
import { COMPONENTI_MAX, COMPONENTI_MIN, FORMAZIONI } from "@/lib/constants/formazione";
import {
  infoSectionSchema,
  toInfoPayload,
  type InfoSectionValues,
} from "@/lib/validators/artist-profile";
import type { ArtistProfileData, MediaSubmissionNotice } from "@/components/dashboard/profile/types";

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
  pendingCover = [],
}: {
  artist: ArtistProfileData;
  genreOptions: string[];
  /** Foto profilo in attesa di approvazione o rifiutata, dalla coda di moderazione. */
  pendingCover?: MediaSubmissionNotice[];
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
      formazione: artist.formazione ?? "",
      componenti: artist.componenti ? String(artist.componenti) : "",
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

  const diritti = useDirittiContenuti();

  // Foto appena inviata in moderazione in questa sessione: il campo resta al
  // valore pubblicato, così «Salva» non la riaccoda.
  const [inviata, setInviata] = React.useState<string | null>(null);
  const inRevisione =
    pendingCover.find((i) => i.status === "pending")?.url ?? inviata ?? null;

  async function onCoverUploaded(url: string) {
    try {
      const res = await inviaCopertina(artist.id, url);
      if (!res.ok) {
        if (diritti.gestisciErrore(res.error)) {
          toast.error("Conferma la dichiarazione sui diritti, poi ricarica la foto.");
          return;
        }
        toast.error(res.error);
        return;
      }
      setInviata(url);
      form.setValue("cover_image", artist.cover_image ?? "", { shouldDirty: false });
      toast.success("Foto inviata: sarà visibile dopo l'approvazione del team");
    } catch {
      toast.error("Non sono riuscito a inviare la foto. Riprova.");
    }
  }
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
          <Field label="Formazione" error={errors.formazione?.message}>
            <select
              {...form.register("formazione")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">— Non specificato —</option>
              {FORMAZIONI.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          {values?.formazione === "band" && (
            <Field label="Quanti siete?" error={errors.componenti?.message}>
              <Input
                type="number"
                inputMode="numeric"
                min={COMPONENTI_MIN}
                max={COMPONENTI_MAX}
                {...form.register("componenti")}
              />
            </Field>
          )}
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
          <PendingMediaNotice items={pendingCover} />
          {inRevisione && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inRevisione}
                alt="Anteprima della foto in revisione"
                className="h-14 w-11 shrink-0 rounded object-cover"
              />
              <p className="flex items-center gap-1.5">
                <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>Foto in revisione.</strong> Resta online quella attuale finché il team
                  non approva la nuova.
                </span>
              </p>
            </div>
          )}
          <Controller
            control={form.control}
            name="cover_image"
            render={({ field }) => (
              <ImageUpload
                label="Cover (3:4) — verrà usata come copertina del profilo"
                value={field.value ?? ""}
                onChange={field.onChange}
                kind="artist"
                beforePick={diritti.richiedi}
                onUploaded={onCoverUploaded}
              />
            )}
          />
          {/* La foto profilo in attesa: quella vecchia resta online — meglio
              una copertina superata di un profilo senza volto — e la nuova si
              vede qui finché non viene approvata. */}
          <PendingMediaThumbs items={pendingCover} />
        </div>
      </ProfileSectionForm>
    </ProfileSection>
  );
}
