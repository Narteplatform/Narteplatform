import { createClient } from "@/lib/supabase/server";
import { LeadStatusSelect } from "@/components/admin/LeadStatusSelect";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("leads")
    .select("*, artists!inner(stage_name, slug)")
    .order("created_at", { ascending: false });
  if (sp?.status) q = q.eq("status", sp.status);
  const { data: leads } = await q;

  return (
    <div className="space-y-6">
      <h1 className="display-xl text-4xl">Lead</h1>
      <nav className="flex gap-2 text-sm">
        {[
          { v: "", label: "Tutti" },
          { v: "new", label: "Nuovi" },
          { v: "contacted", label: "Contattati" },
          { v: "closed", label: "Chiusi" },
        ].map((s) => {
          const active = (sp?.status ?? "") === s.v;
          const href = s.v ? `/admin/leads?status=${s.v}` : "/admin/leads";
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

      {!leads || leads.length === 0 ? (
        <p className="text-muted-foreground">Nessun lead.</p>
      ) : (
        <div className="space-y-4">
          {leads.map((l: any) => (
            <article key={l.id} className="border border-border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("it-IT")}
                  </p>
                  <h3 className="mt-1 font-display text-xl uppercase">
                    {l.artists?.stage_name} — {l.event_location}
                  </h3>
                  <p className="text-sm">
                    Data evento: {new Date(l.event_date).toLocaleDateString("it-IT")}
                    {l.budget != null ? ` · Budget €${Number(l.budget).toFixed(2)}` : ""}
                  </p>
                </div>
                <LeadStatusSelect leadId={l.id} status={l.status} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{l.message}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Contatto:{" "}
                <a href={`mailto:${l.contact_email}`} className="underline">
                  {l.contact_email}
                </a>
                {l.contact_phone ? ` · ${l.contact_phone}` : ""}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
