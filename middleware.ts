import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, Role } from "@/lib/supabase/types";
import { ADMIN_PAGES_SEMPRE_VISIBILI, adminSectionForPath } from "@/lib/admin/sections";
import {
  LEGAL_COOKIE,
  LEGAL_COOKIE_MAX_AGE,
  copreVersioneCorrente,
  isGateExempt,
  isGateSkippableRequest,
} from "@/lib/legal/gate";

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

  // ───────────────────────────────────────────────────────── GATE LEGALE ──
  //
  // Gli account creati da un amministratore — tutti gli artisti, i consulenti,
  // i superadmin invitati — non hanno mai accettato termini e informativa: quei
  // percorsi non passano da `signUp`, quindi la trigger che registra il
  // consenso non trova metadati da leggere. Lo stesso vale per chiunque si sia
  // iscritto prima che i documenti esistessero. Qui li si intercetta.
  //
  // COSTO. Chi ha già accettato porta un cookie con la versione e non tocca il
  // database: la verifica è un confronto fra stringhe. Chi non ce l'ha paga UNA
  // query, e nelle tre aree riservate è la stessa che il middleware faceva già
  // per leggere il ruolo — arricchita di una colonna, non raddoppiata.
  const serveRuolo =
    !!user &&
    (path.startsWith("/admin") ||
      path.startsWith("/dashboard") ||
      path.startsWith("/organizzatore"));

  const gateApplicabile =
    !!user && !isGateExempt(path) && !isGateSkippableRequest(request.headers);
  const gateDaVerificare =
    gateApplicabile &&
    !copreVersioneCorrente(request.cookies.get(LEGAL_COOKIE)?.value);

  let profile: { role: Role; legal_version_accepted: string | null } | null = null;
  let letturaProfiloFallita = false;

  // Client con service role: bypassa la RLS ed evita la ricorsione delle policy
  // "is superadmin", che si auto-referenziano su `profiles`. Creato una volta
  // sola e riusato sia dal gate sia dai controlli di ruolo qui sotto — istanziarlo
  // non apre connessioni, ma averne due copie invita a divergere.
  const admin =
    user && (serveRuolo || gateDaVerificare)
      ? createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
      : null;

  if (admin && user) {
    const { data, error } = await admin
      .from("profiles")
      .select("role, legal_version_accepted")
      .eq("id", user.id)
      .single();

    if (error) {
      // SCHEMA VECCHIO. Se questo codice arriva online prima che la migration
      // 0059 sia stata applicata a mano, `legal_version_accepted` non esiste e
      // l'intera select fallisce — portandosi via anche il RUOLO, con la
      // conseguenza che ogni artista verrebbe sbattuto fuori dalla propria
      // dashboard. Si riprova quindi chiedendo la sola colonna che è sempre
      // esistita: il sito continua a funzionare come prima e il gate resta
      // inattivo finché la colonna non c'è.
      //
      // Questo secondo giro costa una query in più, ma solo nella finestra fra
      // il rilascio del codice e l'applicazione della migration. Quando la
      // colonna esiste, non viene mai eseguito.
      const ripiego = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      profile = ripiego.data
        ? { role: ripiego.data.role, legal_version_accepted: null }
        : null;
      // In entrambi i casi il gate deve lasciar passare: o non sappiamo nulla
      // dell'utente, o sappiamo il ruolo ma non se abbia accettato. Dedurre un
      // "non ha accettato" dall'assenza della colonna manderebbe l'intera base
      // utenti su una schermata che non può funzionare.
      letturaProfiloFallita = true;
    } else {
      profile = data ?? null;
    }
  }

  if (gateDaVerificare) {
    if (letturaProfiloFallita) {
      // Fallire APERTI, come già fa il limitatore di frequenza. Un errore
      // transitorio del database non deve trasformarsi in un sito inaccessibile
      // per tutti: il consenso si riguadagna alla richiesta successiva, una
      // piattaforma ferma no. Davanti ai dati veri restano comunque
      // l'autenticazione e le policy RLS.
    } else if (copreVersioneCorrente(profile?.legal_version_accepted)) {
      // Accettato: si memorizza, così le prossime navigazioni non interrogano
      // più il database.
      response.cookies.set(LEGAL_COOKIE, profile!.legal_version_accepted!, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: LEGAL_COOKIE_MAX_AGE,
      });
    } else {
      const gate = request.nextUrl.clone();
      gate.pathname = "/accetta-condizioni";
      gate.search = "";
      // Il percorso COMPLETO, non solo il pathname: chi stava aprendo
      // /artisti/tizio?data=2026-09-01 deve tornarci con i suoi parametri.
      gate.searchParams.set("next", `${path}${request.nextUrl.search}`);
      return NextResponse.redirect(gate);
    }
  }

  if (serveRuolo && admin && user) {
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
          // Stessa fonte delle pagine e delle Server Actions: lib/admin/sections.
          const matchedKey = adminSectionForPath(path);
          if (matchedKey && !ADMIN_PAGES_SEMPRE_VISIBILI.includes(matchedKey)) {
            const { data: perm } = await admin
              .from("admin_page_permissions")
              .select("can_view")
              .eq("user_id", user.id)
              .eq("page_key", matchedKey)
              .maybeSingle();
            // Stessa rete di sicurezza di getAllowedAdminPages: se nel sistema
            // non esiste nessuna delega, il controllo granulare non è in uso e
            // il superadmin non viene chiuso fuori dal proprio pannello.
            let deleghePresenti = true;
            if (!perm) {
              const { count } = await admin
                .from("admin_page_permissions")
                .select("user_id", { head: true, count: "exact" });
              deleghePresenti = (count ?? 0) > 0;
            }
            if (deleghePresenti && (!perm || !perm.can_view)) {
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
    // `api/csp-report` escluso: lo chiama il BROWSER da solo, per segnalare una
    // violazione della policy. Non ha bisogno di sapere chi sia l'utente, e una
    // pagina che ne genera dieci pagherebbe dieci getUser() per niente.
    // Rimossa l'esclusione di `api/health`: quella rotta non è mai esistita
    // (le uniche sotto app/api sono artists, booking, booking-request, cron,
    // keepalive, search, stripe, upload, upload-application-video). La pagina
    // di diagnostica è `/__health`, che deve invece PASSARE dal middleware per
    // essere protetta.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/keepalive|api/cron|api/stripe|api/csp-report|api/artists/view|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|webmanifest)$).*)",
  ],
};
