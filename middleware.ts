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
    if (path.startsWith("/admin") && role !== "superadmin") {
      url.pathname = "/";
      return NextResponse.redirect(url);
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
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
