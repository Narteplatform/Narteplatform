// Ritorno dall'accesso con provider esterno (Google). Scambia il `code` con la
// sessione, poi instrada: chi si è iscritto come organizzatore va a completare
// la richiesta (consensi, poi locale e città), tutti gli altri a /post-login
// che decide per ruolo.
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { percorsoSicuro } from "@/lib/auth/percorso";
import { COOKIE_BENVENUTO } from "@/lib/auth/costanti";
import { isUtenteSospeso, queryLoginBloccato } from "@/lib/auth/sospeso";

export const dynamic = "force-dynamic";

/** Il provider (o Supabase) ha rifiutato l'accesso perché l'utente è bannato. */
function erroreDaBan(url: URL): boolean {
  const codice = (url.searchParams.get("error_code") ?? "").toLowerCase();
  const descrizione = (url.searchParams.get("error_description") ?? "").toLowerCase();
  return codice === "user_banned" || descrizione.includes("banned");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const errore = () => NextResponse.redirect(new URL("/login?errore=oauth", origin));

  // Il provider può rimandare indietro con un errore (consenso negato, ecc.).
  // Un account sospeso o chiuso riceve lo stesso messaggio del login con email,
  // non quello generico: altrimenti riproverebbe all'infinito senza capire.
  if (url.searchParams.get("error")) {
    if (erroreDaBan(url)) return NextResponse.redirect(new URL("/login?sospeso=1", origin));
    return errore();
  }

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
    if (error && /banned/i.test(error.message)) {
      return NextResponse.redirect(new URL("/login?sospeso=1", origin));
    }
    return errore();
  }

  // Sessione aperta per un account bloccato: la si chiude subito e si mostra
  // il motivo, come fa il middleware per le sessioni già aperte.
  if (isUtenteSospeso(data.user)) {
    try {
      await supabase.auth.signOut();
    } catch {
      // il redirect avviene comunque; il middleware chiude alla richiesta dopo
    }
    return NextResponse.redirect(new URL(`/login?${queryLoginBloccato(data.user)}`, origin));
  }

  // ORGANIZZATORE DA GOOGLE. Prima qui si creava subito la richiesta in
  // attesa e si avvisava il team: prima dei consensi e senza locale né città.
  // Ora si manda a /benvenuto con l'intento: il middleware fa passare prima
  // dalla schermata dei consensi (chi entra con Google non ne ha dati), poi
  // /benvenuto raccoglie locale e città e solo allora chiede l'accesso.
  // Solo per chi è ancora `user`: un account con un ruolo va dove va sempre.
  if (vuoleOrganizzatore) {
    let ruolo: string | null = null;
    try {
      const admin = createAdminClient();
      const { data: profilo, error: profErr } = await admin
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profErr) {
        logger.warn("auth/callback", "ruolo non letto:", profErr.message);
      } else {
        ruolo = profilo?.role ?? null;
      }
    } catch (e) {
      logger.warn("auth/callback", "ruolo non letto:", e instanceof Error ? e.message : String(e));
    }
    if (ruolo === "user") {
      const res = NextResponse.redirect(new URL("/benvenuto?ruolo=organizer", origin));
      // Come /post-login: il benvenuto si mostra una volta sola.
      res.cookies.set(COOKIE_BENVENUTO, "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    }
  }

  const dest = `/post-login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return NextResponse.redirect(new URL(dest, origin));
}
