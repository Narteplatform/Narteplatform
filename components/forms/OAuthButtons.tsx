"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Provider = "google";

const PROVIDERS: { key: Provider; label: string; icon: React.ReactNode }[] = [
  {
    key: "google",
    label: "Continua con Google",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.51 5.51 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.81Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.29v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
        />
      </svg>
    ),
  },
];

/**
 * Accesso con provider esterni. Oggi solo Google; per aggiungerne un altro
 * basta una voce in `PROVIDERS` (e abilitarlo in Supabase → Authentication →
 * Providers).
 *
 * `next` è la destinazione dopo l'accesso, `intent="organizer"` segnala che chi
 * entra dalla registrazione vuole un account organizzatore: il callback lo
 * traduce in una richiesta di accesso (che il team dovrà approvare). La
 * destinazione viene comunque ripulita lato server nel callback.
 */
export function OAuthButtons({
  next,
  intent,
}: {
  next?: string | null;
  intent?: "organizer";
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);

  async function accedi(provider: Provider) {
    setError(null);
    setBusy(provider);
    try {
      const supabase = createClient();
      const params = new URLSearchParams();
      if (next) params.set("next", next);
      if (intent === "organizer") params.set("ruolo", "organizer");
      const query = params.toString();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback${query ? `?${query}` : ""}`,
        },
      });
      if (error) {
        setError("Non riesco ad avviare l'accesso con Google. Riprova o usa email e password.");
        setBusy(null);
      }
      // Senza errore il browser sta già andando al provider: si resta in attesa.
    } catch {
      setError("Non riesco ad avviare l'accesso con Google. Riprova o usa email e password.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {PROVIDERS.map((p) => (
        <Button
          key={p.key}
          type="button"
          variant="outline"
          size="lg"
          className="w-full gap-3"
          disabled={busy !== null}
          onClick={() => accedi(p.key)}
        >
          {p.icon}
          {busy === p.key ? "Reindirizzamento…" : p.label}
        </Button>
      ))}
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-corallo/40 bg-corallo/10 px-3 py-2.5 text-sm text-corallo-dark"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Separatore «oppure» tra i provider e il modulo email/password. */
export function SeparatoreOppure() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground" role="separator">
      <span className="h-px flex-1 bg-border" />
      oppure
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
