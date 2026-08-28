import { notFound } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Health — N'arte",
  robots: { index: false, follow: false },
};

const REQUIRED_PUBLIC = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const REQUIRED_PRIVATE = ["SUPABASE_SERVICE_ROLE_KEY"] as const;
const OPTIONAL = [
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "SUPERADMIN_EMAIL",
  "ADMIN_NOTIFICATION_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
] as const;

function envStatus(name: string) {
  const v = process.env[name];
  if (!v) return { present: false, length: 0 };
  return { present: true, length: v.length };
}

export default async function HealthPage() {
  // Questa pagina era PUBBLICA. Mostrava a chiunque quali integrazioni sono
  // attive (con la lunghezza in caratteri di ogni chiave), l'esito della
  // connessione service-role al database con il messaggio d'errore in chiaro,
  // il conteggio reale di una tabella, l'id dell'utente in sessione e il
  // commit in produzione. Nessuno di questi dati va esposto.
  //
  // Il middleware ferma già gli anonimi (`protectedPrefixes`). Qui si decide
  // CHI passa: solo il superadmin root, lo stesso confronto usato per
  // /admin/impostazioni. A tutti gli altri la pagina non risulta esistere.
  const rootEmail = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
  const gate = await createClient();
  const {
    data: { user: viewer },
  } = await gate.auth.getUser();
  const viewerEmail = (viewer?.email ?? "").trim().toLowerCase();
  if (rootEmail === "" || viewerEmail !== rootEmail) notFound();

  const checks: { label: string; ok: boolean; detail: string }[] = [];

  for (const k of REQUIRED_PUBLIC) {
    const s = envStatus(k);
    checks.push({
      label: k,
      ok: s.present,
      detail: s.present ? `presente (len ${s.length})` : "MANCANTE",
    });
  }
  for (const k of REQUIRED_PRIVATE) {
    const s = envStatus(k);
    checks.push({
      label: k,
      ok: s.present,
      detail: s.present ? `presente (len ${s.length})` : "MANCANTE",
    });
  }
  for (const k of OPTIONAL) {
    const s = envStatus(k);
    checks.push({
      label: `${k} (optional)`,
      ok: true,
      detail: s.present ? `presente (len ${s.length})` : "non impostata",
    });
  }

  let serviceClientOk = false;
  let serviceClientErr = "";
  let countErr = "";
  let eventsCount: number | null = null;
  try {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    serviceClientOk = true;
    try {
      const { count, error } = await admin
        .from("events")
        .select("id", { count: "exact", head: true });
      eventsCount = count ?? null;
      if (error) countErr = error.message;
    } catch (e) {
      countErr = e instanceof Error ? e.message : String(e);
    }
  } catch (e) {
    serviceClientErr = e instanceof Error ? e.message : String(e);
  }

  let authOk = false;
  let authErr = "";
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    authOk = !error;
    if (error) authErr = error.message;
    userId = user?.id ?? null;
  } catch (e) {
    authErr = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 font-sans">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="space-y-1">
          <h1 className="font-display text-2xl tracking-tight">Diagnostica N&apos;arte</h1>
          <p className="text-sm text-muted-foreground">
            Stato delle environment variables e connessione Supabase. Pagina pubblica usata per
            debug deployment.
          </p>
        </header>

        <section className="space-y-2 rounded-2xl border border-border bg-background p-5">
          <h2 className="font-display text-lg tracking-tight">Environment variables</h2>
          <ul className="space-y-1 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 font-mono">
                <span>{c.label}</span>
                <span className={c.ok ? "text-emerald-700" : "text-red-700"}>
                  {c.ok ? "✓" : "✗"} {c.detail}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 rounded-2xl border border-border bg-background p-5">
          <h2 className="font-display text-lg tracking-tight">Supabase service-role client</h2>
          <p className="text-sm">
            <span
              className={
                serviceClientOk ? "font-medium text-emerald-700" : "font-medium text-red-700"
              }
            >
              {serviceClientOk ? "✓ creazione client OK" : "✗ creazione client fallita"}
            </span>
            {serviceClientErr && (
              <span className="ml-2 font-mono text-xs">{serviceClientErr}</span>
            )}
          </p>
          {serviceClientOk && (
            <p className="text-sm">
              {countErr ? (
                <span className="font-medium text-red-700">
                  ✗ query events fallita:{" "}
                  <span className="font-mono text-xs">{countErr}</span>
                </span>
              ) : (
                <span className="font-medium text-emerald-700">
                  ✓ query events OK · count = {eventsCount}
                </span>
              )}
            </p>
          )}
        </section>

        <section className="space-y-2 rounded-2xl border border-border bg-background p-5">
          <h2 className="font-display text-lg tracking-tight">Supabase auth (sessione corrente)</h2>
          <p className="text-sm">
            {authOk ? (
              userId ? (
                <span className="font-medium text-emerald-700">
                  ✓ sessione valida · user id <code className="font-mono text-xs">{userId}</code>
                </span>
              ) : (
                <span className="font-medium text-amber-700">
                  ⚠ nessun utente loggato (visita /login per autenticarti)
                </span>
              )
            ) : (
              <span className="font-medium text-red-700">
                ✗ getUser fallito: <span className="font-mono text-xs">{authErr}</span>
              </span>
            )}
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          Build commit: {process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local"} · Deploy URL:{" "}
          {process.env.VERCEL_URL ?? "local"}
        </p>
      </div>
    </div>
  );
}
