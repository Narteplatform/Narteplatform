"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { updateArtistProfile } from "@/app/(artist)/dashboard/_actions";

type Artist = {
  id: string;
  stage_name: string;
  bio: string | null;
  genre: string[];
  city: string | null;
  cover_image: string | null;
  base_fee: number | null;
  social_links: unknown;
  gallery: string[];
  videos: string[];
};

function readLink(links: unknown, key: string): string {
  if (links && typeof links === "object" && !Array.isArray(links)) {
    const v = (links as Record<string, unknown>)[key];
    return typeof v === "string" ? v : "";
  }
  return "";
}

type FormValues = {
  stage_name: string;
  bio: string;
  genre: string;
  city: string;
  cover_image: string;
  base_fee: string;
  instagram: string;
  spotify: string;
  website: string;
  gallery: string;
  videos: string;
};

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ArtistProfileForm({ artist }: { artist: Artist }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      stage_name: artist.stage_name,
      bio: artist.bio ?? "",
      genre: artist.genre.join(", "),
      city: artist.city ?? "",
      cover_image: artist.cover_image ?? "",
      base_fee: artist.base_fee?.toString() ?? "",
      instagram: readLink(artist.social_links, "instagram"),
      spotify: readLink(artist.social_links, "spotify"),
      website: readLink(artist.social_links, "website"),
      gallery: (artist.gallery ?? []).join("\n"),
      videos: (artist.videos ?? []).join("\n"),
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const res = await updateArtistProfile(artist.id, {
      stage_name: values.stage_name,
      bio: values.bio || null,
      genre: values.genre.split(",").map((g) => g.trim()).filter(Boolean),
      city: values.city || null,
      cover_image: values.cover_image || null,
      base_fee: values.base_fee ? Number(values.base_fee) : null,
      social_links: {
        ...(values.instagram ? { instagram: values.instagram } : {}),
        ...(values.spotify ? { spotify: values.spotify } : {}),
        ...(values.website ? { website: values.website } : {}),
      },
      gallery: splitLines(values.gallery),
      videos: splitLines(values.videos),
    });
    if (!res.ok) setError(res.error ?? "Errore");
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      <fieldset className="space-y-4">
        <legend className="font-display text-lg uppercase">Identità</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome d'arte"><Input {...register("stage_name", { required: true })} /></Field>
          <Field label="Città"><Input {...register("city")} /></Field>
        </div>
        <Field label="Generi (separati da virgola)"><Input {...register("genre")} /></Field>
        <Field label="Bio">
          <Textarea rows={5} {...register("bio")} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="font-display text-lg uppercase">Immagine principale</legend>
        <Controller
          control={control}
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
        <Field label="Tariffa base (€)">
          <Input type="number" min="0" step="50" {...register("base_fee")} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="font-display text-lg uppercase">Galleria foto</legend>
        <Field label="URL foto, una per riga">
          <Textarea
            rows={4}
            placeholder={"https://...jpg\nhttps://...jpg"}
            {...register("gallery")}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="font-display text-lg uppercase">Video</legend>
        <Field label="URL video YouTube/Vimeo, una per riga">
          <Textarea
            rows={3}
            placeholder={"https://youtube.com/watch?v=...\nhttps://vimeo.com/..."}
            {...register("videos")}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="font-display text-lg uppercase">Social</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Instagram"><Input placeholder="@handle" {...register("instagram")} /></Field>
          <Field label="Spotify"><Input placeholder="link Spotify" {...register("spotify")} /></Field>
          <Field label="Sito web"><Input type="url" placeholder="https://" {...register("website")} /></Field>
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Salvato. Le modifiche sono già live sul sito.</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio..." : "Salva profilo artista"}
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
