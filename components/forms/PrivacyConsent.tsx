"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/Checkbox";

/**
 * La casella di presa visione dell'informativa privacy, per i moduli pubblici
 * che raccolgono dati di persone non registrate: contatti, candidatura artista,
 * interesse su un format.
 *
 * È un componente e non tre copie del medesimo JSX perché il testo di un
 * consenso è la parte che, se cambia, deve cambiare ovunque nello stesso
 * istante — comprese le versioni. Tre varianti leggermente diverse sparse nei
 * moduli sono il modo più semplice di ritrovarsi con consensi non allineati a
 * quello che l'informativa dice davvero.
 *
 * DOVE FINISCE LA PROVA. Per chi non ha un account non esiste un `user_id` a
 * cui legare una riga di `user_consents`: la versione dell'informativa e
 * l'istante della spunta vengono scritti dalla server action sulla stessa riga
 * del dato raccolto — le colonne `consent_version` e `consent_at` aggiunte dalla
 * 0059 a `contact_messages`, `leads`, `artist_applications` e `consultations`.
 * Così la prova vive e muore con il dato che autorizza. Chi invece ha un
 * account finisce nel registro nominativo `user_consents` (0049), dove il
 * consenso è consultabile e revocabile.
 *
 * Il componente si limita a disegnare la casella: chi lo usa deve anche
 * validare il campo con `z.literal(true)` nello schema, altrimenti la spunta è
 * decorativa e il modulo parte comunque.
 */
export function PrivacyConsent({
  register,
  error,
  className,
}: {
  register: Record<string, unknown>;
  error?: string;
  className?: string;
}) {
  return (
    <Checkbox
      {...register}
      error={error}
      className={className}
      label={
        <>
          Ho letto l&rsquo;
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            informativa privacy
          </Link>{" "}
          e acconsento al trattamento dei miei dati per essere ricontattato.
        </>
      }
    />
  );
}

/**
 * La casella di accettazione di termini e informativa, per i punti in cui non
 * si sta solo lasciando un recapito ma si entra nella piattaforma: la
 * registrazione, e la richiesta di booking che crea un account per conto di chi
 * la invia.
 *
 * Separata da `PrivacyConsent` perché dice una cosa diversa — lì si acconsente
 * a essere ricontattati, qui si accetta un contratto — e perché ciò che viene
 * registrato è diverso: due righe in `user_consents`, `privacy` e `termini`.
 *
 * Il testo sta qui e non nei singoli moduli per la stessa ragione dell'altro
 * componente: se un giorno cambia, deve cambiare ovunque nello stesso istante.
 */
export function TermsConsent({
  register,
  error,
  className,
}: {
  register: Record<string, unknown>;
  error?: string;
  className?: string;
}) {
  return (
    <Checkbox
      {...register}
      error={error}
      className={className}
      label={
        <>
          Ho letto e accetto la{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            informativa privacy
          </Link>{" "}
          e i{" "}
          <Link
            href="/termini"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            termini d&rsquo;uso
          </Link>
          .
        </>
      }
    />
  );
}
