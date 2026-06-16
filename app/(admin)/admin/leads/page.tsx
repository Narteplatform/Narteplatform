import Link from "next/link";
import { Clock, Mail, Phone } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { LeadStatusSelect } from "@/components/admin/LeadStatusSelect";
import { LeadTagsEditor } from "@/components/admin/LeadTagsEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Lead — N'arte Admin" };
export const dynamic = "force-dynamic";

type Lead = {
  id: string;
  artist_id: string | null;
  source: "booking" | "contatti" | "format" | null;
  contact_name: string | null;
  event_date: string | null;
  event_time: string | null;
  event_location: string | null;
  budget: number | null;
  message: string;
  contact_email: string;
  contact_phone: string | null;
  status: "new" | "contacted" | "closed";
  tags: string[] | null;
  created_at: string;
  artists?: { stage_name: string; slug: string } | null;
};

const STATUS_VARIANT: Record<Lead["status"], "warning" | "muted" | "success"> = {
  new: "warning",
  contacted: "muted",
  closed: "success",
};

const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "Nuovo",
  contacted: "Contattato",
  closed: "Chiuso",
};

const SOURCE_LABEL: Record<NonNullable<Lead["source"]>, string> = {
  booking: "Booking",
  contatti: "Contatti",
  format: "Format",
};

const SOURCE_VARIANT: Record<NonNullable<Lead["source"]>, "accent" | "outline" | "dark"> = {
  booking: "outline",
  contatti: "accent",
  format: "dark",
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
    .select("*, artists(stage_name, slug)")
    .order("created_at", { ascending: false });
  if (statusFilter) q = q.eq("status", statusFilter);
  if (sp?.tag) q = q.contains("tags", [sp.tag]);
  const { data: leadsRaw } = await q;
  const leads = (leadsRaw ?? []) as unknown as Lead[];

  const allTagsCount = new Map<string, number>();
  leads.forEach((l) => (l.tags ?? []).forEach((t) => allTagsCount.set(t, (allTagsCount.get(t) ?? 0) + 1)));

  const STATUS_TABS: { v: "" | "new" | "contacted" | "closed"; label: string }[] = [
    { v: "", label: "Tutti" },
    { v: "new", label: "Nuovi" },
    { v: "contacted", label: "Contattati" },
    { v: "closed", label: "Chiusi" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Lead</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutte le richieste di booking ricevute. Aggiorna stato e aggiungi tag per organizzare la
          pipeline.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-1 rounded-full bg-muted p-1 w-fit">
        {STATUS_TABS.map((s) => {
          const active = (sp?.status ?? "") === s.v;
          const params = new URLSearchParams();
          if (s.v) params.set("status", s.v);
          if (sp?.tag) params.set("tag", sp.tag);
          const href = params.toString() ? `/admin/leads?${params}` : "/admin/leads";
          return (
            <Link
              key={s.v || "all"}
              href={href}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium transition",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {allTagsCount.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Filtra per tag:
          </span>
          {[...allTagsCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([t, n]) => {
              const active = sp?.tag === t;
              const params = new URLSearchParams();
              if (sp?.status) params.set("status", sp.status);
              if (!active) params.set("tag", t);
              const href = params.toString() ? `/admin/leads?${params}` : "/admin/leads";
              return (
                <Link key={t} href={href}>
                  <Badge variant={active ? "dark" : "muted"}>
                    {t} · {n}
                  </Badge>
                </Link>
              );
            })}
        </div>
      )}

      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessun lead trovato per questo filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {leads.map((l) => (
            <Card key={l.id}>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div className="space-y-1.5 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("it-IT")}
                  </p>
                  <CardTitle className="text-lg">
                    {l.artists?.stage_name ?? l.contact_name ?? "—"}
                    {l.event_location ? (
                      <>
                        {" "}
                        <span className="text-muted-foreground font-normal">·</span> {l.event_location}
                      </>
                    ) : null}
                  </CardTitle>
                  {(l.event_date || l.budget != null) && (
                    <p className="text-sm text-muted-foreground">
                      {l.event_date ? `Data evento: ${new Date(l.event_date).toLocaleDateString("it-IT")}` : ""}
                      {l.budget != null ? `${l.event_date ? " · " : ""}Budget €${Number(l.budget).toFixed(2)}` : ""}
                    </p>
                  )}
                  {l.event_time && (
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5" /> {l.event_time}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={SOURCE_VARIANT[l.source ?? "booking"]}>
                    {SOURCE_LABEL[l.source ?? "booking"]}
                  </Badge>
                  <Badge variant={STATUS_VARIANT[l.status]} dot>
                    {STATUS_LABEL[l.status]}
                  </Badge>
                  <LeadStatusSelect leadId={l.id} status={l.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{l.message}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <a
                    href={`mailto:${l.contact_email}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Mail className="size-3.5" /> {l.contact_email}
                  </a>
                  {l.contact_phone && (
                    <a
                      href={`tel:${l.contact_phone}`}
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <Phone className="size-3.5" /> {l.contact_phone}
                    </a>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <LeadTagsEditor leadId={l.id} initialTags={l.tags ?? []} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
