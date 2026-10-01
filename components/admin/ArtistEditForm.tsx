"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { INSTRUMENT_OPTIONS } from "@/lib/constants/artist-options";
import { MotivazioneField } from "@/components/admin/MotivazioneField";
import { updateArtist } from "@/app/(admin)/admin/artisti/_actions";
import type { PersonnelRowView } from "@/lib/admin/personnel";

type Values = {
  stage_name: string;
  city: string;
  genre: string[];
  instruments: string[];
  bio: string;
  cover_image: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  spotify: string;
  website: string;
};

type Props = {
  artistId: string;
  genreOptions: string[];
  defaults: Partial<Values>;
  /** Componenti della band, ciascuno con la posizione nell'array salvato. */
  personnel?: PersonnelRowView[];
};

type PersonaRow = { name: string; role: string; origine: number | null; origineNome: string | null };

export function ArtistEditForm({ artistId, genreOptions, defaults, personnel = [] }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [reason, setReason] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [persone, setPersone] = useState<PersonaRow[]>(() =>
    personnel.map((p) => ({ name: p.name, role: p.role, origine: p.origine, origineNome: p.name })),
  );
  // I componenti si inviano solo se sono stati toccati.
  const personeToccate =
    persone.length !== personnel.length ||
    persone.some((p, i) => {
      const o = personnel[i];
      return !o || p.origine !== o.origine || p.name.trim() !== o.name.trim() || p.role.trim() !== o.role.trim();
    });
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<Values>({
    defaultValues: {
      stage_name: defaults.stage_name ?? "",
      city: defaults.city ?? "",
      genre: defaults.genre ?? [],
      instruments: defaults.instruments ?? [],
      bio: defaults.bio ?? "",
      cover_image: defaults.cover_image ?? "",
      instagram: defaults.instagram ?? "",
      facebook: defaults.facebook ?? "",
      tiktok: defaults.tiktok ?? "",
      youtube: defaults.youtube ?? "",
      spotify: defaults.spotify ?? "",
      website: defaults.website ?? "",
    },
  });

  const genreOpts = genreOptions.map((g) => ({ value: g, label: g }));
  const instrumentOpts = INSTRUMENT_OPTIONS.map((i) => ({ value: i, label: i }));

  async function onSubmit(values: Values) {
    setError(null);
    setOk(false);
    if (personeToccate && !reason) {
      setError("Hai modificato i componenti della band: indica regola e fatti nella motivazione.");
      return;
    }
    const res = await updateArtist(artistId, {
      stage_name: values.stage_name,
      city: values.city || undefined,
      genre: values.genre.join(",") || undefined,
      instruments: values.instruments.join(",") || undefined,
      bio: values.bio || undefined,
      cover_image: values.cover_image || undefined,
      instagram: values.instagram || undefined,
      facebook: values.facebook || undefined,
      tiktok: values.tiktok || undefined,
      youtube: values.youtube || undefined,
      spotify: values.spotify || undefined,
      website: values.website || undefined,
    }, reason, personeToccate
      ? persone
          .filter((p) => p.name.trim() !== "")
          .map((p) => ({ name: p.name.trim(), role: p.role.trim(), origine: p.origine, origineNome: p.origineNome }))
      : undefined);
    if (!res.ok) {
      setError(res.error ?? "Errore aggiornamento");
      return;
    }
    setOk(true);
    setReason("");
    setResetKey((k) => k + 1);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Nome d'arte"><Input {...register("stage_name", { required: true })} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Città"><Input {...register("city")} /></Field>
        <Field label="Generi musicali">
          <Controller
            control={control}
            name="genre"
            render={({ field }) => (
              <MultiSelect
                options={genreOpts}
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Seleziona generi…"
                searchPlaceholder="Cerca genere…"
              />
            )}
          />
        </Field>
      </div>
      <Field label="Strumenti suonati live">
        <Controller
          control={control}
          name="instruments"
          render={({ field }) => (
            <MultiSelect
              options={instrumentOpts}
              value={field.value ?? []}
              onChange={field.onChange}
              placeholder="Seleziona strumenti…"
              searchPlaceholder="Cerca strumento…"
            />
          )}
        />
      </Field>
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

      <fieldset className="space-y-2 border-t border-border pt-4">
        <legend className="text-xs uppercase tracking-wider text-muted-foreground">Social</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Instagram"><Input placeholder="@handle o link" {...register("instagram")} /></Field>
          <Field label="Facebook"><Input placeholder="link Facebook" {...register("facebook")} /></Field>
          <Field label="TikTok"><Input placeholder="@handle o link" {...register("tiktok")} /></Field>
          <Field label="YouTube"><Input placeholder="link canale YouTube" {...register("youtube")} /></Field>
          <Field label="Spotify"><Input placeholder="link Spotify" {...register("spotify")} /></Field>
          <Field label="Sito web"><Input type="url" placeholder="https://" {...register("website")} /></Field>
        </div>
      </fieldset>

      <fieldset className="space-y-2 border-t border-border pt-4">
        <legend className="text-xs uppercase tracking-wider text-muted-foreground">Componenti della band</legend>
        {persone.length === 0 && <p className="text-xs text-muted-foreground">Nessun componente indicato.</p>}
        {persone.map((p, i) => (
          <div key={p.origine ?? `nuovo-${i}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <Input
              aria-label={`Nome del componente ${i + 1}`}
              placeholder="Nome"
              value={p.name}
              maxLength={120}
              onChange={(e) => setPersone((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <Input
              aria-label={`Ruolo del componente ${i + 1}`}
              placeholder="Ruolo"
              value={p.role}
              maxLength={120}
              onChange={(e) => setPersone((prev) => prev.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPersone((prev) => prev.filter((_, j) => j !== i))}
            >
              Rimuovi
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPersone((prev) => [...prev, { name: "", role: "", origine: null, origineNome: null }])}
        >
          Aggiungi componente
        </Button>
        {personeToccate && (
          <p className="text-xs text-muted-foreground">
            Modifica ai componenti: la motivazione qui sotto è obbligatoria e viene inviata all&apos;artista.
          </p>
        )}
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <MotivazioneField
        label={personeToccate ? "Motivazione della modifica (obbligatoria)" : "Motivo della modifica (facoltativo)"}
        resetKey={resetKey}
        onChange={setReason}
        hint="Se la compili e il profilo appartiene a un altro utente, gli inviamo un'email con l'elenco dei campi cambiati e questo motivo."
      />
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
