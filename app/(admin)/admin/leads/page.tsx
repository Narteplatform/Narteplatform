import { createAdminClient } from "@/lib/supabase/server";
import { LeadStatusSelect } from "@/components/admin/LeadStatusSelect";
import { LeadTagsEditor } from "@/components/admin/LeadTagsEditor";

export const metadata = { title: "Lead — N'arte Admin" };

type Lead = {
  id: string;
  artist_id: string;
  event_date: string;
  event_location: string;
  budget: number | null;
  message: string;
  contact_email: string;
  contact_phone: string | null;
  status: "new" | "contacted" | "closed";
  tags: string[] | null;
  created_at: string;
  artists?: { stage_name: string; slug: string } | null;
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const supabase = createAdminClient();
  const ALLOWED_STATUS = ["new", "contacted", "closed"] as const;
  type LeadStatusFilter = (typeof ALLOWED_STATUS)[number];
  const statusFilter: LeadStatusFilter | null =
    sp?.status && (ALLOWED_STATUS as readonly string[]).includes(sp.status)
      ? (sp.status as LeadStatusFilter)
      : null;

  let q = supabase
    .from("leads")
    .select("*, artists!inner(stage_name, slug)")
    .order("created_at", { ascending: false });
  if (statusFilter) q = q.eq("status", statusFilter);
  if (sp?.tag) q = q.contains("tags", [sp.tag]);
  const { data: leadsRaw } = await q;
  const leads = (leadsRaw ?? []) as unknown as Lead[];

  // Tag aggregati per filtro rapido
  const allTagsCount = new Map<string, number>();
  leads.forEach((l) => (l.tags ?? []).forEach((t) => allTagsCount.set(t, (allTagsCount.get(t) ?? 0) + 1)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-xl text-4xl">Lead</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tutte le richieste di booking ricevute. Aggiorna stato e aggiungi tag per
          organizzare la pipeline.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {[
          { v: "", label: "Tutti" },
          { v: "new", label: "Nuovi" },
          { v: "contacted", label: "Contattati" },
          { v: "closed", label: "Chiusi" },
        ].map((s) => {
          const active = (sp?.status ?? "") === s.v;
          const params = new URLSearchParams();
          if (s.v) params.set("status", s.v);
          if (sp?.tag) params.set("tag", sp.tag);
          const href = params.toString() ? `/admin/leads?${params}` : "/admin/leads";
          return (
            <a
              key={s.v}
              href={href}
              className={`rounded-full border px-4 py-1.5 ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground"
              }`}
            >
              {s.label}
            </a>
          );
        })}
      </nav>

      {allTagsCount.size > 0 && (
        <nav className="flex flex-wrap items-center gap-2 text-xs uppercase">
          <span className="text-muted-foreground">Filtra per tag:</span>
          {[...allTagsCount.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => {
            const active = sp?.tag === t;
            const params = new URLSearchParams();
            if (sp?.status) params.set("status", sp.status);
            if (!active) params.set("tag", t);
            const href = params.toString() ? `/admin/leads?${params}` : "/admin/leads";
            return (
              <a
                key={t}
                href={href}
                className={`rounded-full border px-3 py-0.5 ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground"
                }`}
              >
                {t} · {n}
              </a>
            );
          })}
        </nav>
      )}

      {leads.length === 0 ? (
        <p className="text-muted-foreground">Nessun lead.</p>
      ) : (
        <div className="space-y-4">
          {leads.map((l) => (
            <article key={l.id} className="space-y-3 border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("it-IT")}
                  </p>
                  <h3 className="mt-1 font-display text-xl uppercase">
                    {l.artists?.stage_name ?? "—"} — {l.event_location}
                  </h3>
                  <p className="text-sm">
                    Data evento: {new Date(l.event_date).toLocaleDateString("it-IT")}
                    {l.budget != null ? ` · Budget €${Number(l.budget).toFixed(2)}` : ""}
                  </p>
                </div>
                <LeadStatusSelect leadId={l.id} status={l.status} />
              </div>
              <p className="whitespace-pre-wrap text-sm">{l.message}</p>
              <p className="text-xs text-muted-foreground">
                Contatto:{" "}
                <a href={`mailto:${l.contact_email}`} className="underline">
                  {l.contact_email}
                </a>
                {l.contact_phone ? ` · ${l.contact_phone}` : ""}
              </p>
              <LeadTagsEditor leadId={l.id} initialTags={l.tags ?? []} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
