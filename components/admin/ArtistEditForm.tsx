"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { updateArtist } from "@/app/(admin)/admin/artisti/_actions";

type Values = {
  stage_name: string;
  city: string;
  genre: string;
  bio: string;
  cover_image: string;
  base_fee: string;
  instagram: string;
  spotify: string;
  website: string;
};

type Props = {
  artistId: string;
  defaults: Partial<Values>;
};

export function ArtistEditForm({ artistId, defaults }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<Values>({
    defaultValues: {
      stage_name: defaults.stage_name ?? "",
      city: defaults.city ?? "",
      genre: defaults.genre ?? "",
      bio: defaults.bio ?? "",
      cover_image: defaults.cover_image ?? "",
      base_fee: defaults.base_fee ?? "",
      instagram: defaults.instagram ?? "",
      spotify: defaults.spotify ?? "",
      website: defaults.website ?? "",
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    setOk(false);
    const res = await updateArtist(artistId, {
      stage_name: values.stage_name,
      city: values.city || undefined,
      genre: values.genre || undefined,
      bio: values.bio || undefined,
      cover_image: values.cover_image || undefined,
      base_fee: values.base_fee ? Number(values.base_fee) : undefined,
      instagram: values.instagram || undefined,
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
        <Field label="Generi (separati da virgola)">
          <Input placeholder="indie, trap" {...register("genre")} />
        </Field>
      </div>
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
      <Field label="Cachet base (€)">
        <Input type="number" min={0} step="0.01" {...register("base_fee")} />
      </Field>
      <Field label="Bio"><Textarea rows={5} {...register("bio")} /></Field>

      <fieldset className="space-y-2 border-t border-border pt-4">
        <legend className="text-xs uppercase tracking-wider text-muted-foreground">Social</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Instagram"><Input placeholder="@handle" {...register("instagram")} /></Field>
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
