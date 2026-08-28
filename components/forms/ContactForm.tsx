"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validators/schemas";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitContact } from "@/app/(public)/contatti/_actions";
import { HoneypotFields } from "@/components/forms/HoneypotField";
import { PrivacyConsent } from "@/components/forms/PrivacyConsent";

export function ContactForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(values: ContactInput) {
    setError(null);
    const res = await submitContact(values);
    if (!res.ok) setError(res.error ?? "Errore. Riprova.");
    else setDone(true);
  }

  if (done) {
    return (
      <div className="border border-foreground p-6">
        <p className="font-display text-xl">Messaggio ricevuto</p>
        <p className="mt-2 text-sm text-muted-foreground">Ti risponderemo a breve.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <HoneypotFields register={register as never} />
      <Field label="Nome" error={errors.name?.message}>
        <Input {...register("name")} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" {...register("email")} />
      </Field>
      <Field label="Oggetto" error={errors.subject?.message}>
        <Input {...register("subject")} />
      </Field>
      <Field label="Messaggio" error={errors.message?.message}>
        <Textarea rows={6} {...register("message")} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <PrivacyConsent
        register={register("acceptedPrivacy")}
        error={errors.acceptedPrivacy?.message}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Invio..." : "Invia"}
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
