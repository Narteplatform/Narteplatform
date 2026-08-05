"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { passwordChangeSchema, type PasswordChangeInput } from "@/lib/validators/schemas";
import { authErrorMessage } from "@/lib/auth/error-messages";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";

type Phase = "checking" | "ready" | "invalid" | "done";

export function ResetPasswordForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput>({ resolver: zodResolver(passwordChangeSchema) });

  // Il link di recupero apre una sessione temporanea prima di arrivare qui.
  // Se non c'è, la pagina è stata aperta a mano o il link è scaduto: mostrarle
  // comunque i campi significherebbe far scrivere una password a vuoto.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setPhase(data.session ? "ready" : "invalid");
    });
    // `onAuthStateChange` copre il caso in cui la sessione si materializzi un
    // istante dopo il montaggio, mentre il client digerisce il frammento
    // dell'URL.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session && !cancelled) setPhase("ready");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(values: PasswordChangeInput) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setError(authErrorMessage(error.message));
      return;
    }
    setPhase("done");
    // Fuori dalla sessione di recupero: da qui si rientra con la password nuova.
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2500);
  }

  if (phase === "checking") {
    return <div className="h-32 animate-pulse rounded-xl bg-muted" />;
  }

  if (phase === "invalid") {
    return (
      <div className="rounded-xl border border-corallo/40 bg-corallo/10 p-5">
        <AlertCircle className="size-5 text-corallo" />
        <p className="mt-3 font-display text-lg">Link non valido o scaduto</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          I link di recupero valgono un&rsquo;ora e una volta sola. Richiedine uno nuovo e
          aprilo dallo stesso dispositivo.
        </p>
        <Button asChild size="md" className="mt-4">
          <Link href="/recupero-password">Richiedi un nuovo link</Link>
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-xl border border-azzurro/40 bg-azzurro/10 p-5">
        <CheckCircle2 className="size-5 text-azzurro" />
        <p className="mt-3 font-display text-lg">Password aggiornata</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ti stiamo portando alla pagina di accesso: entra con la password appena scelta.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="new-password">Nuova password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          autoFocus
          placeholder="Almeno 8 caratteri"
          aria-describedby="new-password-hint"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <p className="mt-1.5 text-xs text-corallo">{errors.password.message}</p>
        ) : (
          <p id="new-password-hint" className="mt-1.5 text-xs text-muted-foreground">
            Almeno 8 caratteri. Scegline una che non usi altrove.
          </p>
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
        {isSubmitting ? "Salvataggio…" : "Salva la nuova password"}
      </Button>
    </form>
  );
}
