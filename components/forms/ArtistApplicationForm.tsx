"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
  COMPONENTI_MAX,
  COMPONENTI_MIN,
  FORMAZIONI,
  MAX_STRUMENTI_CANDIDATURA,
} from "@/lib/constants/formazione";
import { HoneypotFields } from "@/components/forms/HoneypotField";
import { PrivacyNotice } from "@/components/forms/PrivacyConsent";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  MSG_BOZZA_RECUPERATA,
  MSG_SITO_AGGIORNATO,
  RELOAD_DELAY_MS,
  saveDraft,
  takeDraft,
} from "@/lib/forms/draft";

const DRAFT_KEY = "candidatura-artista";
const selectClass =
  "h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-3 text-sm text-foreground transition-colors focus:border-azzurro focus:outline-none focus:ring-[3px] focus:ring-azzurro/15";
// Solo i campi di contenuto: le dichiarazioni (età, diritti) vanno rifatte.
const DRAFT_FIELDS = [
  "name", "email", "formazione", "componenti", "stageName", "genres", "instruments", "bio",
  "instagram", "spotify", "website", "video_url", "video_path",
] as const;

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
    getValues,
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
  const formazione = watch("formazione");
  const band = formazione === "band";
  // Finché non si sceglie vale il limite più basso: nessuno strumento da togliere dopo.
  const maxStrumenti = MAX_STRUMENTI_CANDIDATURA[band ? "band" : "solista"];

  useEffect(() => {
    const draft = takeDraft(DRAFT_KEY);
    if (!draft) return;
    for (const key of DRAFT_FIELDS) {
      if (key in draft) {
        setValue(key, draft[key] as never, { shouldDirty: true });
      }
    }
    toast.info(MSG_BOZZA_RECUPERATA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: ArtistApplicationInput) {
    setError(null);
    let res: Awaited<ReturnType<typeof submitArtistApplication>>;
    try {
      res = await submitArtistApplication(values);
    } catch {
      const draft: Record<string, unknown> = {};
      for (const key of DRAFT_FIELDS) draft[key] = values[key];
      saveDraft(DRAFT_KEY, draft);
      toast.message(MSG_SITO_AGGIORNATO);
      window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
      return;
    }
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
      <HoneypotFields register={register as never} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome e cognome" error={errors.name?.message}>
          <Input {...register("name")} autoComplete="name" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email")} autoComplete="email" />
        </Field>
        <Field label="Ti candidi come" error={errors.formazione?.message}>
          <select
            className={selectClass}
            defaultValue=""
            {...register("formazione", {
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                if (e.target.value === "band") return;
                // Da band a solista: si tengono i primi strumenti scelti.
                const scelti = getValues("instruments") ?? [];
                const max = MAX_STRUMENTI_CANDIDATURA.solista;
                if (scelti.length > max) setValue("instruments", scelti.slice(0, max));
                setValue("componenti", undefined);
              },
            })}
          >
            <option value="" disabled>
              Seleziona…
            </option>
            {FORMAZIONI.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        {band ? (
          <Field label="Quanti siete?" error={errors.componenti?.message}>
            <Input
              type="number"
              inputMode="numeric"
              min={COMPONENTI_MIN}
              max={COMPONENTI_MAX}
              {...register("componenti")}
            />
          </Field>
        ) : (
          // Tiene la griglia allineata: il nome d'arte resta nella colonna sinistra.
          <div className="hidden md:block" aria-hidden />
        )}
        <Field label={band ? "Nome della band" : "Nome d'arte"} error={errors.stageName?.message}>
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
          label={`Strumenti (opzionale, massimo ${maxStrumenti})`}
          error={errors.instruments?.message}
          hint={
            band
              ? `Seleziona fino a ${maxStrumenti} strumenti suonati dal vivo dalla band.`
              : `Seleziona fino a ${maxStrumenti} strumenti che suoni dal vivo.`
          }
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
                max={maxStrumenti}
                placeholder={`Seleziona fino a ${maxStrumenti} strumenti…`}
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
        hint="Carica un video che mostri la tua performance dal vivo. Max 200MB, formato mp4/webm/mov."
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
      <PrivacyNotice />
      <Checkbox
        {...register("acceptedAge")}
        error={errors.acceptedAge?.message}
        label="Dichiaro di avere almeno 18 anni."
      />
      <Checkbox
        {...register("acceptedRights")}
        error={errors.acceptedRights?.message}
        label="Dichiaro che le informazioni inserite sono veritiere e che ho i diritti per inviare il video e i materiali allegati, compreso il consenso delle persone che vi compaiono."
      />

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
