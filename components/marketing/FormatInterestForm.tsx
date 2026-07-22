"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatInterestSchema, type FormatInterestInput } from "@/lib/validators/schemas";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitFormatInterest } from "@/app/(public)/format/_actions";
import { CheckCircle2 } from "lucide-react";

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
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormatInterestForm({ formatTitle }: { formatTitle?: string } = {}) {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormatInterestInput>({
    resolver: zodResolver(formatInterestSchema),
  });

  async function onSubmit(values: FormatInterestInput) {
    setServerError(null);
    // Se il form è incorporato nella pagina di un format specifico, anteponiamo
    // il riferimento al messaggio del lead per sapere da dove arriva la richiesta.
    const payload = formatTitle
      ? { ...values, message: `[Format: ${formatTitle}]\n\n${values.message}` }
      : values;
    const res = await submitFormatInterest(payload);
    if (!res.ok) {
      setServerError(res.error ?? "Errore. Riprova.");
    } else {
      setDone(true);
    }
  }

  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/5 p-8 md:p-12">
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        {/* Left: copy */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Interessi
          </span>
          <h2 className="mt-4 font-display text-2xl md:text-3xl">
            Vuoi portare un format N&apos;arte nel tuo locale o festival?
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            Scrivici per ricevere il dossier completo con artisti, technical rider e
            modalità di ingaggio. Ti risponderemo entro 48 ore.
          </p>
        </div>

        {/* Right: form */}
        <div>
          {done ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-background p-8 text-center">
              <CheckCircle2 className="size-10 text-success" />
              <p className="font-display text-xl">Richiesta inviata!</p>
              <p className="text-sm text-muted-foreground">
                Abbiamo ricevuto il tuo messaggio e ti risponderemo a breve.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-xl border border-border bg-background p-6 space-y-4"
              noValidate
            >
              <Field label="Nome *" error={errors.name?.message}>
                <Input
                  {...register("name")}
                  placeholder="Il tuo nome"
                  autoComplete="name"
                />
              </Field>
              <Field label="Email *" error={errors.email?.message}>
                <Input
                  type="email"
                  {...register("email")}
                  placeholder="nome@esempio.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Telefono (opzionale)" error={errors.phone?.message}>
                <Input
                  type="tel"
                  {...register("phone")}
                  placeholder="+39 000 0000000"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Messaggio *" error={errors.message?.message}>
                <Textarea
                  {...register("message")}
                  rows={5}
                  placeholder="Descrivici il tuo locale/festival, le date indicative e il format che ti interessa..."
                />
              </Field>
              {serverError && (
                <p className="text-sm text-error" role="alert">
                  {serverError}
                </p>
              )}
              <Button
                type="submit"
                variant="accent"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Invio in corso..." : "Invia richiesta"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
