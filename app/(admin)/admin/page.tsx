import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Image as ImageIcon, Inbox, UserPlus, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { HeroGreeting } from "@/components/dashboard/HeroGreeting";
import { ActivityList } from "@/components/dashboard/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatEventDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (user?.profile?.role === "consultant") {
    redirect("/admin/consulenza");
  }
  const supabase = createAdminClient();

  const [eventsRes, artistsRes, leadsRes, applicationsRes, recentEventsRes, recentLeadsRes, recentMessagesRes] =
    await Promise.all([
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("artists").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("artist_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("events")
        .select("id, slug, title, city, date, cover_image, category, featured")
        .order("date", { ascending: false })
        .limit(8),
      supabase
        .from("leads")
        .select("id, contact_email, event_location, message, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("contact_messages")
        .select("id, name, subject, message, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const newLeads = leadsRes.count ?? 0;
  const pendingApps = applicationsRes.count ?? 0;
  const recentEvents = recentEventsRes.data ?? [];

  const activityItems = [
    ...(recentLeadsRes.data ?? []).map((l) => ({
      kind: "lead" as const,
      id: l.id,
      primaryName: l.contact_email,
      detail: `${l.event_location || "—"} · ${l.message?.slice(0, 80) ?? ""}`,
      createdAt: l.created_at,
    })),
    ...(recentMessagesRes.data ?? []).map((m) => ({
      kind: "message" as const,
      id: m.id,
      primaryName: m.name,
      detail: `${m.subject ?? "Senza oggetto"} · ${m.message?.slice(0, 80) ?? ""}`,
      createdAt: m.created_at,
    })),
  ]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8);

  const heroDescription = (() => {
    const parts: string[] = [];
    if (newLeads > 0) parts.push(`${newLeads} nuov${newLeads === 1 ? "o lead" : "i lead"}`);
    if (pendingApps > 0)
      parts.push(`${pendingApps} candidatur${pendingApps === 1 ? "a" : "e"} da revisionare`);
    if (parts.length === 0) return "Tutto in ordine: nessuna richiesta in coda.";
    return `Hai ${parts.join(" e ")}.`;
  })();

  return (
    <div className="space-y-8">
      <HeroGreeting
        name={user?.profile?.full_name ?? user?.email?.split("@")[0]}
        description={heroDescription}
        primary={{ label: "Crea evento", href: "/admin/eventi/new" }}
        secondary={{ label: "Aggiungi artista", href: "/admin/artisti/new", icon: <UserPlus className="size-4" /> }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Eventi totali"
          value={eventsRes.count ?? 0}
          icon={<CalendarDays className="size-4" />}
          href="/admin/eventi"
        />
        <KpiCard
          label="Artisti approvati"
          value={artistsRes.count ?? 0}
          icon={<Users className="size-4" />}
          href="/admin/artisti?filter=approved"
        />
        <KpiCard
          label="Nuovi lead"
          value={newLeads}
          icon={<Inbox className="size-4" />}
          href="/admin/leads?status=new"
          sublabel={newLeads > 0 ? "Da contattare" : "Nessuno in attesa"}
        />
        <KpiCard
          label="Candidature in attesa"
          value={pendingApps}
          icon={<UserPlus className="size-4" />}
          href="/admin/artisti?filter=pending"
          sublabel={pendingApps > 0 ? "Da revisionare" : "Tutto evaso"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Eventi recenti</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/eventi">Tutti gli eventi</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun evento ancora pubblicato.</p>
            ) : (
              <ScrollArea snap className="-mx-2 px-2">
                <div className="flex gap-4 pb-2">
                  {recentEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/admin/eventi/${event.id}`}
                      className="group flex w-[220px] shrink-0 flex-col gap-3 snap-start"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-muted">
                        {event.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.cover_image}
                            alt={event.title}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="size-8" />
                          </div>
                        )}
                        {event.featured && (
                          <span className="absolute left-3 top-3">
                            <Badge variant="accent">In primo piano</Badge>
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-display text-sm leading-tight tracking-tight line-clamp-2">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatEventDate(event.date)} · {event.city}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>Attività recenti</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/leads">Tutti i lead</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <ActivityList items={activityItems} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
