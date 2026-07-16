"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitEventRequest, type EventRequestInput } from "@/app/_actions/event-request";

type Values = {
  name: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  location: string;
  budget: string;
  message: string;
};

export function EventRequestForm() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Values>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      eventType: "",
      eventDate: "",
      location: "",
      budget: "",
      message: "",
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const payload: EventRequestInput = {
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      eventType: values.eventType,
      eventDate: values.eventDate || undefined,
      location: values.location || undefined,
      budget: values.budget || undefined,
      message: values.message,
    };
    const res = await submitEventRequest(payload);
    if (!res.ok) {
      setError(res.error ?? "Errore");
      return;
    }
    setSuccess(true);
    reset();
  }

  if (success) {
    return (
      <div className="rounded-xl border border-azzurro/30 bg-azzurro-subtle p-8 text-center text-notte">
        <p className="font-display text-2xl text-azzurro">Grazie!</p>
        <p className="mt-2 text-sm text-notte/70">
          Abbiamo ricevuto la tua richiesta. Ti risponderemo entro 48 ore via email.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setSuccess(false)}
        >
          Invia un&apos;altra richiesta
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome e cognome" required>
          <Input
            placeholder="Mario Rossi"
            className="border-palco-60 bg-white text-notte placeholder:text-notte/40 focus:border-azzurro"
            {...register("name", { required: true, minLength: 2 })}
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            placeholder="mario@esempio.it"
            className="border-palco-60 bg-white text-notte placeholder:text-notte/40 focus:border-azzurro"
            {...register("email", { required: true })}
          />
        </Field>
        <Field label="Telefono">
          <Input
            type="tel"
            placeholder="+39 ..."
            className="border-palco-60 bg-white text-notte placeholder:text-notte/40 focus:border-azzurro"
            {...register("phone")}
          />
        </Field>
        <Field label="Tipo di evento" required>
          <Input
            placeholder="Matrimonio, festa privata, concerto…"
            className="border-palco-60 bg-white text-notte placeholder:text-notte/40 focus:border-azzurro"
            {...register("eventType", { required: true })}
          />
        </Field>
        <Field label="Data desiderata">
          <Input
            type="date"
            className="border-palco-60 bg-white text-notte focus:border-azzurro"
            {...register("eventDate")}
          />
        </Field>
        <Field label="Luogo">
          <Input
            placeholder="Città o venue"
            className="border-palco-60 bg-white text-notte placeholder:text-notte/40 focus:border-azzurro"
            {...register("location")}
          />
        </Field>
      </div>
      <Field label="Budget indicativo">
        <Input
          placeholder="es. €1.500 — €3.000"
          className="border-palco-60 bg-white text-notte placeholder:text-notte/40 focus:border-azzurro"
          {...register("budget")}
        />
      </Field>
      <Field label="Raccontaci di più" required>
        <Textarea
          rows={5}
          placeholder="Tipo di musica, ospiti, atmosfera, qualunque dettaglio utile…"
          className="border-palco-60 bg-white text-notte placeholder:text-notte/40 focus:border-azzurro"
          {...register("message", { required: true, minLength: 10 })}
        />
      </Field>
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="default" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Invio in corso…" : "Invia richiesta"}
        </Button>
        <p className="text-xs text-notte/60">
          Risposta garantita entro 48 ore. Nessun obbligo.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-notte">
        {label}
        {required && <span className="ml-1 text-corallo">*</span>}
      </Label>
      {children}
    </div>
  );
}
