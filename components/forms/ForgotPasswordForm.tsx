"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, MailCheck } from "lucide-react";
import {
  passwordResetRequestSchema,
  type PasswordResetRequestInput,
} from "@/lib/validators/schemas";
import { requestPasswordReset } from "@/app/(auth)/recupero-password/_actions";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
  });

  // L'invio passa da una Server Action e non più dal client: il link va
  // generato con la chiave service-role per poterlo spedire con il template
  // Brevo, e quella chiave nel browser non ci va mai.
  async function onSubmit(values: PasswordResetRequestInput) {
    setError(null);
    const res = await requestPasswordReset(values.email);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSent(true);
  }

  // Conferma identica che l'indirizzo esista o no: dire "questa email non è
  // registrata" trasformerebbe il modulo in uno strumento per scoprire chi ha
  // un account su N'arte.
  if (sent) {
    return (
      <div className="rounded-xl border border-azzurro/40 bg-azzurro/10 p-5">
        <MailCheck className="size-5 text-azzurro" />
        <p className="mt-3 font-display text-lg">Controlla la posta</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Se esiste un account con quell&rsquo;indirizzo, fra poco arriva un messaggio con il
          link per scegliere una nuova password. Vale un&rsquo;ora sola — e guarda anche
          nello spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="forgot-email">Email dell&rsquo;account</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          placeholder="nome@esempio.it"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1.5 text-xs text-corallo">Inserisci un indirizzo email valido.</p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-corallo/40 bg-corallo/10 px-3 py-2.5 text-sm text-corallo-dark"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Invio in corso…" : "Inviami il link"}
      </Button>
    </form>
  );
}
