"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { datiOrganizzatoreSchema } from "@/lib/validators/organizzatore";
import { PERCORSO_IN_ATTESA, richiediAccessoOrganizzatore } from "@/lib/organizers/approvazione";
import { hasAcceptedCurrentLegal } from "@/lib/legal/consents";

export type BenvenutoState = { error?: string; fieldErrors?: { organizerName?: string; city?: string } };

/**
 * Chi è entrato (tipicamente con Google) senza aver scelto un ruolo dichiara di
 * essere un organizzatore. La richiesta passa dal team: l'utente va alla
 * pagina di attesa. Il ruolo non lo decide il client: lo imposta
 * `richiediAccessoOrganizzatore`, con la service role e solo da `user`.
 */
export async function richiediOrganizzatoreAction(
  _prev: BenvenutoState,
  formData: FormData
): Promise<BenvenutoState> {
  const user = await requireUser();

  const parsed = datiOrganizzatoreSchema.safeParse({
    organizerName: formData.get("organizerName"),
    city: formData.get("city"),
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<BenvenutoState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if ((k === "organizerName" || k === "city") && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  // La richiesta (e l'avviso al team) parte solo DOPO i consensi. Il gate del
  // middleware li chiede già prima di mostrare /benvenuto, ma le Server Action
  // ne sono esenti: qui lo si ricontrolla. Un errore di lettura non blocca
  // (stessa scelta del gate: fallire aperti).
  let consensiDati = true;
  try {
    consensiDati = await hasAcceptedCurrentLegal(user.id);
  } catch {
    consensiDati = true;
  }
  if (!consensiDati) {
    redirect(`/accetta-condizioni?next=${encodeURIComponent("/benvenuto?ruolo=organizer")}`);
  }

  const esito = await richiediAccessoOrganizzatore({
    userId: user.id,
    nome: parsed.data.organizerName,
    citta: parsed.data.city,
  });
  if (!esito.ok) return { error: esito.error };

  redirect(esito.stato === "approved" ? "/organizzatore" : PERCORSO_IN_ATTESA);
}
