"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { GalleryUpload } from "@/components/forms/GalleryUpload";
import { EventVideoUpload } from "@/components/forms/EventVideoUpload";
import { createFormat, updateFormat } from "@/app/(admin)/admin/format/_actions";

type Values = {
  title: string;
  tagline: string;
  description: string;
  icon: string;
  order_index: string;
  cover_image: string;
  gallery: string[];
  videos: string[];
  seo_title: string;
  seo_description: string;
  published: boolean;
};

export function FormatForm({
  defaultValues,
  formatId,
}: {
  defaultValues?: Partial<Values>;
  formatId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<Values>({
    defaultValues: {
      title: "",
      tagline: "",
      description: "",
      icon: "",
      order_index: "0",
      cover_image: "",
      gallery: [],
      videos: [],
      seo_title: "",
      seo_description: "",
      published: true,
      ...defaultValues,
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const payload = {
      title: values.title,
      tagline: values.tagline || undefined,
      description: values.description || undefined,
      icon: values.icon || undefined,
      order_index: Number(values.order_index) || 0,
      cover_image: values.cover_image || undefined,
      gallery: values.gallery,
      videos: values.videos,
      seo_title: values.seo_title || undefined,
      seo_description: values.seo_description || undefined,
      published: values.published,
    };
    const res = formatId
      ? await updateFormat(formatId, payload)
      : await createFormat(payload);
    if (!res.ok) {
      setError(res.error ?? "Errore");
      return;
    }
    router.push("/admin/format");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titolo">
          <Input {...register("title", { required: true })} />
        </Field>
        <Field label="Icona (emoji o testo breve)">
          <Input placeholder="es. 🎸 oppure DJ" {...register("icon")} />
        </Field>
      </div>

      <Field label="Tagline">
        <Input placeholder="Sottotitolo breve del format" {...register("tagline")} />
      </Field>

      <Field label="Ordine (intero, crescente)">
        <Input type="number" min="0" step="1" {...register("order_index")} />
      </Field>

      <fieldset className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
        <legend className="px-2 font-display text-sm uppercase tracking-wide">
          Immagine di copertina
        </legend>
        <Controller
          control={control}
          name="cover_image"
          render={({ field }) => (
            <ImageUpload
              label="Immagine verticale (3:4 portrait)"
              value={field.value ?? ""}
              onChange={field.onChange}
              kind="format"
            />
          )}
        />
      </fieldset>

      <Field label="Descrizione">
        <Textarea rows={6} {...register("description")} />
      </Field>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="font-display text-lg uppercase">Galleria</legend>
        <Controller
          control={control}
          name="gallery"
          render={({ field }) => (
            <GalleryUpload
              label="Foto del format (caricamento diretto)"
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </fieldset>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="font-display text-lg uppercase">Video</legend>
        <Controller
          control={control}
          name="videos"
          render={({ field }) => (
            <EventVideoUpload
              value={field.value ?? []}
              onChange={field.onChange}
              kind="format-video"
            />
          )}
        />
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
        <legend className="px-2 font-display text-sm uppercase tracking-wide">SEO</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SEO Title">
            <Input placeholder="Titolo per motori di ricerca" {...register("seo_title")} />
          </Field>
          <Field label="SEO Description">
            <Input placeholder="Descrizione per motori di ricerca" {...register("seo_description")} />
          </Field>
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("published")} />
        Pubblicato (visibile sul sito)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio..." : formatId ? "Aggiorna format" : "Crea format"}
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
