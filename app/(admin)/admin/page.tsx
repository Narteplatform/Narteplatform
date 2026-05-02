import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const supabase = createAdminClient();
  const [eventsRes, artistsRes, leadsRes, applicationsRes] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("artists").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("artist_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const stats = [
    { label: "Eventi totali", value: eventsRes.count ?? 0, href: "/admin/eventi" },
    { label: "Artisti approvati", value: artistsRes.count ?? 0, href: "/admin/artisti" },
    { label: "Nuovi lead", value: leadsRes.count ?? 0, href: "/admin/leads" },
    { label: "Candidature in attesa", value: applicationsRes.count ?? 0, href: "/admin/artisti" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="display-xl text-4xl">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="block border border-border p-6 hover:border-foreground">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-4xl">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/admin/eventi/new" className="border border-foreground bg-foreground p-6 text-background hover:bg-foreground/90">
          <p className="font-display text-xl uppercase">+ Nuovo evento</p>
          <p className="mt-2 text-sm opacity-80">Crea un evento da pubblicare nel sito.</p>
        </Link>
        <Link href="/admin/artisti/new" className="border border-foreground p-6 hover:bg-muted">
          <p className="font-display text-xl uppercase">+ Nuovo artista</p>
          <p className="mt-2 text-sm text-muted-foreground">Aggiungi manualmente un artista al roster.</p>
        </Link>
        <Link href="/admin/leads" className="border border-foreground p-6 hover:bg-muted">
          <p className="font-display text-xl uppercase">Analizza i lead</p>
          <p className="mt-2 text-sm text-muted-foreground">Tutte le richieste di booking ricevute.</p>
        </Link>
      </div>
    </div>
  );
}
