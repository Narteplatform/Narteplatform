"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateArtistProfile } from "@/app/(artist)/dashboard/_actions";

type Artist = {
  id: string;
  stage_name: string;
  bio: string | null;
  genre: string[];
  city: string | null;
  cover_image: string | null;
  base_fee: number | null;
  social_links: Record<string, string>;
};

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
};

export function ArtistProfileForm({ artist }: { artist: Artist }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      stage_name: artist.stage_name,
      bio: artist.bio ?? "",
      genre: artist.genre.join(", "),
      city: artist.city ?? "",
      cover_image: artist.cover_image ?? "",
      base_fee: artist.base_fee?.toString() ?? "",
      instagram: artist.social_links?.instagram ?? "",
      spotify: artist.social_links?.spotify ?? "",
      website: artist.social_links?.website ?? "",
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
    });
    if (!res.ok) setError(res.error ?? "Errore");
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
      <Field label="Nome d'arte"><Input {...register("stage_name", { required: true })} /></Field>
      <Field label="Città"><Input {...register("city")} /></Field>
      <Field label="Generi (separati da virgola)"><Input {...register("genre")} /></Field>
      <Field label="Bio"><Textarea rows={5} {...register("bio")} /></Field>
      <Field label="URL immagine cover"><Input type="url" {...register("cover_image")} /></Field>
      <Field label="Tariffa base (€)"><Input type="number" min="0" step="50" {...register("base_fee")} /></Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Instagram"><Input {...register("instagram")} /></Field>
        <Field label="Spotify"><Input {...register("spotify")} /></Field>
        <Field label="Sito"><Input {...register("website")} /></Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-foreground">Salvato.</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio..." : "Salva"}
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
