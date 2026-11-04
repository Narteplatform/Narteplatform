import Link from "next/link";
import { Mail } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TeamMessageHandledButton } from "@/components/admin/TeamMessageHandledButton";

export const metadata = { title: "Messaggi al team — N'arte Admin" };
export const dynamic = "force-dynamic";

type Riga = {
  id: string;
  user_id: string;
  artist_id: string | null;
  role: "artist" | "organizer";
  subject: string;
  body: string;
  created_at: string;
  handled_at: string | null;
};

/**
 * Messaggi inviati dalla pagina Consulente («Scrivi al team», 0076).
 * Si risponde per email (il pulsante apre la posta con l'indirizzo del
 * mittente); qui si tiene traccia di cosa e' stato gestito.
 */
export default async function AdminMessaggiTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  await requireAdminPageAccess("consulenza");
  const sp = await searchParams;
  const tutti = sp?.stato === "tutti";
  const admin = createAdminClient();

  let q = admin
    .from("team_messages")
    .select("id, user_id, artist_id, role, subject, body, created_at, handled_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!tutti) q = q.is("handled_at", null);
  const { data, error } = await q;

  const mancante = error?.code === "42P01" || error?.code === "PGRST205";
  const righe = (data ?? []) as Riga[];

  const userIds = [...new Set(righe.map((r) => r.user_id))];
  const artistIds = [...new Set(righe.map((r) => r.artist_id).filter((x): x is string => Boolean(x)))];
  const [{ data: profili }, { data: artisti }, utenti] = await Promise.all([
    userIds.length ? admin.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] }),
    artistIds.length ? admin.from("artists").select("id, stage_name").in("id", artistIds) : Promise.resolve({ data: [] }),
    Promise.all(userIds.map((id) => admin.auth.admin.getUserById(id).then((r) => r.data.user ?? null, () => null))),
  ]);
  const nomi = new Map((profili ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
  const palchi = new Map((artisti ?? []).map((a: { id: string; stage_name: string }) => [a.id, a.stage_name]));
  const email = new Map<string, string>();
  for (const u of utenti) if (u?.id && u.email) email.set(u.id, u.email);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight md:text-3xl">Messaggi al team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Arrivano dalla pagina Consulente degli artisti, anche quando non ci sono slot liberi.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/consulenza/messaggi"
            className={`rounded-full border px-3 py-1.5 ${!tutti ? "border-foreground font-medium" : "border-border text-muted-foreground"}`}
          >
            Da gestire
          </Link>
          <Link
            href="/admin/consulenza/messaggi?stato=tutti"
            className={`rounded-full border px-3 py-1.5 ${tutti ? "border-foreground font-medium" : "border-border text-muted-foreground"}`}
          >
            Tutti
          </Link>
        </div>
      </header>

      {mancante ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          La tabella dei messaggi non è ancora attiva (migration 0076). Nel frattempo i messaggi
          arrivano comunque per email alla casella del team.
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">Non è stato possibile leggere i messaggi.</p>
      ) : righe.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          {tutti ? "Nessun messaggio ricevuto." : "Nessun messaggio da gestire."}
        </p>
      ) : (
        <div className="space-y-3">
          {righe.map((m) => {
            const nome = nomi.get(m.user_id) || email.get(m.user_id) || "Utente";
            const profilo = m.artist_id ? palchi.get(m.artist_id) : null;
            const mail = email.get(m.user_id);
            return (
              <Card key={m.id} className={m.handled_at ? "opacity-60" : undefined}>
                <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{m.subject}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      da <span className="font-medium text-foreground">{nome}</span> ·{" "}
                      {m.role === "artist" ? (profilo ? `Artista «${profilo}»` : "Artista") : "Organizzatore"} ·{" "}
                      {new Date(m.created_at).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}
                    </p>
                  </div>
                  <Badge variant={m.handled_at ? "muted" : "accent"}>{m.handled_at ? "Gestito" : "Da gestire"}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-line text-sm">{m.body}</p>
                  <div className="flex flex-wrap gap-2">
                    {mail && (
                      <a
                        href={`mailto:${mail}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm hover:bg-muted"
                      >
                        <Mail className="size-4" aria-hidden="true" /> Rispondi per email
                      </a>
                    )}
                    <TeamMessageHandledButton id={m.id} gestito={Boolean(m.handled_at)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
