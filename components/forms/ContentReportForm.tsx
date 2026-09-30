"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contentReportSchema,
  REPORT_CATEGORIES,
  REPORT_TARGET_TYPES,
  type ContentReportInput,
  type ReportCategory,
  type ReportTargetType,
} from "@/lib/validators/schemas";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { HoneypotFields } from "@/components/forms/HoneypotField";
import { submitContentReport } from "@/app/(public)/segnalazioni/_actions";

const selectClass =
  "h-10 w-full rounded-md border-[1.5px] border-border bg-surface px-3 text-sm text-foreground transition-colors focus:border-azzurro focus:outline-none focus:ring-[3px] focus:ring-azzurro/15";

/** Le categorie scelte dall'utente: «reclamo_decisione» lo imposta il server. */
const CATEGORIE_MODULO = (Object.keys(REPORT_CATEGORIES) as ReportCategory[]).filter(
  (k) => k !== "reclamo_decisione"
);
const TIPI_MODULO = (Object.keys(REPORT_TARGET_TYPES) as ReportTargetType[]).filter(
  (k) => k !== "decisione"
);

export function ContentReportForm({
  defaultName = "",
  defaultEmail = "",
  defaultTargetType = "profilo",
  defaultTargetUrl = "",
  contestedReference = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
  defaultTargetType?: ReportTargetType;
  defaultTargetUrl?: string;
  /** Se valorizzato il modulo è un reclamo contro quella decisione. */
  contestedReference?: string;
}) {
  const isReclamo = contestedReference !== "";
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContentReportInput>({
    resolver: zodResolver(contentReportSchema),
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      target_type: isReclamo ? "decisione" : defaultTargetType,
      target_url: defaultTargetUrl,
      category: isReclamo ? "reclamo_decisione" : "contenuto_illecito",
      description: "",
      contested_reference: contestedReference,
    },
  });

  async function onSubmit(values: ContentReportInput) {
    setError(null);
    const res = await submitContentReport(values);
    if (!res.ok) setError(res.error);
    else setReference(res.reference);
  }

  if (reference) {
    return (
      <div className="border border-foreground p-6" role="status">
        <p className="font-display text-xl">{isReclamo ? "Reclamo ricevuto" : "Segnalazione ricevuta"}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Il tuo riferimento è <strong className="text-foreground">{reference}</strong>. Ti abbiamo
          scritto una conferma via email: conservalo, ti servirà se vorrai scriverci di nuovo su
          questo caso. La prendiamo in carico entro 2 giorni lavorativi.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <HoneypotFields register={register as never} />

      {isReclamo && (
        <div className="space-y-1">
          <Label>Decisione contestata</Label>
          <Input readOnly {...register("contested_reference")} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome" error={errors.name?.message}>
          <Input autoComplete="name" {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
      </div>

      {!isReclamo && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cosa vuoi segnalare" error={errors.target_type?.message}>
              <select className={selectClass} {...register("target_type")}>
                {TIPI_MODULO.map((k) => (
                  <option key={k} value={k}>
                    {REPORT_TARGET_TYPES[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Motivo" error={errors.category?.message}>
              <select className={selectClass} {...register("category")}>
                {CATEGORIE_MODULO.map((k) => (
                  <option key={k} value={k}>
                    {REPORT_CATEGORIES[k]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="Dove si trova (indirizzo o percorso)"
            error={errors.target_url?.message}
          >
            <Input placeholder="/artisti/nome-artista" {...register("target_url")} />
          </Field>
        </>
      )}

      <Field
        label={isReclamo ? "Perché ritieni la decisione sbagliata" : "Spiega perché"}
        error={errors.description?.message}
      >
        <Textarea rows={7} {...register("description")} />
      </Field>

      <Checkbox
        {...register("good_faith")}
        error={errors.good_faith?.message}
        label="Dichiaro in buona fede che le informazioni fornite sono esatte e complete."
      />

      <p className="text-xs text-muted-foreground">
        Usiamo nome ed email per confermarti la ricezione e comunicarti l&rsquo;esito, come
        descritto nell&rsquo;
        <Link href="/privacy" className="underline underline-offset-2">
          informativa privacy
        </Link>
        . Nome ed email non vengono mai mostrati a chi ha pubblicato il contenuto.
      </p>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Invio..." : isReclamo ? "Invia il reclamo" : "Invia la segnalazione"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
