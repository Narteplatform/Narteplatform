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
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  REPORT_BUCKET,
  REPORT_MAX_BYTES,
  REPORT_MAX_FILES,
  REPORT_MIME,
} from "@/lib/security/report-attachments";

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
  // Allegati già caricati nel percorso provvisorio: path sul bucket + nome.
  const [allegati, setAllegati] = useState<{ path: string; nome: string }[]>([]);
  const [caricando, setCaricando] = useState(false);
  const [scartati, setScartati] = useState(0);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const liberi = REPORT_MAX_FILES - allegati.length;
    const scelti = Array.from(files).slice(0, Math.max(liberi, 0));
    if (scelti.length === 0) {
      setError(`Puoi allegare al massimo ${REPORT_MAX_FILES} file.`);
      return;
    }
    setCaricando(true);
    try {
      const supabase = createBrowserClient();
      for (const file of scelti) {
        if (!(REPORT_MIME as readonly string[]).includes(file.type) || file.size > REPORT_MAX_BYTES) {
          setError("Sono ammesse immagini (jpg, png, webp) o PDF fino a 5 MB.");
          continue;
        }
        const r = await fetch("/api/segnalazioni/allegati", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
        });
        const firma = (await r.json().catch(() => null)) as
          | { ok: true; path: string; token: string }
          | { ok: false; error: string }
          | null;
        if (!firma || !firma.ok) {
          setError(firma && !firma.ok ? firma.error : "Caricamento non riuscito.");
          continue;
        }
        const { error: upErr } = await supabase.storage
          .from(REPORT_BUCKET)
          .uploadToSignedUrl(firma.path, firma.token, file, { contentType: file.type });
        if (upErr) {
          setError("Caricamento non riuscito: riprova.");
          continue;
        }
        setAllegati((a) => [...a, { path: firma.path, nome: file.name }]);
      }
    } finally {
      setCaricando(false);
    }
  }

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
    const res = await submitContentReport({ ...values, attachments: allegati.map((a) => a.path) });
    if (!res.ok) setError(res.error);
    else {
      setScartati(res.allegatiScartati ?? 0);
      setReference(res.reference);
    }
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
        {scartati > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {scartati === 1 ? "Un allegato non è stato accettato" : `${scartati} allegati non sono stati accettati`}{" "}
            perché non era un&rsquo;immagine o un PDF valido.
          </p>
        )}
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

      <div className="space-y-2">
        <Label>Allegati (facoltativi)</Label>
        <p className="text-xs text-muted-foreground">
          Fino a {REPORT_MAX_FILES} file: screenshot (jpg, png, webp) o PDF, massimo 5 MB ciascuno.
          Li vede solo il team N&rsquo;arte.
        </p>
        {allegati.length < REPORT_MAX_FILES && (
          <input
            type="file"
            multiple
            accept={REPORT_MIME.join(",")}
            disabled={caricando}
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
            className="block text-sm"
          />
        )}
        {caricando && <p className="text-xs text-muted-foreground">Caricamento…</p>}
        {allegati.length > 0 && (
          <ul className="space-y-1 text-sm">
            {allegati.map((a) => (
              <li key={a.path} className="flex items-center justify-between gap-2">
                <span className="truncate">{a.nome}</span>
                <button
                  type="button"
                  className="text-xs underline underline-offset-2"
                  onClick={() => setAllegati((l) => l.filter((x) => x.path !== a.path))}
                >
                  Togli
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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

      <Button type="submit" disabled={isSubmitting || caricando}>
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
