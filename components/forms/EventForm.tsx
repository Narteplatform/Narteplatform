"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { createEvent, updateEvent } from "@/app/(admin)/admin/eventi/_actions";

const CATEGORIES = [
  "music", "clubs", "festivals", "dating", "culture", "art", "food", "workshops", "comedy", "business",
] as const;

type Values = {
  title: string;
  category: (typeof CATEGORIES)[number];
  date: string;
  city: string;
  venue: string;
  price: string;
  coverImage: string;
  ticketUrl: string;
  description: string;
  featured: boolean;
};

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
      city: "",
      venue: "",
      price: "",
      coverImage: "",
      ticketUrl: "",
      description: "",
      featured: false,
      ...defaultValues,
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const payload = {
      title: values.title,
      category: values.category,
      date: values.date,
      city: values.city,
      venue: values.venue || undefined,
      price: values.price ? Number(values.price) : undefined,
      coverImage: values.coverImage || undefined,
      ticketUrl: values.ticketUrl || undefined,
      description: values.description || undefined,
      featured: values.featured,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <Field label="Data e ora">
          <Input type="datetime-local" {...register("date", { required: true })} />
        </Field>
        <Field label="Città"><Input {...register("city", { required: true })} /></Field>
        <Field label="Venue"><Input {...register("venue")} /></Field>
        <Field label="Prezzo (€)"><Input type="number" min="0" step="0.01" {...register("price")} /></Field>
        <Field label="Link biglietti"><Input type="url" placeholder="https://…" {...register("ticketUrl")} /></Field>
      </div>
      <Controller
        control={control}
        name="coverImage"
        render={({ field }) => (
          <ImageUpload
            label="Immagine cover evento (16:9)"
            value={field.value ?? ""}
            onChange={field.onChange}
            kind="event"
          />
        )}
      />
      <Field label="Descrizione"><Textarea rows={6} {...register("description")} /></Field>
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
