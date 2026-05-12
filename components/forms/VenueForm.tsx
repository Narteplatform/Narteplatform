"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { GalleryUpload } from "@/components/forms/GalleryUpload";
import {
  createVenue,
  updateVenue,
  deleteVenue,
} from "@/app/(organizer)/organizzatore/_actions";
import type { VenueInput } from "@/lib/validators/schemas";
import type { VenueType } from "@/lib/supabase/types";

type FormValues = {
  name: string;
  venue_type: VenueType;
  address: string;
  city: string;
  region: string;
  postal_code: string;
  capacity: string;
  description: string;
  cover_image: string;
  gallery: string[];
  website: string;
  instagram: string;
  phone: string;
  email: string;
};

type Existing = {
  id: string;
  name: string;
  venue_type: VenueType;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  capacity: number | null;
  description: string | null;
  cover_image: string | null;
  gallery: string[];
  website: string | null;
  instagram: string | null;
  phone: string | null;
  email: string | null;
};

const TYPES: { value: VenueType; label: string }[] = [
  { value: "club", label: "Club" },
  { value: "pub", label: "Pub" },
  { value: "festival", label: "Festival" },
  { value: "teatro", label: "Teatro" },
  { value: "locale", label: "Locale" },
  { value: "altro", label: "Altro" },
];

export function VenueForm({ venue }: { venue?: Existing }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      name: venue?.name ?? "",
      venue_type: venue?.venue_type ?? "altro",
      address: venue?.address ?? "",
      city: venue?.city ?? "",
      region: venue?.region ?? "",
      postal_code: venue?.postal_code ?? "",
      capacity: venue?.capacity ? String(venue.capacity) : "",
      description: venue?.description ?? "",
      cover_image: venue?.cover_image ?? "",
      gallery: venue?.gallery ?? [],
      website: venue?.website ?? "",
      instagram: venue?.instagram ?? "",
      phone: venue?.phone ?? "",
      email: venue?.email ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    start(async () => {
      setError(null);
      setSaved(false);
      const payload: VenueInput = {
        name: values.name,
        venue_type: values.venue_type,
        address: values.address || undefined,
        city: values.city || undefined,
        region: values.region || undefined,
        postal_code: values.postal_code || undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
        description: values.description || undefined,
        cover_image: values.cover_image || undefined,
        gallery: values.gallery,
        website: values.website || undefined,
        instagram: values.instagram || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
      };

      const res = venue
        ? await updateVenue(venue.id, payload)
        : await createVenue(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (!venue && "id" in res) {
        router.push(`/organizzatore/strutture/${res.id}`);
      } else {
        router.refresh();
      }
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const onDelete = () => {
    if (!venue) return;
    if (!confirm("Eliminare definitivamente questa struttura?")) return;
    start(async () => {
      const res = await deleteVenue(venue.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/organizzatore/strutture");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-display text-sm uppercase tracking-wider">Identità</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Nome struttura *</Label>
            <Input id="name" required {...register("name", { required: true })} />
          </div>
          <div>
            <Label htmlFor="venue_type">Tipo</Label>
            <select
              id="venue_type"
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              {...register("venue_type")}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="description">Descrizione</Label>
          <Textarea id="description" rows={4} {...register("description")} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-sm uppercase tracking-wider">Location</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="address">Indirizzo</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div>
            <Label htmlFor="city">Città</Label>
            <Input id="city" {...register("city")} />
          </div>
          <div>
            <Label htmlFor="region">Regione</Label>
            <Input id="region" {...register("region")} />
          </div>
          <div>
            <Label htmlFor="postal_code">CAP</Label>
            <Input id="postal_code" {...register("postal_code")} />
          </div>
          <div>
            <Label htmlFor="capacity">Capienza</Label>
            <Input id="capacity" type="number" min={0} {...register("capacity")} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-sm uppercase tracking-wider">Media</legend>
        <Controller
          control={control}
          name="cover_image"
          render={({ field }) => (
            <ImageUpload
              label="Copertina (16:9)"
              kind="venue"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="gallery"
          render={({ field }) => (
            <GalleryUpload
              label="Galleria foto (max 6)"
              value={field.value ?? []}
              onChange={(urls) => field.onChange(urls.slice(0, 6))}
            />
          )}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-sm uppercase tracking-wider">Contatti</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="website">Sito</Label>
            <Input id="website" {...register("website")} />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" {...register("instagram")} />
          </div>
          <div>
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : venue ? "Salva modifiche" : "Crea struttura"}
        </Button>
        {venue && (
          <Button type="button" variant="outline" onClick={onDelete} disabled={pending}>
            Elimina
          </Button>
        )}
        {saved && <span className="text-xs text-green-700">Salvato</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </form>
  );
}
