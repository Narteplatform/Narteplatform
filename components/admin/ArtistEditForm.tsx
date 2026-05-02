"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { INSTRUMENT_OPTIONS } from "@/lib/constants/artist-options";
import { updateArtist } from "@/app/(admin)/admin/artisti/_actions";

type Values = {
  stage_name: string;
  city: string;
  genre: string[];
  instruments: string[];
  bio: string;
  cover_image: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  website: string;
};

type Props = {
  artistId: string;
  genreOptions: string[];
  defaults: Partial<Values>;
};

export function ArtistEditForm({ artistId, genreOptions, defaults }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<Values>({
    defaultValues: {
      stage_name: defaults.stage_name ?? "",
      city: defaults.city ?? "",
      genre: defaults.genre ?? [],
      instruments: defaults.instruments ?? [],
      bio: defaults.bio ?? "",
      cover_image: defaults.cover_image ?? "",
      instagram: defaults.instagram ?? "",
      facebook: defaults.facebook ?? "",
      tiktok: defaults.tiktok ?? "",
      youtube: defaults.youtube ?? "",
      spotify: defaults.spotify ?? "",
      website: defaults.website ?? "",
    },
  });

  const genreOpts = genreOptions.map((g) => ({ value: g, label: g }));
  const instrumentOpts = INSTRUMENT_OPTIONS.map((i) => ({ value: i, label: i }));

  async function onSubmit(values: Values) {
    setError(null);
    setOk(false);
    const res = await updateArtist(artistId, {
      stage_name: values.stage_name,
      city: values.city || undefined,
      genre: values.genre.join(",") || undefined,
      instruments: values.instruments.join(",") || undefined,
      bio: values.bio || undefined,
      cover_image: values.cover_image || undefined,
      instagram: values.instagram || undefined,
      facebook: values.facebook || undefined,
      tiktok: values.tiktok || undefined,
      youtube: values.youtube || undefined,
      spotify: values.spotify || undefined,
      website: values.website || undefined,
    });
    if (!res.ok) {
      setError(res.error ?? "Errore aggiornamento");
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nome d'arte"><Input {...register("stage_name", { required: true })} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Città"><Input {...register("city")} /></Field>
        <Field label="Generi musicali">
          <Controller
            control={control}
            name="genre"
            render={({ field }) => (
              <MultiSelect
                options={genreOpts}
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Seleziona generi…"
                searchPlaceholder="Cerca genere…"
              />
            )}
          />
        </Field>
      </div>
      <Field label="Strumenti suonati live">
        <Controller
          control={control}
          name="instruments"
          render={({ field }) => (
            <MultiSelect
              options={instrumentOpts}
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder="Seleziona strumenti…"
              searchPlaceholder="Cerca strumento…"
            />
          )}
        />
      </Field>
      <Controller
        control={control}
        name="cover_image"
        render={({ field }) => (
          <ImageUpload
            label="Cover artista (3:4)"
            value={field.value ?? ""}
            onChange={field.onChange}
            kind="artist"
          />
        )}
      />
      <Field label="Bio"><Textarea rows={5} {...register("bio")} /></Field>

      <fieldset className="space-y-2 border-t border-border pt-4">
        <legend className="text-xs uppercase tracking-wider text-muted-foreground">Social</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Instagram"><Input placeholder="@handle o link" {...register("instagram")} /></Field>
          <Field label="Facebook"><Input placeholder="link Facebook" {...register("facebook")} /></Field>
          <Field label="TikTok"><Input placeholder="@handle o link" {...register("tiktok")} /></Field>
          <Field label="YouTube"><Input placeholder="link canale YouTube" {...register("youtube")} /></Field>
          <Field label="Spotify"><Input placeholder="link Spotify" {...register("spotify")} /></Field>
          <Field label="Sito web"><Input type="url" placeholder="https://" {...register("website")} /></Field>
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-700">Profilo aggiornato.</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio..." : "Salva modifiche"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
