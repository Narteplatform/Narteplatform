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
  const protectedPrefixes = ["/admin", "/dashboard", "/organizzatore"];
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
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|webmanifest)$).*)",
  ],
};
