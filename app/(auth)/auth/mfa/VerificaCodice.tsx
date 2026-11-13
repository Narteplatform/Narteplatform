"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/**
 * Inserimento del codice a 6 cifre dell'app di autenticazione per un fattore
 * TOTP già attivo. Se il codice è giusto la sessione passa al livello aal2 e
 * si chiama `onVerificato`. Usato da /auth/mfa e da /account/sicurezza.
 */
export function VerificaCodice({
  factorId,
  onVerificato,
  etichettaPulsante = "Verifica",
}: {
  factorId: string;
  onVerificato: () => void;
  etichettaPulsante?: string;
}) {
  const [codice, setCodice] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    const pulito = codice.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(pulito)) {
      setErrore("Il codice è di 6 cifre.");
      return;
    }
    setInvio(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: pulito });
      if (error) {
        setErrore("Codice non valido o scaduto. Controlla l'ora del telefono e riprova.");
        setInvio(false);
        return;
      }
      onVerificato();
    } catch {
      setErrore("Verifica non riuscita. Riprova.");
      setInvio(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor={`mfa-codice-${factorId}`}>Codice dell&rsquo;app di autenticazione</Label>
        <Input
          id={`mfa-codice-${factorId}`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123456"
          value={codice}
          onChange={(e) => setCodice(e.target.value)}
          autoFocus
        />
      </div>
      {errore && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-corallo/40 bg-corallo/10 px-3 py-2.5 text-sm text-corallo-dark"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errore}</span>
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={invio}>
        {invio ? "Verifica in corso…" : etichettaPulsante}
      </Button>
    </form>
  );
}
