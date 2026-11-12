import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RequestActions } from "@/components/organizer/RequestActions";
import { TrattativaEmail } from "@/components/booking/TrattativaEmail";
import { RegistraAccordo } from "@/components/booking/RegistraAccordo";
import { minToBudgetLabel } from "@/lib/constants/budget-ranges";
import { openChatAndRedirect } from "@/lib/chat/open";
import { chatAttivaPerArtista, emailAccount } from "@/lib/chat/accesso";
import {
  accordoInAttesa,
  etichettaFascia,
  etichettaStatoOrganizzatore,
  formatDataIt,
  formatEuroIt,
} from "@/lib/booking/etichette";

export const dynamic = "force-dynamic";

export default async function OrganizerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organizer } = await requireOrganizer();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: req } = await admin
    .from("booking_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!req || req.organizer_id !== organizer.id) notFound();

  const [{ data: artist }, venueRes] = await Promise.all([
    admin
      .from("artists")
      .select("id, stage_name, slug, cover_image, city, user_id")
      .eq("id", req.artist_id)
      .maybeSingle(),
    req.venue_id
      ? admin
          .from("venues")
          .select("id, name, city, address")
          .eq("id", req.venue_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const venue = venueRes?.data ?? null;

  // Chat (artista Pro/Max) o email (artista Free), dal piano attuale.
  const chat = await chatAttivaPerArtista(req.artist_id);
  const canale = chat ? "chat" : "email";
  const trattativaEmail = !chat && req.status === "in_trattativa";
  const emailArtista = trattativaEmail ? await emailAccount(artist?.user_id) : null;
  const attendeArtista = accordoInAttesa(req);
  const chatDisponibile =
    chat && (req.status === "in_trattativa" || req.status === "accettata" || req.status === "confermata");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/organizzatore/richieste"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tutte le richieste
        </Link>
        <Badge
          variant={req.status === "confermata" ? "accent" : "default"}
          className="max-w-[260px] whitespace-normal text-right leading-tight"
        >
          {attendeArtista
            ? "Accordo registrato: attende la conferma dell'artista"
            : etichettaStatoOrganizzatore(req.status, canale)}
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <div className="size-16 overflow-hidden rounded-lg bg-muted">
            {artist?.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.cover_image} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div>
            <CardTitle className="font-display">
              {artist?.stage_name ?? "Artista"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {formatDataIt(req.event_date)}
              {req.time_slot ? ` · ${etichettaFascia(req.time_slot)}` : ""}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Messaggio inviato
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm">{req.message}</p>
          </div>

          {req.notes_artist && (
            <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-accent">
                Note dall'artista
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm">{req.notes_artist}</p>
            </div>
          )}

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {venue && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Struttura
                </span>
                <p>{venue.name}</p>
                <p className="text-muted-foreground">
                  {[venue.address, venue.city].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            {req.status === "confermata" && req.final_price != null ? (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Compenso concordato
                </span>
                <p className="font-medium">{formatEuroIt(req.final_price)}</p>
              </div>
            ) : req.budget_offer != null ? (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Range di budget
                </span>
                <p>{minToBudgetLabel(Number(req.budget_offer))}</p>
              </div>
            ) : null}
          </div>

          {req.status === "pending" && (
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              La richiesta è in attesa: quando l&apos;artista avvia la trattativa ricevi una notifica.
              {chat
                ? " Da quel momento potete accordarvi in chat."
                : " L'artista è sul piano Free: vi accorderete via email."}
            </p>
          )}

          {chatDisponibile && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
              {req.status === "in_trattativa" && (
                <p className="text-sm text-muted-foreground">
                  Accordatevi in chat: invia un&apos;offerta con data e compenso, o accetta quella
                  dell&apos;artista. La data si blocca quando uno dei due accetta l&apos;offerta
                  dell&apos;altro, al prezzo indicato.
                </p>
              )}
              {req.status === "accettata" && (
                <p className="text-sm text-muted-foreground">
                  L&apos;artista ha accettato la tua offerta: conferma la data qui sotto o dal riquadro
                  dell&apos;offerta in chat.
                </p>
              )}
              <form action={openChatAndRedirect}>
                <input type="hidden" name="artist_id" value={req.artist_id} />
                <input type="hidden" name="organizer_id" value={organizer.id} />
                <input type="hidden" name="base_path" value="/organizzatore/chat" />
                <Button type="submit" size="sm" variant={req.status === "confermata" ? "outline" : "default"}>
                  <MessageSquare className="size-4" /> Apri chat con l&apos;artista
                </Button>
              </form>
            </div>
          )}

          {trattativaEmail && (
            <>
              <TrattativaEmail
                ruolo="organizer"
                controparte={{ nome: artist?.stage_name ?? "l'artista", email: emailArtista }}
                oggetto={`Booking ${formatDataIt(req.event_date)} — ${artist?.stage_name ?? ""}`}
              />
              <RegistraAccordo
                requestId={req.id}
                dataIniziale={req.event_date}
                fasciaIniziale={req.time_slot}
                registrato={
                  attendeArtista
                    ? { data: req.event_date, fascia: req.time_slot, prezzo: Number(req.final_price) }
                    : null
                }
              />
            </>
          )}

          <RequestActions
            requestId={req.id}
            status={req.status}
            prezzo={req.final_price ?? req.budget_offer}
          />

          {artist && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/artisti/${artist.slug}`}>Vai al profilo artista</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
