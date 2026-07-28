import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, AlertTriangle, CheckCircle2, PauseCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Email — N'arte Admin" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  to_addresses: string[];
  subject: string;
  template: string | null;
  status: "sent" | "failed" | "skipped";
  provider_id: string | null;
  error: string | null;
  sent_at: string;
};

const STATUS_VARIANT: Record<Row["status"], "success" | "danger" | "muted"> = {
  sent: "success",
  failed: "danger",
  skipped: "muted",
};

const STATUS_LABEL: Record<Row["status"], string> = {
  sent: "Inviata",
  failed: "Fallita",
  skipped: "Saltata",
};

export default async function AdminEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; template?: string }>;
}) {
  const me = await getCurrentUser();
  if (me?.profile?.role !== "superadmin") redirect("/");

  const sp = await searchParams;
  const filterStatus = sp?.status === "failed" || sp?.status === "sent" || sp?.status === "skipped"
    ? sp.status
    : null;
  const filterTemplate = sp?.template || null;

  const admin = createAdminClient();

  // Stats: 7 giorni
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [sent7, failed7, sent30, failed30, byTemplate, list] = await Promise.all([
    admin.from("email_log").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", sevenDaysAgo),
    admin.from("email_log").select("id", { count: "exact", head: true }).eq("status", "failed").gte("sent_at", sevenDaysAgo),
    admin.from("email_log").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", thirtyDaysAgo),
    admin.from("email_log").select("id", { count: "exact", head: true }).eq("status", "failed").gte("sent_at", thirtyDaysAgo),
    admin.from("email_log").select("template, status").gte("sent_at", thirtyDaysAgo),
    (async () => {
      let q = admin
        .from("email_log")
        .select("id, to_addresses, subject, template, status, provider_id, error, sent_at")
        .order("sent_at", { ascending: false })
        .limit(200);
      if (filterStatus) q = q.eq("status", filterStatus);
      if (filterTemplate) q = q.eq("template", filterTemplate);
      return q;
    })(),
  ]);

  const rows = (list.data ?? []) as unknown as Row[];

  // Aggregate per template
  type Agg = { sent: number; failed: number; skipped: number };
  const aggregates = new Map<string, Agg>();
  for (const r of ((byTemplate.data ?? []) as { template: string | null; status: Row["status"] }[])) {
    const k = r.template ?? "(senza template)";
    const a = aggregates.get(k) ?? { sent: 0, failed: 0, skipped: 0 };
    a[r.status] += 1;
    aggregates.set(k, a);
  }
  const templates = Array.from(aggregates.entries())
    .map(([template, agg]) => ({ template, ...agg, total: agg.sent + agg.failed + agg.skipped }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supervisione invii automatici (Resend).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Inviate · 7gg" value={sent7.count ?? 0} icon={<CheckCircle2 className="size-4 text-green-600" />} />
        <Stat label="Fallite · 7gg" value={failed7.count ?? 0} icon={<AlertTriangle className="size-4 text-red-600" />} />
        <Stat label="Inviate · 30gg" value={sent30.count ?? 0} icon={<Mail className="size-4 text-muted-foreground" />} />
        <Stat label="Fallite · 30gg" value={failed30.count ?? 0} icon={<PauseCircle className="size-4 text-muted-foreground" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistiche per template (ultimi 30 giorni)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {templates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nessun invio registrato negli ultimi 30 giorni.
            </p>
          ) : (
            <>
            {/* Sotto md le 5 colonne obbligherebbero a scorrere di lato: stessi
                numeri, uno sotto l'altro. */}
            <ul className="space-y-2 md:hidden">
              {templates.map((t) => (
                <li key={t.template} className="rounded-xl border border-border p-3">
                  <Link
                    href={`/admin/email?template=${encodeURIComponent(t.template)}`}
                    className="block font-medium hover:text-accent"
                  >
                    {t.template}
                  </Link>
                  <dl className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <dt className="text-muted-foreground">Inviate</dt>
                      <dd className="mt-0.5 font-medium text-green-700">{t.sent}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Fallite</dt>
                      <dd className="mt-0.5 font-medium text-red-700">{t.failed}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Saltate</dt>
                      <dd className="mt-0.5 font-medium text-muted-foreground">{t.skipped}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Totale</dt>
                      <dd className="mt-0.5 font-medium">{t.total}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="-mx-2 hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Template</th>
                    <th className="px-2 py-2 text-right">Inviate</th>
                    <th className="px-2 py-2 text-right">Fallite</th>
                    <th className="px-2 py-2 text-right">Saltate</th>
                    <th className="px-2 py-2 text-right">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.template} className="border-t border-border">
                      <td className="px-2 py-2 font-medium">
                        <Link
                          href={`/admin/email?template=${encodeURIComponent(t.template)}`}
                          className="hover:text-accent"
                        >
                          {t.template}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right text-green-700">{t.sent}</td>
                      <td className="px-2 py-2 text-right text-red-700">{t.failed}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{t.skipped}</td>
                      <td className="px-2 py-2 text-right">{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ultimi invii</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <FilterPill href="/admin/email" active={!filterStatus && !filterTemplate}>
              Tutti
            </FilterPill>
            <FilterPill
              href={`/admin/email?status=sent${filterTemplate ? `&template=${encodeURIComponent(filterTemplate)}` : ""}`}
              active={filterStatus === "sent"}
            >
              Inviate
            </FilterPill>
            <FilterPill
              href={`/admin/email?status=failed${filterTemplate ? `&template=${encodeURIComponent(filterTemplate)}` : ""}`}
              active={filterStatus === "failed"}
            >
              Fallite
            </FilterPill>
            <FilterPill
              href={`/admin/email?status=skipped${filterTemplate ? `&template=${encodeURIComponent(filterTemplate)}` : ""}`}
              active={filterStatus === "skipped"}
            >
              Saltate
            </FilterPill>
            {filterTemplate && (
              <span className="rounded-full border border-accent bg-accent/10 px-3 py-1 uppercase tracking-wide text-accent">
                Template: {filterTemplate}
                <Link
                  href={`/admin/email${filterStatus ? `?status=${filterStatus}` : ""}`}
                  className="ml-2 text-accent hover:underline"
                >
                  ✕
                </Link>
              </span>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun invio registrato.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const when = new Date(r.sent_at).toLocaleString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <li key={r.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.subject}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          → {r.to_addresses.join(", ")}
                        </p>
                        {r.error && (
                          <p className="mt-1 line-clamp-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                            {r.error}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={STATUS_VARIANT[r.status]} dot>
                          {STATUS_LABEL[r.status]}
                        </Badge>
                        {r.template && (
                          <Link
                            href={`/admin/email?template=${encodeURIComponent(r.template)}`}
                            className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide hover:border-accent hover:text-accent"
                          >
                            {r.template}
                          </Link>
                        )}
                        <span className="text-xs text-muted-foreground">{when}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-2xl tracking-tight">{value}</p>
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border px-3 py-1 uppercase tracking-wide transition ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-background text-muted-foreground hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </Link>
  );
}
