"use server";

import { redirect } from "next/navigation";
import { confermaCancellazione } from "@/lib/legal/cancellazione";

/**
 * Conferma della cancellazione: parte solo da un invio esplicito del modulo.
 *
 * È il punto del passaggio in due tempi: aprire il collegamento dell'email non
 * produce effetti, lo produce soltanto il pulsante. Così un programma che apre
 * il collegamento per controllarlo non può disattivare l'account.
 */
export async function confermaCancellazioneAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const esito = token
    ? await confermaCancellazione(token)
    : ({ ok: false, motivo: "non-trovata" } as const);
  const q = new URLSearchParams({ token, esito: esito.ok ? "confermata" : esito.motivo });
  redirect(`/account/cancellazione?${q.toString()}`);
}
