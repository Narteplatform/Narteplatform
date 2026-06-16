"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { updateOrganizerProfile } from "@/app/(organizer)/organizzatore/_actions";
import type { OrganizerProfileInput } from "@/lib/validators/schemas";

type Existing = {
  id: string;
  display_name: string;
  bio: string | null;
  is_brand: boolean;
  is_private: boolean;
  avatar_url: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
};

type FormValues = {
  display_name: string;
  bio: string;
  is_brand: boolean;
  is_private: boolean;
  avatar_url: string;
  phone: string;
  website: string;
  instagram: string;
};

export function OrganizerProfileForm({ organizer }: { organizer: Existing }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, control, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      display_name: organizer.display_name,
      bio: organizer.bio ?? "",
      is_brand: organizer.is_brand,
      is_private: organizer.is_private,
      avatar_url: organizer.avatar_url ?? "",
      phone: organizer.phone ?? "",
      website: organizer.website ?? "",
      instagram: organizer.instagram ?? "",
    },
  });

  const isBrand = watch("is_brand");
  const isPrivate = watch("is_private");

  const onSubmit = (values: FormValues) => {
    start(async () => {
      setError(null);
      setSaved(false);
      const payload: OrganizerProfileInput = {
        display_name: values.display_name,
        bio: values.bio || undefined,
        is_brand: values.is_brand,
        is_private: values.is_private,
        avatar_url: values.avatar_url || undefined,
        phone: values.phone || undefined,
        website: values.website || undefined,
        instagram: values.instagram || undefined,
      };
      const res = await updateOrganizerProfile(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="font-display text-sm uppercase tracking-wider">Identità</legend>
        <Controller
          control={control}
          name="avatar_url"
          render={({ field }) => (
            <ImageUpload
              label="Foto profilo"
              kind="avatar"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="display_name">Nome visualizzato *</Label>
            <Input id="display_name" required {...register("display_name", { required: true })} />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" {...register("is_brand")} />
              <span>Gestisco le strutture sotto un unico brand</span>
            </label>
          </div>
        </div>
        <div>
          <Label>Tipo di organizzatore</Label>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="organizer_kind"
                className="size-4"
                checked={!isPrivate}
                onChange={() => setValue("is_private", false)}
              />
              <span>Struttura</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="organizer_kind"
                className="size-4"
                checked={isPrivate}
                onChange={() => setValue("is_private", true)}
              />
              <span>Privato</span>
            </label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Indica se organizzi come privato o come struttura/locale.
          </p>
        </div>
        <div>
          <Label htmlFor="bio">{isBrand ? "Bio del brand" : "Su di me"}</Label>
          <Textarea
            id="bio"
            rows={5}
            placeholder={
              isBrand
                ? "Descrivi il brand che raccoglie tutte le tue strutture."
                : "Raccontati: che esperienza hai nell'organizzare eventi?"
            }
            {...register("bio")}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-sm uppercase tracking-wider">Contatti</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div>
            <Label htmlFor="website">Sito</Label>
            <Input id="website" {...register("website")} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" {...register("instagram")} />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : "Salva profilo"}
        </Button>
        {saved && <span className="text-xs text-green-700">Salvato</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </form>
  );
}
