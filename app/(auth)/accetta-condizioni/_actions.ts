"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import {
  acceptLegalDocuments,
  legalV2Attivo,
  registraConsensoConContesto,
} from "@/lib/legal/consents";
import { iscriviNewsletter } from "@/lib/brevo/contacts";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  registraProvaSuIubendaInBackground,
  TESTO_CASELLA,
} from "@/lib/legal/iubenda-consent";
import { LEGAL_COOKIE, LEGAL_COOKIE_MAX_AGE } from "@/lib/legal/gate";
import { LEGAL_CONSENT_VERSION, LEGAL_VERSION } from "@/lib/legal/content";

const schema = z.object({
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "Per proseguire devi accettare privacy e termini" }),
  }),
  acceptedAge: z.literal(true, {
    errorMap: () => ({ message: "Il servizio è riservato ai maggiorenni" }),
  }),
  acceptedMarketing: z.boolean().optional().default(false),
  /**
   * Solo con `NEXT_PUBLIC_LEGAL_V2_PUBBLICATO=1` e solo per artisti e
   * organizzatori. Il ruolo NON arriva dal client: lo legge il server dal
   * profilo; questi campi sono le sole risposte della persona.
   */
  acceptedRoleTerms: z.boolean().optional().default(false),
  tipoArtista: z.enum(["privato", "professionista"]).optional(),
  acceptedClauses: z.boolean().optional().default(false),
});

export type AcceptLegalInput = z.input<typeof schema>;

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
  // per `auth.uid()` e senza sessione solleva. I dati dell'utente servono poi
  // per la copia della prova presso iubenda.
  const utente = await requireUser();

  // GATE PER RUOLO (v2). Spento: comportamento identico a prima.
  const ruolo = utente.profile?.role;
  const v2 = legalV2Attivo();
  const documentoRuolo =
    v2 && ruolo === "artist" ? "artisti" : v2 && ruolo === "organizer" ? "organizzatori" : null;
  const dichiarazioni: string[] = [];

  if (documentoRuolo) {
    if (!parsed.data.acceptedRoleTerms) {
      return {
        ok: false as const,
        error:
          documentoRuolo === "artisti"
            ? "Per proseguire devi accettare le Condizioni per gli artisti"
            : "Per proseguire devi accettare le Condizioni per gli organizzatori",
      };
    }
    if (documentoRuolo === "artisti") {
      if (!parsed.data.tipoArtista) {
        return { ok: false as const, error: "Indica se operi come privato o con partita IVA" };
      }
      if (parsed.data.tipoArtista === "professionista" && !parsed.data.acceptedClauses) {
        return {
          ok: false as const,
          error: "Per proseguire devi approvare specificamente le clausole indicate",
        };
      }
    }

    // PRIMA i documenti del ruolo, POI `accept_legal_documents`: quest'ultima
    // aggiorna la cache che il middleware legge, e deve restare indietro finché
    // il registro non è completo. Se una scrittura fallisce ci si ferma qui e
    // la persona riprova; le righe già scritte sono storia, non un danno.
    const supabase = await createClient();
    const scrivi = async (
      kind: "condizioni_artisti" | "condizioni_organizzatori" | "clausole_specifiche",
      ref?: string
    ) => {
      const errore = await registraConsensoConContesto(supabase, {
        kind,
        version: LEGAL_VERSION,
        ref,
      });
      if (errore) logger.error("accetta-condizioni", `record_consent(${kind}) fallita: ${errore}`);
      return errore === null;
    };
    const generico = "Non siamo riusciti a registrare la tua scelta. Riprova fra un momento.";

    if (documentoRuolo === "artisti") {
      const tipo = parsed.data.tipoArtista;
      if (!(await scrivi("condizioni_artisti", `tipo:${tipo}`))) {
        return { ok: false as const, error: generico };
      }
      dichiarazioni.push(TESTO_CASELLA.condizioniArtisti);
      if (tipo === "professionista") {
        if (!(await scrivi("clausole_specifiche", "condizioni_artisti"))) {
          return { ok: false as const, error: generico };
        }
        dichiarazioni.push(TESTO_CASELLA.clausoleSpecifiche);
      }
    } else {
      if (!(await scrivi("condizioni_organizzatori"))) {
        return { ok: false as const, error: generico };
      }
      dichiarazioni.push(TESTO_CASELLA.condizioniOrganizzatori);
    }
  }

  // Casella del marketing non spuntata = «non si è espresso», non un rifiuto:
  // prima ogni riaccettazione scriveva una riga «marketing = false», che fra
  // l'altro sovrascriveva nel registro un consenso dato in precedenza.
  const esito = await acceptLegalDocuments(parsed.data.acceptedMarketing ? true : undefined);
  if (!esito.ok) return esito;

  // Newsletter: copia sulla lista Brevo, solo se la casella è spuntata.
  // Non bloccante e dopo la riga di registro, che è la prova.
  if (parsed.data.acceptedMarketing && utente.email) {
    await iscriviNewsletter(utente.email, utente.profile?.full_name ?? undefined);
  }

  // Qui l'interessato ha un account, quindi la prova presso iubenda porta anche
  // l'identificativo: è il caso in cui la copia esterna serve di più, perché è
  // un'accettazione contrattuale e non una semplice presa visione.
  registraProvaSuIubendaInBackground({
    soggettoId: utente.id,
    email: utente.email ?? undefined,
    nomeCompleto: utente.profile?.full_name ?? undefined,
    documenti: ["privacy_policy", "terms"],
    preferenze: {
      privacy_policy: true,
      terms: true,
      maggiore_eta: true,
      marketing: parsed.data.acceptedMarketing,
      ...(documentoRuolo === "artisti"
        ? {
            condizioni_artisti: true,
            clausole_specifiche: parsed.data.tipoArtista === "professionista",
          }
        : {}),
      ...(documentoRuolo === "organizzatori" ? { condizioni_organizzatori: true } : {}),
    },
    modulo: "Schermata di accettazione (utenti preesistenti)",
    testoCasella: [`${TESTO_CASELLA.termini} — ${TESTO_CASELLA.eta}`, ...dichiarazioni].join(" — "),
  });

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
