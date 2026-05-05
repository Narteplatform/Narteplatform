import Link from "next/link";
import { Clock, Mail, Phone } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  new: "warning",
  contacted: "muted",
  closed: "success",
} as const;

const STATUS_LABEL = {
  new: "Nuova",
  contacted: "Contattata",
  closed: "Chiusa",
} as const;

const TABS: { v: "" | "new" | "contacted" | "closed"; label: string }[] = [
  { v: "", label: "Tutte" },
  { v: "new", label: "Nuove" },
  { v: "contacted", label: "Contattate" },
  { v: "closed", label: "Chiuse" },
];

export default async function ArtistLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireRole(["artist", "superadmin"]);
  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!artist) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nessun profilo artista collegato. Contatta l&apos;amministratore.
        </CardContent>
      </Card>
    );
  }

  const ALLOWED = ["new", "contacted", "closed"] as const;
  type S = (typeof ALLOWED)[number];
  const statusFilter: S | null =
    sp?.status && (ALLOWED as readonly string[]).includes(sp.status) ? (sp.status as S) : null;

  let q = supabase
    .from("leads")
    .select("*")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data: leads } = await q;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Le tue richieste</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutte le richieste di booking ricevute tramite la piattaforma.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-1 rounded-full bg-muted p-1 w-fit">
        {TABS.map((t) => {
          const active = (sp?.status ?? "") === t.v;
          const href = t.v ? `/dashboard/leads?status=${t.v}` : "/dashboard/leads";
          return (
            <Link
              key={t.v || "all"}
              href={href}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium transition",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {!leads || leads.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nessuna richiesta trovata.
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
                    {l.event_location} <span className="text-muted-foreground font-normal">·</span>{" "}
                    {new Date(l.event_date).toLocaleDateString("it-IT")}
                  </CardTitle>
                  {l.event_time && (
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-3.5" /> {l.event_time}
                    </p>
                  )}
                  {l.budget != null && (
                    <p className="text-sm text-muted-foreground">
                      Budget €{Number(l.budget).toFixed(2)}
                    </p>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[l.status as keyof typeof STATUS_VARIANT]} dot>
                  {STATUS_LABEL[l.status as keyof typeof STATUS_LABEL]}
                </Badge>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
