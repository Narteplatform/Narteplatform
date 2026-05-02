import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { ApplicationActions } from "@/components/admin/ApplicationActions";

export default async function AdminArtistsPage() {
  const supabase = await createClient();
  const [{ data: applications }, { data: artists }] = await Promise.all([
    supabase
      .from("artist_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("artists").select("id, slug, stage_name, status, city").order("stage_name"),
  ]);

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="display-xl text-4xl">Artisti</h1>
        <Button asChild><Link href="/admin/artisti/new">+ Nuovo artista</Link></Button>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-2xl uppercase">Candidature in attesa</h2>
        {!applications || applications.length === 0 ? (
          <p className="text-muted-foreground">Nessuna candidatura in attesa.</p>
        ) : (
          <ul className="space-y-3">
            {applications.map((a) => (
              <li key={a.id} className="border border-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg uppercase">{a.stage_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {a.name} · {a.email} · {a.genre.join(", ")}
                    </p>
                    {a.bio && <p className="mt-2 text-sm">{a.bio}</p>}
                  </div>
                  <ApplicationActions applicationId={a.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl uppercase">Roster</h2>
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-3">Nome d&apos;arte</th>
                <th className="p-3">Città</th>
                <th className="p-3">Stato</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {(artists ?? []).map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 font-medium">{a.stage_name}</td>
                  <td className="p-3">{a.city ?? "—"}</td>
                  <td className="p-3 uppercase text-xs">{a.status}</td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/artisti/${a.id}`} className="underline">Modifica</Link>
                  </td>
                </tr>
              ))}
              {(!artists || artists.length === 0) && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nessun artista nel roster.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
