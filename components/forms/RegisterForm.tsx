"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { AlertCircle, CalendarCheck, MailCheck, Mic2 } from "lucide-react";
import { authSchema, type AuthInput } from "@/lib/validators/schemas";
import { authErrorMessage } from "@/lib/auth/error-messages";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { TermsConsent } from "@/components/forms/PrivacyConsent";
import { LEGAL_VERSION } from "@/lib/legal/content";
import { OAuthButtons, SeparatoreOppure } from "@/components/forms/OAuthButtons";
import { datiOrganizzatoreSchema } from "@/lib/validators/organizzatore";
import { PERCORSO_IN_ATTESA } from "@/lib/organizers/stato";
import {
  notificaRegistrazioneOrganizzatore,
  registraProvaRegistrazione,
} from "@/app/(auth)/register/_actions";

type AccountKind = "artist" | "organizer";

/**
 * Le descrizioni dicono cosa succede davvero, non cosa "sei". Il profilo
 * artista NON si crea da qui (passa da una candidatura valutata dal team) e
 * l'account organizzatore nasce "in attesa" finché il team non lo approva:
 * dirlo prima evita di far credere che bastino email e password.
 */
const KINDS: {
  key: AccountKind;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "artist",
    label: "Sono un artista",
    hint: "Candidati per entrare nel roster: il team valuta il tuo profilo",
    icon: <Mic2 className="size-4" />,
  },
  {
    key: "organizer",
    label: "Ho bisogno di un artista",
    hint: "Per locali, eventi e privati: richieste, chat e calendario, dopo l'approvazione del team",
    icon: <CalendarCheck className="size-4" />,
  },
];

export function RegisterForm({ next }: { next?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Nessuna preselezione: è una scelta che cambia il percorso, va fatta di proposito.
  const [kind, setKind] = useState<AccountKind | null>(null);
  const [organizerName, setOrganizerName] = useState("");
  const [city, setCity] = useState("");
  const [orgErrors, setOrgErrors] = useState<{ organizerName?: string; city?: string }>({});
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthInput>({ resolver: zodResolver(authSchema) });

  async function onSubmit(values: AuthInput) {
    setError(null);
    setInfo(null);
    if (kind !== "organizer") return;
    // Locale e città: obbligatori, validati qui con lo stesso schema usato in /benvenuto.
    const org = datiOrganizzatoreSchema.safeParse({ organizerName, city });
    if (!org.success) {
      const fe: { organizerName?: string; city?: string } = {};
      for (const issue of org.error.issues) {
        const k = issue.path[0];
        if ((k === "organizerName" || k === "city") && !fe[k]) fe[k] = issue.message;
      }
      setOrgErrors(fe);
      return;
    }
    setOrgErrors({});
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
          // Letti dalla trigger handle_new_user: ruolo del profilo e riga
          // `organizers` (in attesa di approvazione). Solo "organizer" è
          // auto-assegnabile dal client; qualunque altro valore ricade su 'user'.
          role: "organizer",
          organizer_name: org.data.organizerName,
          organizer_city: org.data.city,
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
    // Copia della prova presso iubenda. Con `identities` vuoto Supabase ha
    // risposto «ok» per un'email già registrata: nessun account nuovo, nessuna
    // prova. Non si attende l'esito e gli errori si ignorano.
    if (data.user && (data.user.identities?.length ?? 0) > 0) {
      void registraProvaRegistrazione(data.user.id).catch(() => {});
      void notificaRegistrazioneOrganizzatore(data.user.id).catch(() => {});
    }
    if (data.user && !data.session) {
      setInfo(
        "Ci siamo quasi: ti abbiamo mandato un'email di conferma. Aprila per attivare l'account — controlla anche nello spam. Dopo la conferma il team verificherà il tuo account e ti scriveremo appena sarà approvato.",
      );
      return;
    }
    router.push(PERCORSO_IN_ATTESA);
    router.refresh();
  }

  const selettore = (
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
    </div>
  );

  // Artista: il profilo non si crea da qui, passa da una candidatura.
  if (kind !== "organizer") {
    return (
      <div className="space-y-5">
        {selettore}
        {kind === "artist" && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <p>
              Gli artisti non si registrano da qui: invii una candidatura e il team valuta il tuo profilo
              prima di pubblicarlo. Se approvata, ricevi l&rsquo;invito per accedere.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/candidatura-artista">Vai alla candidatura</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {selettore}

      <OAuthButtons next={next} intent="organizer" />
      <SeparatoreOppure />

      <div>
        <Label htmlFor="reg-org">Locale o realtà che rappresenti</Label>
        <Input
          id="reg-org"
          maxLength={120}
          placeholder="Es. Duel Club"
          aria-invalid={!!orgErrors.organizerName}
          value={organizerName}
          onChange={(e) => setOrganizerName(e.target.value)}
        />
        {orgErrors.organizerName && (
          <p className="mt-1.5 text-xs text-corallo">{orgErrors.organizerName}</p>
        )}
      </div>

      <div>
        <Label htmlFor="reg-city">Città</Label>
        <Input
          id="reg-city"
          maxLength={80}
          autoComplete="address-level2"
          placeholder="Es. Napoli"
          aria-invalid={!!orgErrors.city}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        {orgErrors.city && <p className="mt-1.5 text-xs text-corallo">{orgErrors.city}</p>}
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
        <TermsConsent
          register={register("acceptedTerms")}
          error={errors.acceptedTerms?.message}
        />
        <Checkbox
          {...register("acceptedAge")}
          error={errors.acceptedAge?.message}
          label="Dichiaro di avere almeno 18 anni."
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
        l&rsquo;account. Poi il team verifica i dati e ti scrive appena sei approvato.
      </p>
    </form>
  );
}
