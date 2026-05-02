import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { ApplicationActions } from "@/components/admin/ApplicationActions";
import { DeleteArtistButton } from "@/components/admin/DeleteArtistButton";

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-green-500/15 text-green-700 border-green-600/30",
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-600/30",
  rejected: "bg-red-500/15 text-red-700 border-red-600/30",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approvato",
  pending: "In attesa",
  rejected: "Rifiutato",
};

export default async function AdminArtistsPage() {
  const supabase = createAdminClient();
  const [{ data: applications }, { data: artists }] = await Promise.all([
    supabase
      .from("artist_applications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("artists")
      .select("id, slug, stage_name, status, city, cover_image")
      .order("stage_name"),
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
                <th className="w-16 p-3"></th>
                <th className="p-3">Nome d&apos;arte</th>
                <th className="p-3">Città</th>
                <th className="p-3">Stato</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {(artists ?? []).map((a) => {
                const initials = a.stage_name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const badge = STATUS_BADGE[a.status] ?? STATUS_BADGE.pending;
                return (
                  <tr key={a.id} className="border-t border-border align-middle">
                    <td className="p-3">
                      <div className="relative size-12 overflow-hidden rounded-full border border-border bg-muted">
                        {a.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.cover_image}
                            alt={a.stage_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-display text-xs uppercase text-muted-foreground">
                            {initials || "?"}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-medium">{a.stage_name}</td>
                    <td className="p-3">{a.city ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs uppercase tracking-wide ${badge}`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            a.status === "approved"
                              ? "bg-green-600"
                              : a.status === "pending"
                                ? "bg-yellow-600"
                                : "bg-red-600"
                          }`}
                        />
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/artisti/${a.id}`} className="underline">Modifica</Link>
                        <DeleteArtistButton artistId={a.id} artistName={a.stage_name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!artists || artists.length === 0) && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nessun artista nel roster.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
