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
 * Nota: qui NON si registra nulla a database. Per chi non ha un account non
 * esiste un `user_id` a cui legare la riga, e la prova del consenso resta il
 * fatto che il modulo non parte senza la spunta. Il registro `user_consents`
 * (0049) copre chi si registra, dove l'identità esiste.
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
