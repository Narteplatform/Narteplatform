"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchema, type AuthInput } from "@/lib/validators/schemas";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type AccountKind = "user" | "organizer";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [kind, setKind] = useState<AccountKind>("user");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthInput>({ resolver: zodResolver(authSchema) });

  async function onSubmit(values: AuthInput) {
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName ?? null,
          // Letto dalla trigger handle_new_user per impostare il ruolo
          // del profilo. Solo "organizer" è auto-assegnabile dal client;
          // qualunque altro valore ricade su default 'user'.
          role: kind === "organizer" ? "organizer" : "user",
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      setError(error.message);
      return;
    }
    if (data.user && !data.session) {
      setInfo("Registrazione completata. Controlla la tua email per confermare l'account.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo di account</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setKind("user")}
            aria-pressed={kind === "user"}
            className={`rounded-xl border p-3 text-left transition ${
              kind === "user"
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground"
            }`}
          >
            <p className="text-sm font-medium">Utente</p>
            <p className="text-xs text-muted-foreground">Scopri eventi e artisti.</p>
          </button>
          <button
            type="button"
            onClick={() => setKind("organizer")}
            aria-pressed={kind === "organizer"}
            className={`rounded-xl border p-3 text-left transition ${
              kind === "organizer"
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground"
            }`}
          >
            <p className="text-sm font-medium">Organizzatore</p>
            <p className="text-xs text-muted-foreground">Richiedi e ingaggia artisti.</p>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Nome completo</Label>
        <Input {...register("fullName")} />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Password</Label>
        <Input type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-foreground">{info}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Registrazione..." : "Registrati"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Sei un artista? <a href="/candidatura-artista" className="underline">Candidati qui</a> per entrare nel roster.
      </p>
    </form>
  );
}
