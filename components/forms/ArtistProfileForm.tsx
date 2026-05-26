"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { GalleryUpload } from "@/components/forms/GalleryUpload";
import { AudioUpload, type AudioTrack } from "@/components/forms/AudioUpload";
import { INSTRUMENT_OPTIONS } from "@/lib/constants/artist-options";
import { updateArtistProfile } from "@/app/(artist)/dashboard/_actions";

type Artist = {
  id: string;
  stage_name: string;
  bio: string | null;
  genre: string[];
  instruments?: string[] | null;
  city: string | null;
  cover_image: string | null;
  social_links: unknown;
  gallery: string[];
  videos: string[];
  audio_files?: AudioTrack[] | null;
  tier?: "free" | "pro" | "max";
  percorso_artistico?: "cover_artist" | "tribute_band" | "progetto_inedito" | null;
};

const PERCORSO_LABEL: Record<"cover_artist" | "tribute_band" | "progetto_inedito", string> = {
  cover_artist: "Cover artist",
  tribute_band: "Tribute band",
  progetto_inedito: "Progetto inedito",
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
  genre: string[];
  instruments: string[];
  city: string;
  cover_image: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  website: string;
  gallery: string[];
  videos: string;
  audio_files: AudioTrack[];
  percorso_artistico: "" | "cover_artist" | "tribute_band" | "progetto_inedito";
};

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ArtistProfileForm({
  artist,
  genreOptions,
}: {
  artist: Artist;
  genreOptions: string[];
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      stage_name: artist.stage_name,
      bio: artist.bio ?? "",
      genre: artist.genre ?? [],
      instruments: artist.instruments ?? [],
      city: artist.city ?? "",
      cover_image: artist.cover_image ?? "",
      instagram: readLink(artist.social_links, "instagram"),
      facebook: readLink(artist.social_links, "facebook"),
      tiktok: readLink(artist.social_links, "tiktok"),
      youtube: readLink(artist.social_links, "youtube"),
      spotify: readLink(artist.social_links, "spotify"),
      website: readLink(artist.social_links, "website"),
      gallery: artist.gallery ?? [],
      videos: (artist.videos ?? []).join("\n"),
      audio_files: (artist.audio_files ?? []) as AudioTrack[],
      percorso_artistico: (artist.percorso_artistico ?? "") as FormValues["percorso_artistico"],
    },
  });

  const tier = artist.tier ?? "free";
  const canEditPercorso = tier === "pro" || tier === "max";

  const genreOpts = genreOptions.map((g) => ({ value: g, label: g }));
  const instrumentOpts = INSTRUMENT_OPTIONS.map((i) => ({ value: i, label: i }));

  async function onSubmit(values: FormValues) {
    setError(null);
    const res = await updateArtistProfile(artist.id, {
      stage_name: values.stage_name,
      bio: values.bio || null,
      genre: values.genre,
      instruments: values.instruments,
      city: values.city || null,
      cover_image: values.cover_image || null,
      social_links: {
        ...(values.instagram ? { instagram: values.instagram } : {}),
        ...(values.facebook ? { facebook: values.facebook } : {}),
        ...(values.tiktok ? { tiktok: values.tiktok } : {}),
        ...(values.youtube ? { youtube: values.youtube } : {}),
        ...(values.spotify ? { spotify: values.spotify } : {}),
        ...(values.website ? { website: values.website } : {}),
      },
      gallery: values.gallery,
      videos: splitLines(values.videos),
      audio_files: (values.audio_files ?? []).filter((t) => t && t.url),
      percorso_artistico: canEditPercorso
        ? values.percorso_artistico === ""
          ? null
          : values.percorso_artistico
        : null,
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
        <Field label="Generi musicali (max 3)">
          <Controller
            control={control}
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
            control={control}
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
        <Field label="Bio">
          <Textarea rows={5} {...register("bio")} />
        </Field>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Label>Percorso artistico</Label>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                tier === "free"
                  ? "border-border text-muted-foreground"
                  : "border-accent text-accent"
              }`}
            >
              Piano: {tier}
            </span>
          </div>
          {canEditPercorso ? (
            <select
              {...register("percorso_artistico")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">— Non specificato —</option>
              <option value="cover_artist">{PERCORSO_LABEL.cover_artist}</option>
              <option value="tribute_band">{PERCORSO_LABEL.tribute_band}</option>
              <option value="progetto_inedito">{PERCORSO_LABEL.progetto_inedito}</option>
            </select>
          ) : (
            <p className="text-sm text-muted-foreground">
              Il campo <em>Percorso artistico</em> (cover artist, tribute band,
              progetto inedito) è disponibile solo per gli artisti con piano{" "}
              <strong>Pro</strong> o <strong>Max</strong>. Contatta lo staff N&apos;arte
              per l&apos;upgrade.
            </p>
          )}
        </div>
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
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="font-display text-lg uppercase">Galleria foto</legend>
        <Controller
          control={control}
          name="gallery"
          render={({ field }) => (
            <GalleryUpload
              label="Carica foto direttamente da computer o cellulare"
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="font-display text-lg uppercase">Tracce audio</legend>
        <Controller
          control={control}
          name="audio_files"
          render={({ field }) => (
            <AudioUpload
              label="Carica demo, brani o estratti dal vivo (MP3/WAV/M4A)"
              value={(field.value ?? []) as AudioTrack[]}
              onChange={field.onChange}
            />
          )}
        />
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
