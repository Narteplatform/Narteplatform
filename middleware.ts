import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // /artisti è pubblica come vetrina; il dettaglio richiede auth internamente
  // perché contiene il form di booking. /admin e /dashboard restano dietro auth.
  const protectedPrefixes = ["/admin", "/dashboard", "/organizzatore", "/__health"];
  const requiresAuth = protectedPrefixes.some((p) => path.startsWith(p));

  if (requiresAuth && !user) {
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/register")) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // /__health è una pagina di diagnostica: mostra quali variabili d'ambiente
  // sono configurate (con la loro lunghezza), l'esito della connessione al DB
  // con service role, il conteggio di una tabella, l'id dell'utente in sessione
  // e il commit in produzione. Era raggiungibile da chiunque.
  //
  // Qui il middleware fa solo la prima metà del lavoro — grazie al prefisso
  // aggiunto sopra, un anonimo viene già rimandato al login. Il controllo di
  // CHI sia l'utente sta dentro la pagina, con `notFound()`: in App Router è il
  // modo corretto di rispondere 404, e riusa app/not-found.tsx invece di
  // riscrivere l'URL verso una rotta interna di Next.

  if (
    user &&
    (path.startsWith("/admin") ||
      path.startsWith("/dashboard") ||
      path.startsWith("/organizzatore"))
  ) {
    // Lettura ruolo via service role (bypassa RLS, evita ricorsione delle policy
    // "is superadmin" che si auto-referenziano su profiles).
    const admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (path.startsWith("/admin")) {
      if (role === "superadmin") {
        // Gate impostazioni: solo root superadmin
        const rootEmail = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
        const userEmail = (user.email ?? "").trim().toLowerCase();
        const isRoot = rootEmail !== "" && userEmail === rootEmail;
        if (path.startsWith("/admin/impostazioni") && !isRoot) {
          url.pathname = "/admin";
          url.search = "";
          return NextResponse.redirect(url);
        }
        // Permessi pagina per superadmin non-root
        if (!isRoot) {
          const PAGE_PREFIX: Record<string, string> = {
            "/admin/eventi": "eventi",
            "/admin/artisti": "artisti",
            "/admin/generi": "generi",
            "/admin/leads": "leads",
            "/admin/chat": "chat",
            "/admin/messaggi": "messaggi",
            "/admin/consulenza": "consulenza",
            "/admin/blog": "blog",
            "/admin/email": "email",
            "/admin/feedback": "feedback",
            "/admin/impostazioni": "impostazioni",
            "/admin/profilo": "profilo",
          };
          const matchedKey = Object.entries(PAGE_PREFIX).find(([prefix]) =>
            path.startsWith(prefix)
          )?.[1];
          if (matchedKey && matchedKey !== "overview" && matchedKey !== "profilo") {
            const { data: perm } = await admin
              .from("admin_page_permissions")
              .select("can_view")
              .eq("user_id", user.id)
              .eq("page_key", matchedKey)
              .maybeSingle();
            if (!perm || !perm.can_view) {
              url.pathname = "/admin";
              url.search = "";
              return NextResponse.redirect(url);
            }
          }
        }
      } else if (role === "consultant") {
        // Consulente: accesso solo a consulenza + profilo
        const allowedForConsultant =
          path.startsWith("/admin/consulenza") || path.startsWith("/admin/profilo");
        if (!allowedForConsultant) {
          url.pathname = "/admin/consulenza";
          url.search = "";
          return NextResponse.redirect(url);
        }
      } else {
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
    if (path.startsWith("/dashboard") && role !== "artist" && role !== "superadmin") {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    if (
      path.startsWith("/organizzatore") &&
      role !== "organizer" &&
      role !== "superadmin"
    ) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // `api/stripe` escluso: il webhook non ha cookie di sessione, quindi il
    // refresh auth qui sarebbe puro spreco — e Stripe considera fallito un
    // webhook che non risponde entro ~20s, ritentandolo.
    // `webmanifest` escluso come le immagini: il manifest della PWA admin è un
    // file statico e non deve pagare un getUser() Supabase a ogni fetch.
    // `api/artists/view` escluso: il beacon delle visite legge già la sessione
    // nell'handler, e farla rileggere qui raddoppierebbe il costo di una
    // chiamata che parte a ogni apertura di profilo. Effetto collaterale noto e
    // accettato: se il token scade proprio in quell'istante non viene
    // rinfrescato e quella singola visita risulta anonima.
    // `api/keepalive` e `api/cron/*` esclusi: li chiama Vercel Cron senza cookie
    // di sessione, il getUser() sarebbe sprecato. Si autenticano da soli con
    // CRON_SECRET.
    // `sitemap.xml` e `robots.txt` esclusi: li leggono i crawler, che non hanno
    // sessione. Senza l'esclusione ogni passaggio di Googlebot pagava un
    // getUser() verso Supabase.
    // Rimossa l'esclusione di `api/health`: quella rotta non è mai esistita
    // (le uniche sotto app/api sono artists, booking, booking-request, cron,
    // keepalive, search, stripe, upload, upload-application-video). La pagina
    // di diagnostica è `/__health`, che deve invece PASSARE dal middleware per
    // essere protetta.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/keepalive|api/cron|api/stripe|api/artists/view|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|webmanifest)$).*)",
  ],
};
