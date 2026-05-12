// Server route che, dopo il signin, instrada l'utente nella dashboard
// corretta in base al ruolo del profilo.
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const base = getSiteUrl();

  if (!user) {
    return NextResponse.redirect(new URL("/login", base));
  }

  // Service-role per leggere il profilo bypassando le policy ricorsive
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "user";
  const dest =
    next && next.startsWith("/")
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
