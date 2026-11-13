// Server route che, dopo il signin, instrada l'utente nella dashboard
// corretta in base al ruolo del profilo.
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { percorsoSicuro } from "@/lib/auth/percorso";
import { COOKIE_BENVENUTO, isAccountNuovo } from "@/lib/auth/costanti";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(request.url);
  // Solo percorsi interni (lib/auth/percorso.ts): barre rovesciate, `//host` e simili portano fuori sito.
  const next = percorsoSicuro(url.searchParams.get("next"));
  const base = getSiteUrl();

  if (!user) {
    return NextResponse.redirect(new URL("/login", base));
  }

  // Service-role per leggere il profilo bypassando le policy ricorsive
  const admin = createAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) {
    // Ruolo sconosciuto: non si indovina. Home, senza deviazioni.
    return NextResponse.redirect(new URL(next ?? "/", base));
  }

  const role = profile?.role ?? "user";

  // BENVENUTO. Chi entra per la prima volta (tipicamente con Google) è un
  // `user` che non ha ancora scelto se è un artista o un organizzatore: gli si
  // chiede una volta sola. Condizioni, tutte necessarie:
  //   - ruolo `user`, nessuna destinazione richiesta (`next`);
  //   - nessuna riga in `artists` né in `organizers` (letture con errore
  //     controllato: se una fallisce NON si devia, si prosegue come sempre);
  //   - account creato da poco e cookie «già visto» assente: altrimenti ogni
  //     utente semplice, a ogni accesso, verrebbe rimandato qui.
  const nuovo = isAccountNuovo(user.created_at);
  if (role === "user" && !next && nuovo && !request.headers.get("cookie")?.includes(`${COOKIE_BENVENUTO}=`)) {
    const [art, org] = await Promise.all([
      admin.from("artists").select("id").eq("user_id", user.id).limit(1),
      admin.from("organizers").select("id").eq("user_id", user.id).limit(1),
    ]);
    if (!art.error && !org.error && (art.data?.length ?? 0) === 0 && (org.data?.length ?? 0) === 0) {
      const res = NextResponse.redirect(new URL("/benvenuto", base));
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

  const dest =
    next
      ? next
      : role === "superadmin"
        ? "/admin"
        : role === "artist"
          ? "/dashboard"
          : role === "organizer"
            ? "/organizzatore"
            : "/";

  return NextResponse.redirect(new URL(dest, base));
}
