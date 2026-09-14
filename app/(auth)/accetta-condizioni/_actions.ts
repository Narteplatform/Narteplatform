"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { acceptLegalDocuments } from "@/lib/legal/consents";
import { LEGAL_COOKIE, LEGAL_COOKIE_MAX_AGE } from "@/lib/legal/gate";
import { LEGAL_CONSENT_VERSION } from "@/lib/legal/content";

const schema = z.object({
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "Per proseguire devi accettare privacy e termini" }),
  }),
  acceptedAge: z.literal(true, {
    errorMap: () => ({ message: "Il servizio è riservato ai maggiorenni" }),
  }),
  acceptedMarketing: z.boolean().optional().default(false),
});

export type AcceptLegalInput = z.infer<typeof schema>;

/**
 * Registra l'accettazione dei documenti per chi è già dentro la piattaforma.
 *
 * Non fa `redirect()`: il ritorno alla pagina di partenza lo decide il client,
 * che conosce il `next`. Una `redirect()` qui dentro solleverebbe un'eccezione
 * di controllo che va lasciata risalire, e in mezzo a una gestione d'errore è
 * facile catturarla per sbaglio e trasformare una navigazione riuscita in un
 * messaggio di errore.
 */
export async function acceptCurrentLegal(input: AcceptLegalInput) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    };
  }

  // Non serve il ruolo, serve che ci sia una sessione: la funzione SQL scrive
  // per `auth.uid()` e senza sessione solleva.
  await requireUser();

  const esito = await acceptLegalDocuments(parsed.data.acceptedMarketing);
  if (!esito.ok) return esito;

  // Il cookie evita che il middleware interroghi il database a ogni
  // navigazione successiva. Viene scritto qui, nella stessa risposta, così la
  // prima pagina dopo l'accettazione lo porta già con sé e il gate non si
  // riapre per un istante.
  const store = await cookies();
  store.set(LEGAL_COOKIE, LEGAL_CONSENT_VERSION, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LEGAL_COOKIE_MAX_AGE,
  });

  return { ok: true as const };
}
