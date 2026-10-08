// Ritorno dall'accesso con provider esterno (Google). Scambia il `code` con la
// sessione, poi instrada: richiesta di accesso organizzatore se chi si è
// iscritto lo ha chiesto, altrimenti /post-login che decide per ruolo.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { PERCORSO_IN_ATTESA, richiediAccessoOrganizzatore } from "@/lib/organizers/approvazione";

export const dynamic = "force-dynamic";

/** Solo percorsi interni: `//host` e `/\host` sono indirizzi assoluti travestiti. */
function percorsoSicuro(valore: string | null): string | null {
  if (!valore) return null;
  if (!valore.startsWith("/") || valore.startsWith("//") || valore.startsWith("/\\")) return null;
  if (valore.length > 500) return null;
  return valore;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const errore = () => NextResponse.redirect(new URL("/login?errore=oauth", origin));

  // Il provider può rimandare indietro con un errore (consenso negato, ecc.).
  if (url.searchParams.get("error")) return errore();

  const code = url.searchParams.get("code");
  if (!code) return errore();

  const next = percorsoSicuro(url.searchParams.get("next"));
  const vuoleOrganizzatore = url.searchParams.get("ruolo") === "organizer";

  // Il client SSR scrive i cookie di sessione sullo store di next/headers, che
  // in un route handler finiscono nella risposta.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    logger.warn("auth/callback", "scambio del codice fallito:", error?.message ?? "utente assente");
    return errore();
  }

  if (vuoleOrganizzatore) {
    try {
      const esito = await richiediAccessoOrganizzatore({ userId: data.user.id });
      if (esito.ok && esito.stato !== "approved") {
        return NextResponse.redirect(new URL(PERCORSO_IN_ATTESA, origin));
      }
    } catch (e) {
      // Un guasto qui non deve impedire l'accesso: si prosegue come utente.
      logger.warn("auth/callback", "richiesta organizzatore non riuscita:", e instanceof Error ? e.message : String(e));
    }
  }

  const dest = `/post-login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return NextResponse.redirect(new URL(dest, origin));
}
