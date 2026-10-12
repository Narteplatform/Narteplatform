import "server-only";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Link «imposta la password» delle nostre email (benvenuto artista, recupero).
 *
 * PERCHÉ NON SI USA `action_link`. Il link che `generateLink` restituisce
 * passa da `https://<progetto>.supabase.co/auth/v1/verify` e poi rimanda a
 * `redirect_to`. Supabase però accetta quell'indirizzo solo se è nella lista
 * «Redirect URLs» del progetto; altrimenti, in silenzio, rimanda al «Site
 * URL». Il 12/10/2026 il Site URL era `http://localhost:3000`: la prima
 * artista vera ha cliccato «Imposta la password» e Safari ha risposto
 * «impossibile connettersi al server».
 *
 * Qui il link punta DIRETTAMENTE alla nostra pagina con il `hashed_token`, e
 * la verifica la fa la pagina stessa (`verifyOtp`) solo quando la persona
 * invia la nuova password. Così:
 *  - non dipende da nessuna impostazione del pannello Supabase;
 *  - il dominio è lo stesso di tutti gli altri link delle email (getSiteUrl);
 *  - i filtri antispam che «visitano» i link (Outlook, iCloud) non bruciano il
 *    token, perché aprire la pagina non lo consuma.
 */
export function linkImpostaPassword(hashedToken: string, tipo: "invite" | "recovery"): string {
  const qs = new URLSearchParams({ token_hash: hashedToken, type: tipo });
  return `${getSiteUrl()}/reset-password?${qs.toString()}`;
}
