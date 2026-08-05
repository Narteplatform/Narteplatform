"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { authSchema, type AuthInput } from "@/lib/validators/schemas";
import { authErrorMessage } from "@/lib/auth/error-messages";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthInput>({ resolver: zodResolver(authSchema) });

  async function onSubmit(values: AuthInput) {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setError(authErrorMessage(error.message));
      return;
    }
    // Instrada server-side in base al ruolo del profilo (admin → /admin,
    // artist → /dashboard, user → next o /).
    const dest = `/post-login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    router.push(dest);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nome@esempio.it"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1.5 text-xs text-corallo">Inserisci un indirizzo email valido.</p>
        )}
      </div>

      <div>
        <Label htmlFor="login-password">Password</Label>
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

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Accesso in corso…" : "Accedi"}
      </Button>
    </form>
  );
}
