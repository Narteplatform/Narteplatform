"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { createArtistManual } from "@/app/(admin)/admin/artisti/_actions";

type Values = {
  stage_name: string;
  email: string;
  city: string;
  genre: string;
  bio: string;
  cover_image: string;
};

export function ManualArtistForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<Values>();

  async function onSubmit(values: Values) {
    setError(null);
    const res = await createArtistManual({
      stage_name: values.stage_name,
      email: values.email || undefined,
      city: values.city || undefined,
      genre: values.genre || undefined,
      bio: values.bio || undefined,
      cover_image: values.cover_image || undefined,
    });
    if (!res.ok) {
      setError(res.error ?? "Errore");
      return;
    }
    router.push("/admin/artisti");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nome d'arte"><Input {...register("stage_name", { required: true })} /></Field>
      <Field label="Email (opzionale)"><Input type="email" {...register("email")} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Città"><Input {...register("city")} /></Field>
        <Field label="Generi"><Input placeholder="Indie, Trap" {...register("genre")} /></Field>
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
      <Field label="Bio"><Textarea rows={5} {...register("bio")} /></Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creazione..." : "Crea"}</Button>
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
