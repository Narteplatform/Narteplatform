"use client";

import * as React from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { CalendarCheck, Plus, Trash2 } from "lucide-react";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { ProfileSection } from "@/components/dashboard/profile/ProfileSection";
import { Field, ProfileSectionForm } from "@/components/dashboard/profile/ProfileSectionForm";
import { useProfileSectionForm } from "@/components/dashboard/profile/useProfileSectionForm";
import { INSTRUMENT_OPTIONS } from "@/lib/constants/artist-options";
import { BUDGET_RANGES } from "@/lib/constants/budget-ranges";
import {
  bookingSectionSchema,
  toBookingPayload,
  type BookingSectionValues,
} from "@/lib/validators/artist-profile";
import { normalisePersonnel, type ArtistProfileData } from "@/components/dashboard/profile/types";

const LANGUAGE_OPTIONS = ["Italiano", "Dialetto", "Inglese", "Francese", "Spagnolo"].map((l) => ({
  value: l,
  label: l,
}));

const GIG_MIN_OPTIONS = [30, 60, 90, 120];
const GIG_MAX_OPTIONS = [30, 60, 90, 120, 150, 180];

const SELECT_CLASS = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm";

/** Campi contati nel badge di stato dell'intestazione. */
const COUNTED_FIELDS = [
  "price_range",
  "languages",
  "gig_min_minutes",
  "gig_max_minutes",
  "what_to_expect",
  "about_extended",
  "personnel",
  "set_list",
  "influences",
  "setup_requirements",
] as const;

export function BookingBlock({ artist }: { artist: ArtistProfileData }) {
  const defaultValues = React.useMemo<BookingSectionValues>(
    () => ({
      // In DB può esserci la label ("100 — 300 €") invece del value: si accettano
      // entrambi, altrimenti i profili salvati prima perderebbero la fascia.
      price_range: (() => {
        const raw = artist.price_range ?? "";
        if (BUDGET_RANGES.some((r) => r.value === raw)) return raw;
        return BUDGET_RANGES.find((r) => r.label === raw)?.value ?? "";
      })(),
      languages: artist.languages ?? [],
      gig_min_minutes: artist.gig_min_minutes != null ? String(artist.gig_min_minutes) : "",
      gig_max_minutes: artist.gig_max_minutes != null ? String(artist.gig_max_minutes) : "",
      what_to_expect: artist.what_to_expect ?? "",
      about_extended: artist.about_extended ?? "",
      personnel: normalisePersonnel(artist.personnel),
      set_list: artist.set_list ?? "",
      influences: (artist.influences ?? []).join(", "),
      setup_requirements: artist.setup_requirements ?? "",
    }),
    [artist]
  );

  const { form, onSubmit, isDirty, isSubmitting, serverError } = useProfileSectionForm({
    artistId: artist.id,
    section: "booking",
    schema: bookingSectionSchema,
    defaultValues,
    toPayload: toBookingPayload,
    successMessage: "Informazioni di booking salvate",
  });

  const {
    fields: personnelFields,
    append: appendPersonnel,
    remove: removePersonnel,
  } = useFieldArray({ control: form.control, name: "personnel" });

  const values = useWatch({ control: form.control });
  const filled = COUNTED_FIELDS.filter((key) => {
    const v = values?.[key];
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === "string" && v.trim().length > 0;
  }).length;

  const errors = form.formState.errors;

  return (
    <ProfileSection
      id="booking"
      title="Informazioni di booking"
      description="Quello che un organizzatore vuole sapere prima di scriverti"
      icon={<CalendarCheck className="size-4" />}
      status={
        filled > 0
          ? { tone: filled === COUNTED_FIELDS.length ? "complete" : "count", label: `${filled}/${COUNTED_FIELDS.length} campi` }
          : { tone: "todo", label: "Da compilare" }
      }
      dirty={isDirty}
    >
      <ProfileSectionForm
        onSubmit={onSubmit}
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        serverError={serverError}
      >
        <p className="text-xs text-muted-foreground">
          Questa sezione appare sul tuo profilo pubblico con tab cliccabili. Tutti i campi sono
          opzionali — più informazioni dai, più è semplice ricevere proposte.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Fascia di prezzo">
            <select {...form.register("price_range")} className={SELECT_CLASS}>
              <option value="">— Non specificata —</option>
              {BUDGET_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Lingue">
            <Controller
              control={form.control}
              name="languages"
              render={({ field }) => (
                <MultiSelect
                  options={LANGUAGE_OPTIONS}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Seleziona le lingue…"
                  searchPlaceholder="Cerca lingua…"
                  emptyText="Nessuna lingua trovata"
                />
              )}
            />
          </Field>

          <Field label="Durata minima set">
            <select {...form.register("gig_min_minutes")} className={SELECT_CLASS}>
              <option value="">— Non specificata —</option>
              {GIG_MIN_OPTIONS.map((m) => (
                <option key={m} value={String(m)}>
                  {m} minuti
                </option>
              ))}
            </select>
          </Field>

          <Field label="Durata massima set" error={errors.gig_max_minutes?.message}>
            <select {...form.register("gig_max_minutes")} className={SELECT_CLASS}>
              <option value="">— Non specificata —</option>
              {GIG_MAX_OPTIONS.map((m) => (
                <option key={m} value={String(m)}>
                  {m} minuti
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Cosa aspettarsi dal live" error={errors.what_to_expect?.message}>
          <Textarea
            rows={5}
            placeholder="Stile, atmosfera, mood, parti più cool del set…"
            {...form.register("what_to_expect")}
          />
        </Field>

        <Field label="About — storia del progetto (versione estesa)" error={errors.about_extended?.message}>
          <Textarea
            rows={5}
            placeholder="Come è nato il progetto, formazione, esperienze rilevanti…"
            {...form.register("about_extended")}
          />
        </Field>

        <div className="space-y-2">
          <Label>Personale / formazione</Label>
          <div className="space-y-2">
            {personnelFields.map((fieldItem, index) => (
              <div key={fieldItem.id} className="flex items-center gap-2">
                <Input
                  placeholder="Nome"
                  {...form.register(`personnel.${index}.name`)}
                  className="flex-1"
                />
                <select {...form.register(`personnel.${index}.role`)} className={`${SELECT_CLASS} flex-1`}>
                  <option value="">— Ruolo —</option>
                  {INSTRUMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removePersonnel(index)}
                  aria-label="Rimuovi membro"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:border-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendPersonnel({ name: "", role: "" })}
          >
            <Plus className="size-4" /> Aggiungi membro
          </Button>
          {personnelFields.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nessun membro aggiunto. Clicca &quot;Aggiungi membro&quot; per inserire nome e ruolo.
            </p>
          )}
        </div>

        <Field label="Set list di esempio" error={errors.set_list?.message}>
          <Textarea
            rows={5}
            placeholder={"Brano 1 — Autore\nBrano 2 — Autore\n…"}
            {...form.register("set_list")}
          />
        </Field>

        <Field label="Influenze musicali (separate da virgola)" error={errors.influences?.message}>
          <Input
            placeholder="es. Pino Daniele, Beatles, Coldplay, James Senese"
            {...form.register("influences")}
          />
        </Field>

        <Field
          label="Requisiti tecnici di setup (PA, palco, alimentazione…)"
          error={errors.setup_requirements?.message}
        >
          <Textarea
            rows={5}
            placeholder="Esempio: PA stereo min. 2x500W, monitor a pavimento, 2 prese 230V, palco min 4x3m…"
            {...form.register("setup_requirements")}
          />
        </Field>
      </ProfileSectionForm>
    </ProfileSection>
  );
}
