import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { LEGAL_COOKIE } from "@/lib/legal/gate";
import { COOKIE_BENVENUTO } from "@/lib/auth/costanti";
import { ACTIVE_ARTIST_COOKIE } from "@/lib/artist/current";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/login", getSiteUrl()), {
    status: 303,
  });

  // Il cookie che memorizza la versione dei documenti accettata va cancellato
  // insieme alla sessione. Non è un dettaglio: senza, su un computer condiviso
  // la persona successiva che accede troverebbe il cookie di chi l'ha preceduta
  // e salterebbe la schermata di accettazione — risultando, per il middleware,
  // come se avesse accettato qualcosa che non ha mai visto.
  response.cookies.delete(LEGAL_COOKIE);
  // Stessa ragione per gli altri cookie legati alla persona: il «benvenuto già
  // visto» (chi entra dopo deve vederlo, se è nuovo) e il profilo artista
  // attivo (è l'id di un profilo di chi è uscito).
  response.cookies.delete(COOKIE_BENVENUTO);
  response.cookies.delete(ACTIVE_ARTIST_COOKIE);

  return response;
}
