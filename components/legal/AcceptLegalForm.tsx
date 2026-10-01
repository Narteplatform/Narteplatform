"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { TermsConsent } from "@/components/forms/PrivacyConsent";
import { acceptCurrentLegal } from "@/app/(auth)/accetta-condizioni/_actions";

/**
 * Le caselle della schermata di accettazione.
 *
 * Sono deliberatamente le STESSE del modulo di registrazione, con lo stesso
 * testo: chi arriva qui sta dando il consenso che a suo tempo non gli è mai
 * stato chiesto, non un consenso di altra natura. Il testo dei termini vive in
 * `TermsConsent` proprio perché non possa divergere fra i due punti.
 */
export function AcceptLegalForm({
  next,
  ruolo = null,
}: {
  next: string;
  /**
   * Passato dalla pagina SOLO con `NEXT_PUBLIC_LEGAL_V2_PUBBLICATO=1`. Con
   * `null` la schermata è quella di sempre. Il server rilegge comunque il ruolo
   * dal profilo: questo valore decide solo quali caselle disegnare.
   */
  ruolo?: "artist" | "organizer" | null;
}) {
  const [acceptedRoleTerms, setAcceptedRoleTerms] = useState(false);
  const [tipoArtista, setTipoArtista] = useState<"privato" | "professionista" | "">("");
  const [acceptedClauses, setAcceptedClauses] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptedTerms) {
      setError("Per proseguire devi accettare privacy e termini.");
      return;
    }
    if (!acceptedAge) {
      setError("Il servizio è riservato ai maggiorenni.");
      return;
    }

    if (ruolo && !acceptedRoleTerms) {
      setError(
        ruolo === "artist"
          ? "Per proseguire devi accettare le Condizioni per gli artisti."
          : "Per proseguire devi accettare le Condizioni per gli organizzatori."
      );
      return;
    }
    if (ruolo === "artist" && !tipoArtista) {
      setError("Indica se operi come privato o con partita IVA.");
      return;
    }
    if (ruolo === "artist" && tipoArtista === "professionista" && !acceptedClauses) {
      setError("Per proseguire devi approvare specificamente le clausole indicate.");
      return;
    }

    start(async () => {
      const res = await acceptCurrentLegal({
        acceptedTerms: true,
        acceptedAge: true,
        acceptedMarketing,
        ...(ruolo
          ? {
              acceptedRoleTerms,
              ...(ruolo === "artist" && tipoArtista ? { tipoArtista } : {}),
              acceptedClauses: ruolo === "artist" && tipoArtista === "professionista" && acceptedClauses,
            }
          : {}),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Navigazione completa e non `router.push`: il cookie appena scritto
      // deve accompagnare la richiesta successiva, e la cache del router
      // potrebbe servire una versione della pagina prodotta prima
      // dell'accettazione.
      window.location.href = next;
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
        <TermsConsent register={{ checked: acceptedTerms, onChange: onCheck(setAcceptedTerms) }} />
        {ruolo === "artist" && (
          <>
            <Checkbox
              checked={acceptedRoleTerms}
              onChange={onCheck(setAcceptedRoleTerms)}
              label={
                <>
                  Ho letto e accetto le{" "}
                  <Link
                    href="/condizioni-artisti"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Condizioni per gli artisti
                  </Link>
                  .
                </>
              }
            />
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Come operi?</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipoArtista"
                  checked={tipoArtista === "privato"}
                  onChange={() => setTipoArtista("privato")}
                />
                Come privato
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipoArtista"
                  checked={tipoArtista === "professionista"}
                  onChange={() => setTipoArtista("professionista")}
                />
                Con partita IVA
              </label>
            </fieldset>
            {tipoArtista === "professionista" && (
              <Checkbox
                checked={acceptedClauses}
                onChange={onCheck(setAcceptedClauses)}
                label="Ai sensi degli artt. 1341 e 1342 c.c. approvo specificamente le clausole indicate in fondo ai Termini d'uso e alle Condizioni per gli artisti."
              />
            )}
          </>
        )}
        {ruolo === "organizer" && (
          <Checkbox
            checked={acceptedRoleTerms}
            onChange={onCheck(setAcceptedRoleTerms)}
            label={
              <>
                Ho letto e accetto le{" "}
                <Link
                  href="/condizioni-organizzatori"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Condizioni per gli organizzatori
                </Link>
                .
              </>
            }
          />
        )}
        <Checkbox
          checked={acceptedAge}
          onChange={onCheck(setAcceptedAge)}
          label="Dichiaro di avere almeno 18 anni."
        />
        <Checkbox
          checked={acceptedMarketing}
          onChange={onCheck(setAcceptedMarketing)}
          label="Voglio ricevere novità sugli eventi e sulle opportunità N'arte."
          hint="Facoltativo. Puoi disdire quando vuoi."
        />
      </div>

      {error && (
        <p className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Salvataggio…" : "Accetto e proseguo"}
      </Button>
    </form>
  );
}

function onCheck(set: (v: boolean) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.checked);
}
