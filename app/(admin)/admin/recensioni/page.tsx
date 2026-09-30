import Link from "next/link";
import { Inbox, Star } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { listAllFeedback, type AdminFeedbackRow } from "@/lib/feedback/queries";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FeedbackModerationButtons } from "@/components/admin/FeedbackModerationButtons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recensioni — N'arte Admin" };

type Stato = "visibili" | "nascoste" | "eliminate" | "tutte";
type SP = { stato?: string };

function isStato(v?: string): v is Stato {
  return v === "visibili" || v === "nascoste" || v === "eliminate" || v === "tutte";
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function statoDi(f: AdminFeedbackRow): {
  label: string;
  variant: "success" | "warning" | "danger";
} {
  if (f.deleted_at) return { label: "Eliminata", variant: "danger" };
  if (f.hidden) return { label: "Nascosta", variant: "warning" };
  return { label: "Visibile", variant: "success" };
}

function dataIt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("it-IT") : "—";
}

export default async function AdminRecensioniPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireAdminPageAccess("recensioni");
  const sp = await searchParams;
  const stato: Stato = isStato(sp.stato) ? sp.stato : "tutte";

  const { rows, error } = await listAllFeedback({ stato });

  const href = (s: Stato) => (s === "tutte" ? "/admin/recensioni" : `/admin/recensioni?stato=${s}`);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Recensioni</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Le recensioni degli organizzatori sugli artisti. Ogni intervento richiede una
          motivazione, che viene registrata e comunicata a autore e artista. Una recensione non si
          nasconde perché è negativa: solo se viola il Regolamento.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Stato:</span>
        <FilterChip href={href("tutte")} active={stato === "tutte"} label="Tutte" />
        <FilterChip href={href("visibili")} active={stato === "visibili"} label="Visibili" />
        <FilterChip href={href("nascoste")} active={stato === "nascoste"} label="Nascoste" />
        <FilterChip href={href("eliminate")} active={stato === "eliminate"} label="Eliminate" />
      </div>

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">
            Impossibile leggere le recensioni: {error}
          </CardContent>
        </Card>
      )}

      {!error && rows.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Inbox className="mx-auto mb-2 size-6 opacity-50" />
            Nessuna recensione con questo filtro.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((f) => {
          const st = statoDi(f);
          const moderata = f.moderated_at || f.moderation_reason;
          return (
            <Card key={f.id} className={f.deleted_at ? "opacity-70" : ""}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {f.artist_slug ? (
                        <Link href={`/artisti/${f.artist_slug}`} className="hover:underline">
                          {f.artist_name}
                        </Link>
                      ) : (
                        f.artist_name
                      )}{" "}
                      <span className="text-muted-foreground">
                        · recensito da {f.organizer_name}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Data evento {dataIt(f.event_date)} · scritta il {dataIt(f.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5" aria-label={`Voto ${f.rating} su 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-4 ${
                            n <= f.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <Badge variant={st.variant} dot>
                      {st.label}
                    </Badge>
                  </div>
                </div>

                <p className="whitespace-pre-wrap text-sm">{f.body}</p>

                {f.artist_reply && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">
                      Risposta dell&rsquo;artista · {dataIt(f.artist_reply_at)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{f.artist_reply}</p>
                  </div>
                )}

                {moderata && (
                  <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">
                        {f.deleted_at ? "Eliminata" : f.hidden ? "Oscurata" : "Ripristinata"}
                      </span>{" "}
                      il {dataIt(f.moderated_at)}
                      {f.moderated_by_name ? ` da ${f.moderated_by_name}` : ""}
                    </p>
                    {f.moderation_reason && (
                      <p className="mt-1 whitespace-pre-wrap">Motivo: {f.moderation_reason}</p>
                    )}
                  </div>
                )}

                <FeedbackModerationButtons
                  id={f.id}
                  hidden={f.hidden}
                  deleted={Boolean(f.deleted_at)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
