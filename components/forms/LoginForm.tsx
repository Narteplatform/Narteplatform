"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, MailCheck } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validators/schemas";
import { authErrorMessage } from "@/lib/auth/error-messages";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { OAuthButtons, SeparatoreOppure } from "@/components/forms/OAuthButtons";
import { percorsoSicuro } from "@/lib/auth/percorso";
import { reinviaEmailConferma } from "@/app/(auth)/login/_actions";

/** Pausa fra due invii dell'email di conferma, lato client (il server ha i suoi freni). */
const ATTESA_REINVIO_MS = 60_000;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Solo percorsi interni: lo ricontrolla comunque /post-login.
  const next = percorsoSicuro(searchParams.get("next"));
  const [error, setError] = useState<string | null>(null);
  // Email non confermata: si offre un nuovo invio del link.
  const [nonConfermata, setNonConfermata] = useState<string | null>(null);
  const [reinvio, setReinvio] = useState<{ stato: "idle" | "invio" | "inviata"; messaggio?: string }>({
    stato: "idle",
  });
  const [ultimoReinvio, setUltimoReinvio] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setError(null);
    setNonConfermata(null);
    setReinvio({ stato: "idle" });
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setError(authErrorMessage(error.message));
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setNonConfermata(values.email);
      }
      return;
    }
    // Instrada server-side in base al ruolo del profilo (admin → /admin,
    // artist → /dashboard, user → next o /).
    const dest = `/post-login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    router.push(dest);
    router.refresh();
  }

  async function reinvia() {
    if (!nonConfermata) return;
    if (Date.now() - ultimoReinvio < ATTESA_REINVIO_MS) {
      setReinvio({ stato: "inviata", messaggio: "Ti abbiamo appena scritto: attendi un minuto prima di riprovare." });
      return;
    }
    setReinvio({ stato: "invio" });
    const res = await reinviaEmailConferma(nonConfermata, next).catch(() => null);
    setUltimoReinvio(Date.now());
    setReinvio(
      res && !res.ok
        ? { stato: "idle", messaggio: res.error }
        : {
            stato: "inviata",
            messaggio:
              "Se l'indirizzo è registrato e non ancora confermato, ti arriva un nuovo link fra qualche minuto. Controlla anche nello spam.",
          }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <OAuthButtons next={next} />
      <SeparatoreOppure />

      <div>
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
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

      <div>
        {/* Il recupero sta accanto all'etichetta e non in fondo al modulo: si
            cerca proprio mentre si guarda il campo che non si ricorda. */}
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="login-password">Password</Label>
          <Link
            href="/recupero-password"
            className="mb-1.5 text-xs font-semibold text-azzurro underline-offset-2 hover:underline"
          >
            Password dimenticata?
          </Link>
        </div>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1.5 text-xs text-corallo">{errors.password.message}</p>
        )}
      </div>

      {/* role="alert": l'esito di un tentativo di accesso deve essere
          annunciato, non solo mostrato. */}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-corallo/40 bg-corallo/10 px-3 py-2.5 text-sm text-corallo-dark"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {nonConfermata && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full gap-2"
            disabled={reinvio.stato === "invio"}
            onClick={reinvia}
          >
            <MailCheck className="size-4" />
            {reinvio.stato === "invio" ? "Invio in corso…" : "Invia di nuovo l'email di conferma"}
          </Button>
          {reinvio.messaggio && (
            <p role="status" className="text-xs text-muted-foreground">
              {reinvio.messaggio}
            </p>
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Accesso in corso…" : "Accedi"}
      </Button>
    </form>
  );
}
