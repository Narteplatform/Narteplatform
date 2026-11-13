"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, MailCheck } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { cambiaEmail } from "@/app/account/_actions";

type Valori = { nuovaEmail: string; passwordAttuale: string };

/**
 * Cambio dell'indirizzo email. Chi ha una password la ridigita; chi entra solo
 * con Google conferma rifacendo l'accesso con Google (vedi `cambiaEmail`).
 */
export function EmailForm({
  emailAttuale,
  conPassword,
  emailInAttesa,
}: {
  emailAttuale: string;
  conPassword: boolean;
  emailInAttesa: string | null;
}) {
  const [esito, setEsito] = useState<{ tipo: "ok" | "err"; testo: string } | null>(null);
  const [riaccedi, setRiaccedi] = useState(false);
  const [reindirizzo, setReindirizzo] = useState(false);
  const form = useForm<Valori>({ defaultValues: { nuovaEmail: "", passwordAttuale: "" } });

  async function onSubmit(v: Valori) {
    setEsito(null);
    setRiaccedi(false);
    const res = await cambiaEmail({
      nuovaEmail: v.nuovaEmail,
      passwordAttuale: conPassword ? v.passwordAttuale : undefined,
    }).catch(() => null);
    if (!res) {
      setEsito({ tipo: "err", testo: "Richiesta non riuscita. Riprova." });
      return;
    }
    if (res.ok) {
      form.reset({ nuovaEmail: "", passwordAttuale: "" });
      setEsito({
        tipo: "ok",
        testo: `Ti abbiamo scritto a entrambi gli indirizzi (${emailAttuale} e ${v.nuovaEmail.trim()}). Il cambio diventa effettivo quando avrai aperto i link di conferma.`,
      });
      return;
    }
    if ("riaccedi" in res && res.riaccedi) setRiaccedi(true);
    setEsito({ tipo: "err", testo: res.error });
  }

  async function confermaConGoogle() {
    setReindirizzo(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account")}` },
      });
      if (error) {
        setReindirizzo(false);
        setEsito({ tipo: "err", testo: "Non riesco ad avviare l'accesso con Google. Riprova." });
      }
    } catch {
      setReindirizzo(false);
      setEsito({ tipo: "err", testo: "Non riesco ad avviare l'accesso con Google. Riprova." });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">
        Indirizzo attuale: <span className="font-mono text-foreground">{emailAttuale}</span>
      </p>
      {emailInAttesa && (
        <p className="rounded-lg border border-azzurro/40 bg-azzurro/10 px-3 py-2.5 text-sm">
          Cambio in corso verso <span className="font-mono">{emailInAttesa}</span>: apri i link di
          conferma che ti abbiamo mandato.
        </p>
      )}
      <div>
        <Label htmlFor="acc-nuova-email">Nuovo indirizzo email</Label>
        <Input
          id="acc-nuova-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          {...form.register("nuovaEmail", { required: true })}
        />
      </div>
      {conPassword && (
        <div>
          <Label htmlFor="acc-email-pw">Password attuale</Label>
          <PasswordInput
            id="acc-email-pw"
            autoComplete="current-password"
            {...form.register("passwordAttuale", { required: true })}
          />
        </div>
      )}
      {!conPassword && (
        <p className="text-xs text-muted-foreground">
          Accedi con Google: per sicurezza ti chiederemo di confermare la tua identità con Google
          se l&rsquo;ultimo accesso non è recente.
        </p>
      )}

      {esito && (
        <p
          role={esito.tipo === "err" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
            esito.tipo === "err"
              ? "border-corallo/40 bg-corallo/10 text-corallo-dark"
              : "border-azzurro/40 bg-azzurro/10 text-foreground"
          }`}
        >
          {esito.tipo === "err" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <MailCheck className="mt-0.5 size-4 shrink-0 text-azzurro" />
          )}
          <span>{esito.testo}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Invio…" : "Cambia email"}
        </Button>
        {riaccedi && (
          <Button type="button" variant="outline" onClick={confermaConGoogle} disabled={reindirizzo}>
            {reindirizzo ? "Reindirizzamento…" : "Conferma con Google"}
          </Button>
        )}
      </div>
    </form>
  );
}
