import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, Role } from "@/lib/supabase/types";
import { isUtenteSospeso, queryLoginBloccato } from "@/lib/auth/sospeso";
import { HEADER_PERCORSO, PERCORSO_MFA, PERCORSO_SICUREZZA } from "@/lib/auth/costanti";
import { livelloSessione } from "@/lib/auth/aal";
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
  // Percorso richiesto, per `requireUser()` nei Server Component (rientro dopo
  // il login con `?next=`). Sempre sovrascritto: un valore mandato dal client
  // non arriva mai al server. È solo una destinazione, ripulita comunque da
  // `percorsoSicuro` prima dell'uso.
  request.headers.set(HEADER_PERCORSO, `${request.nextUrl.pathname}${request.nextUrl.search}`);

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

  // Account sospeso con sessione ancora valida: chiusura della sessione e invio
  // al login. Usa il campo `banned_until` già restituito da getUser, nessuna
  // query in più. `signOut` scrive i cookie cancellati su `response` (tramite
  // setAll): si copiano sulla risposta di redirect.
  if (isUtenteSospeso(user)) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Se la chiusura fallisce il redirect avviene comunque.
    }
    // Su /login si resta, per non creare un ciclo con il rimando in home.
    if (path === "/login") return response;
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?${queryLoginBloccato(user)}`;
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

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
      // ── VERIFICA IN DUE PASSAGGI ────────────────────────────────────────
      // Solo per chi in /admin ci resta (superadmin e consulenti). Con un
      // fattore TOTP attivo la sessione deve essere aal2; con
      // MFA_ADMIN_OBBLIGATORIA=1 il fattore è obbligatorio. Ogni errore di
      // lettura lascia passare: in dubbio non si chiude fuori nessuno.
      if (role === "superadmin" || role === "consultant") {
        const passo = await passoMfa(supabase, user);
        if (passo) {
          const dest = request.nextUrl.clone();
          dest.search = "";
          if (passo === "verifica") {
            dest.pathname = PERCORSO_MFA;
            dest.searchParams.set("next", `${path}${request.nextUrl.search}`);
          } else {
            dest.pathname = PERCORSO_SICUREZZA;
            dest.searchParams.set("obbligatoria", "1");
          }
          const redirect = NextResponse.redirect(dest);
          response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
          return redirect;
        }
      }
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

/**
 * Che cosa manca, quanto al secondo fattore, per entrare in /admin:
 *  - "verifica": c'è un fattore verificato ma la sessione è ancora aal1;
 *  - "attiva": nessun fattore e MFA_ADMIN_OBBLIGATORIA=1;
 *  - null: niente da fare (anche in caso di errore: in dubbio non si blocca).
 * I fattori vengono dall'utente di `getUser()`, il livello dal token: vedi
 * lib/auth/aal.ts. Nessuna chiamata di rete in più.
 */
async function passoMfa(
  supabase: Parameters<typeof livelloSessione>[0],
  utente: Parameters<typeof livelloSessione>[1]
): Promise<"verifica" | "attiva" | null> {
  const livello = await livelloSessione(supabase, utente);
  if (!livello) return null;
  if (livello.prossimo === "aal2" && livello.attuale !== "aal2") return "verifica";
  if (process.env.MFA_ADMIN_OBBLIGATORIA === "1" && livello.prossimo === "aal1" && livello.attuale === "aal1") {
    return "attiva";
  }
  return null;
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
    // `api/calendario` escluso: lo leggono Google/Apple Calendar ogni qualche
    // ora, senza cookie; l'accesso è il token nel percorso.
    // `api/health` escluso: lo interroga un monitor esterno senza cookie (la
    // pagina di diagnostica `/__health` invece passa dal middleware, è protetta).
    // `blog/rss.xml` escluso: lo leggono i lettori di feed, senza sessione.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/keepalive|api/health|blog/rss\\.xml|api/cron|api/stripe|api/csp-report|api/artists/view|api/calendario|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|webmanifest)$).*)",
  ],
};
