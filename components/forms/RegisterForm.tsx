"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarCheck, MailCheck, Ticket } from "lucide-react";
import { authSchema, type AuthInput } from "@/lib/validators/schemas";
import { authErrorMessage } from "@/lib/auth/error-messages";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Checkbox } from "@/components/ui/Checkbox";
import { LEGAL_VERSION } from "@/lib/legal/content";

type AccountKind = "user" | "organizer";

/**
 * Le descrizioni dicono cosa si sblocca davvero, non cosa "sei": è la domanda
 * a cui la persona sta rispondendo mentre sceglie.
 *
 * Nota vera e utile da sapere: chi si iscrive come utente e poi manda la prima
 * richiesta di booking viene promosso a organizzatore in automatico
 * (`promote_user_to_organizer` in app/api/booking-request). Quindi la scelta
 * non è una porta che si chiude, ed è giusto dirlo invece di farla pesare.
 */
const KINDS: {
  key: AccountKind;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "user",
    label: "Utente",
    hint: "Sblocchi i profili e salvi i preferiti",
    icon: <Ticket className="size-4" />,
  },
  {
    key: "organizer",
    label: "Organizzatore",
    hint: "In più: richieste, chat e calendario",
    icon: <CalendarCheck className="size-4" />,
  },
];

export function RegisterForm({ next }: { next?: string | null }) {
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
    // La destinazione sopravvive al giro di conferma via email: senza, chi si
    // iscrive da un profilo bloccato torna in home e deve ricercarlo.
    const suffix = next ? `?next=${encodeURIComponent(next)}` : "";
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
          // Letti dalla trigger `record_signup_consents` (0049) che scrive le
          // righe in `user_consents`. Passarli qui invece di fare una seconda
          // chiamata dal client è deliberato: una chiamata separata potrebbe
          // fallire, e resterebbe un account creato senza traccia del consenso.
          accepted_terms: values.acceptedTerms === true,
          accepted_marketing: values.acceptedMarketing === true,
          legal_version: LEGAL_VERSION,
        },
        emailRedirectTo: `${window.location.origin}/login${suffix}`,
      },
    });
    if (error) {
      setError(authErrorMessage(error.message));
      return;
    }
    if (data.user && !data.session) {
      setInfo(
        "Ci siamo quasi: ti abbiamo mandato un'email di conferma. Aprila per attivare l'account — controlla anche nello spam.",
      );
      return;
    }
    router.push(next ?? "/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* TIPO DI ACCOUNT. `radiogroup` e non due bottoni sciolti: sono
          alternative esclusive, e senza il ruolo uno screen reader le annuncia
          come azioni indipendenti senza dire quale è attiva. */}
      <div>
        <Label id="kind-label">Come vuoi usare N&rsquo;arte?</Label>
        <div role="radiogroup" aria-labelledby="kind-label" className="grid grid-cols-2 gap-2">
          {KINDS.map((k) => {
            const selected = kind === k.key;
            return (
              <button
                key={k.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setKind(k.key)}
                className={`rounded-xl border-[1.5px] p-3 text-left transition-colors ${
                  selected
                    ? "border-azzurro bg-azzurro/10"
                    : "border-border bg-surface hover:border-foreground/40"
                }`}
              >
                <span
                  className={`inline-flex size-8 items-center justify-center rounded-lg ${
                    selected ? "bg-azzurro text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {k.icon}
                </span>
                <span className="mt-2 block text-sm font-semibold">{k.label}</span>
                <span className="block text-xs text-muted-foreground">{k.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Non è una scelta definitiva: alla prima richiesta di booking un account utente
          diventa da organizzatore in automatico.
        </p>
      </div>

      <div>
        <Label htmlFor="reg-name">Nome completo</Label>
        <Input
          id="reg-name"
          autoComplete="name"
          placeholder="Mario Rossi"
          {...register("fullName")}
        />
      </div>

      <div>
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
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
        <Label htmlFor="reg-password">Password</Label>
        <PasswordInput
          id="reg-password"
          autoComplete="new-password"
          placeholder="Almeno 8 caratteri"
          aria-describedby="reg-password-hint"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <p className="mt-1.5 text-xs text-corallo">{errors.password.message}</p>
        ) : (
          <p id="reg-password-hint" className="mt-1.5 text-xs text-muted-foreground">
            Almeno 8 caratteri.
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

      {info && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-azzurro/40 bg-azzurro/10 px-3 py-2.5 text-sm text-foreground"
        >
          <MailCheck className="mt-0.5 size-4 shrink-0 text-azzurro" />
          <span>{info}</span>
        </p>
      )}

      {/* CONSENSI. Prima non c'era alcuna casella: si creava un account senza
          che nessuno avesse accettato nulla, e senza che ne restasse traccia. */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
        <Checkbox
          {...register("acceptedTerms")}
          error={errors.acceptedTerms?.message}
          label={
            <>
              Ho letto e accetto la{" "}
              <Link href="/privacy" target="_blank" className="underline underline-offset-2">
                informativa privacy
              </Link>{" "}
              e i{" "}
              <Link href="/termini" target="_blank" className="underline underline-offset-2">
                termini d&rsquo;uso
              </Link>
              .
            </>
          }
        />
        <Checkbox
          {...register("acceptedMarketing")}
          label="Voglio ricevere novità sugli eventi e sulle opportunità N'arte."
          hint="Facoltativo. Puoi disdire quando vuoi."
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creazione account…" : "Crea account"}
      </Button>

      {/* Detto prima e non dopo: chi non se lo aspetta chiude la scheda,
          non vede mai l'email e resta convinto di essersi iscritto. */}
      <p className="text-center text-xs text-muted-foreground">
        Dopo l&rsquo;invio ti arriva un&rsquo;email di conferma: serve ad attivare
        l&rsquo;account.
      </p>
    </form>
  );
}
