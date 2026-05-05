"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { GalleryUpload } from "@/components/forms/GalleryUpload";
import { createEvent, updateEvent } from "@/app/(admin)/admin/eventi/_actions";

const CATEGORIES = [
  "music", "clubs", "festivals", "dating", "culture", "art", "food", "workshops", "comedy", "business",
] as const;

type Values = {
  title: string;
  category: (typeof CATEGORIES)[number];
  date: string;
  endAt: string;
  city: string;
  venue: string;
  price: string;
  coverImage: string;
  coverImageHome: string;
  ticketUrl: string;
  description: string;
  featured: boolean;
  gallery: string[];
  videos: string;
};

function splitLines(t: string): string[] {
  return t.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function EventForm({
  defaultValues,
  eventId,
}: {
  defaultValues?: Partial<Values>;
  eventId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<Values>({
    defaultValues: {
      title: "",
      category: "music",
      date: "",
      endAt: "",
      city: "",
      venue: "",
      price: "",
      coverImage: "",
      coverImageHome: "",
      ticketUrl: "",
      description: "",
      featured: false,
      gallery: [],
      videos: "",
      ...defaultValues,
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const payload = {
      title: values.title,
      category: values.category,
      date: values.date,
      endAt: values.endAt || undefined,
      city: values.city,
      venue: values.venue || undefined,
      price: values.price ? Number(values.price) : undefined,
      coverImage: values.coverImage || undefined,
      coverImageHome: values.coverImageHome || undefined,
      ticketUrl: values.ticketUrl || undefined,
      description: values.description || undefined,
      featured: values.featured,
      gallery: values.gallery,
      videos: splitLines(values.videos),
    };
    const res = eventId ? await updateEvent(eventId, payload) : await createEvent(payload);
    if (!res.ok) {
      setError(res.error ?? "Errore");
      return;
    }
    router.push("/admin/eventi");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Field label="Titolo"><Input {...register("title", { required: true })} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Categoria">
          <select
            {...register("category")}
            className="h-11 w-full rounded-md border border-border bg-background px-4 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Inizio">
          <Input type="datetime-local" {...register("date", { required: true })} />
        </Field>
        <Field label="Fine (opzionale)">
          <Input type="datetime-local" {...register("endAt")} />
        </Field>
        <Field label="Città"><Input {...register("city", { required: true })} /></Field>
        <Field label="Venue"><Input {...register("venue")} /></Field>
        <Field label="Prezzo (€)"><Input type="number" min="0" step="0.01" {...register("price")} /></Field>
        <Field label="Link biglietti"><Input type="url" placeholder="https://…" {...register("ticketUrl")} /></Field>
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
        <legend className="px-2 font-display text-sm uppercase tracking-wide">
          Immagini evento
        </legend>
        <div className="grid gap-6 md:grid-cols-2">
          <Controller
            control={control}
            name="coverImageHome"
            render={({ field }) => (
              <ImageUpload
                label="Immagine card home (3:4 portrait)"
                value={field.value ?? ""}
                onChange={field.onChange}
                kind="event_home"
              />
            )}
          />
          <Controller
            control={control}
            name="coverImage"
            render={({ field }) => (
              <ImageUpload
                label="Immagine pagina evento (16:9 orizzontale)"
                value={field.value ?? ""}
                onChange={field.onChange}
                kind="event"
              />
            )}
          />
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          Le immagini vengono ritagliate al volo prima dell&apos;upload. La portrait è ottimizzata
          per la card della home/listing, l&apos;orizzontale per l&apos;hero della pagina singola.
        </p>
      </fieldset>

      <Field label="Descrizione"><Textarea rows={6} {...register("description")} /></Field>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="font-display text-lg uppercase">Galleria</legend>
        <Controller
          control={control}
          name="gallery"
          render={({ field }) => (
            <GalleryUpload
              label="Foto evento (caricamento diretto)"
              value={field.value ?? []}
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

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("featured")} />
        In evidenza in home
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio..." : eventId ? "Aggiorna" : "Crea evento"}
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
