// Conferma di un indirizzo email: registrazione, cambio email, invito.
//
// Due formati di link, entrambi accettati:
//  - `?token_hash=…&type=…` — il link punta direttamente qui (template email di
//    Supabase personalizzati, vedi report). Si verifica con `verifyOtp`: non
//    dipende dal browser in cui il link viene aperto.
//  - `?code=…` — il link passa da Supabase (`/auth/v1/verify`), che conferma e
//    rimanda qui con il codice PKCE. Lo scambio riesce solo nel browser che ha
//    avviato l'operazione (vi sta il code verifier); altrove l'indirizzo è
//    comunque già confermato e si chiede solo di accedere.
//
// Prima la registrazione mandava a /login, che il `code` lo ignorava: l'utente
// confermava e si ritrovava davanti al modulo senza sapere se fosse andata.
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { percorsoSicuro } from "@/lib/auth/percorso";
import { isUtenteSospeso, queryLoginBloccato } from "@/lib/auth/sospeso";

export const dynamic = "force-dynamic";

const TIPI: readonly EmailOtpType[] = ["signup", "email", "email_change", "invite", "magiclink", "recovery"];

function tipoValido(v: string | null): EmailOtpType | null {
  return v && (TIPI as readonly string[]).includes(v) ? (v as EmailOtpType) : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const next = percorsoSicuro(url.searchParams.get("next"));
  const vai = (percorso: string) => NextResponse.redirect(new URL(percorso, origin));
  const conNext = (percorso: string) =>
    next ? `${percorso}${percorso.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}` : percorso;

  // Supabase rimanda qui con un errore quando il link è scaduto o già usato.
  if (url.searchParams.get("error")) {
    return vai(conNext("/login?errore=conferma"));
  }

  const tokenHash = url.searchParams.get("token_hash");
  const tipo = tipoValido(url.searchParams.get("type"));
  const code = url.searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && tipo) {
    // Il recupero password ha la sua pagina, che verifica il token solo
    // all'invio della nuova password (lib/auth/link-password.ts).
    if (tipo === "recovery" || tipo === "invite") {
      const qs = new URLSearchParams({ token_hash: tokenHash, type: tipo });
      return vai(`/reset-password?${qs.toString()}`);
    }
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (error) {
      logger.warn("auth/confirm", `verifica ${tipo} fallita:`, error.message);
      return vai(conNext("/login?errore=conferma"));
    }
    return esito(tipo, data.user, Boolean(data.session));
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Quasi sempre: link aperto in un browser diverso da quello della
      // registrazione. La conferma è già avvenuta su Supabase prima del
      // rimando, manca solo la sessione.
      logger.warn("auth/confirm", "scambio del codice fallito:", error.message);
      return vai(conNext("/login?confermata=1"));
    }
    return esito(tipo, data.user, Boolean(data.session));
  }

  return vai(conNext("/login?errore=conferma"));

  async function esito(
    t: EmailOtpType | null,
    utente: { banned_until?: string | null; app_metadata?: unknown } | null,
    conSessione: boolean
  ) {
    if (utente && isUtenteSospeso(utente)) {
      try {
        await supabase.auth.signOut();
      } catch {
        // il middleware chiude la sessione alla richiesta successiva
      }
      return vai(`/login?${queryLoginBloccato(utente)}`);
    }
    if (t === "email_change") {
      // Con il «cambio email sicuro» di Supabase servono DUE conferme (vecchio e
      // nuovo indirizzo): la prima non completa il cambio.
      return vai(conSessione ? "/account?email=confermata" : "/login?confermata=1");
    }
    if (!conSessione) return vai(conNext("/login?confermata=1"));
    return vai(`/post-login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
}
