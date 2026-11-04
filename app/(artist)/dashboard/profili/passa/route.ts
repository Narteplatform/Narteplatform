import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ARTIST_COOKIE, getOwnedArtists } from "@/lib/artist/current";

/**
 * Cambio di profilo con reindirizzamento:
 *   /dashboard/profili/passa?to=<artistId>&next=/dashboard/chat/<id>
 *
 * Serve a notifiche, toast e link diretti: una notifica del profilo «Burdell
 * Band» aperta mentre e' attivo un altro profilo porta prima sul profilo giusto
 * e poi alla chat o alla richiesta, invece di una pagina vuota.
 *
 * La proprieta' si verifica qui (il cookie e' scrivibile dal client, vedi
 * lib/artist/current.ts). `next` deve restare dentro /dashboard: niente
 * redirect verso indirizzi esterni.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const to = url.searchParams.get("to") ?? "";
  const rawNext = url.searchParams.get("next") ?? "/dashboard/overview";
  const next =
    rawNext.startsWith("/dashboard") && !rawNext.startsWith("//") ? rawNext : "/dashboard/overview";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, url));
  }

  const owned = await getOwnedArtists(user.id);
  const target = owned.find((a) => a.id === to);
  const current = request.cookies.get(ACTIVE_ARTIST_COOKIE)?.value ?? owned[0]?.id;

  const dest = new URL(next, url);
  // Avviso «Sei ora su …» solo se il profilo cambia davvero.
  if (target && target.id !== current) dest.searchParams.set("profilo", target.id);

  const res = NextResponse.redirect(dest);
  if (target) {
    res.cookies.set(ACTIVE_ARTIST_COOKIE, target.id, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
