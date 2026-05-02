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
      <div className="border border-foreground/20 bg-background p-8 text-center">
        <p className="font-display text-2xl uppercase">Grazie!</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Abbiamo ricevuto la tua richiesta. Ti risponderemo a breve via email.
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-background">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome e cognome">
          <Input {...register("name", { required: true, minLength: 2 })} />
        </Field>
        <Field label="Email">
          <Input type="email" {...register("email", { required: true })} />
        </Field>
        <Field label="Telefono (opzionale)">
          <Input type="tel" {...register("phone")} />
        </Field>
        <Field label="Tipo di evento">
          <Input
            placeholder="Es. matrimonio, festa privata, concerto…"
            {...register("eventType", { required: true })}
          />
        </Field>
        <Field label="Data desiderata">
          <Input type="date" {...register("eventDate")} />
        </Field>
        <Field label="Luogo">
          <Input placeholder="Città / venue" {...register("location")} />
        </Field>
      </div>
      <Field label="Budget indicativo">
        <Input placeholder="Es. €1.500 — €3.000" {...register("budget")} />
      </Field>
      <Field label="Raccontaci di più">
        <Textarea rows={5} placeholder="Tipo di musica, ospiti, atmosfera, qualunque dettaglio utile…" {...register("message", { required: true, minLength: 10 })} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" variant="accent" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Invio in corso…" : "Invia richiesta"}
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
