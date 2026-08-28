import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep-alive per il piano Free di Supabase.
//
// Il progetto viene messo in pausa dopo ~7 giorni senza "sufficiente attività
// sul database": a quel punto ogni query fallisce e il sito mostra liste
// vuote (artisti, format, eventi spariti). Vercel Cron — vedi `crons` in
// vercel.json — chiama questa rotta una volta al giorno; l'handler esegue solo
// qualche SELECT con `count` + `head` (nessuna riga letta, nessuna scrittura)
// sulle tabelle pubbliche, quanto basta ad azzerare il timer di inattività.
//
// Sicurezza: se `CRON_SECRET` è impostata su Vercel, il cron la invia come
// `Authorization: Bearer <CRON_SECRET>` e qui viene pretesa. Se manca, la rotta
// resta aperta di proposito — un 401 renderebbe il keep-alive inutile senza
// che nessuno se ne accorga — ma usa la chiave anon sotto RLS, quindi non può
// fare più di quanto faccia un visitatore anonimo.

const TABLES = ["events", "artists", "formats"] as const;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Supabase env mancanti" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const started = Date.now();
  const failures: string[] = [];

  for (const table of TABLES) {
    try {
      const { error } = await supabase.from(table).select("id", { count: "exact", head: true });
      if (error) failures.push(`${table}: ${error.message}`);
    } catch (e) {
      failures.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const body = {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    tables: TABLES.length,
    ...(failures.length > 0 ? { failures } : {}),
  };

  if (!body.ok) {
    // Visibile nei log Vercel del cron: se Supabase è già in pausa (o giù),
    // il 503 fa comparire l'invocazione come fallita invece che verde.
    console.error("[keepalive]", failures.join(" | "));
  }

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
