import { Megaphone } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { entitlementsFor } from "@/lib/billing/plans";
import { logger } from "@/lib/logger";
import { colonnaAssente } from "@/lib/admin/schema-compat";
import {
  etichettaMese,
  meseCorrente,
  tabellaAssente,
  ultimiMesi,
} from "@/lib/referrals/periodo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ArtistTier } from "@/lib/supabase/types";

const dataIt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Rome",
});

/**
 * «Segnalazioni del tuo profilo»: solo per il piano Max. Mostra il mese in
 * corso (n/quota) e gli ultimi 12 mesi con data e NOME del destinatario, mai
 * l'email. Se il registro non esiste ancora (migration 0068) non mostra nulla:
 * per l'artista una sezione vuota è meglio di un avviso tecnico.
 */
export async function ProfileReferralsCard({
  artistId,
  tier,
}: {
  artistId: string;
  tier: ArtistTier;
}) {
  const quota = entitlementsFor(tier).profileReferralsPerMonth;
  if (quota <= 0) return null;

  const mesi = ultimiMesi(12);
  const admin = createAdminClient();
  type Riga = {
    id: string;
    created_at: string;
    recipient_name: string;
    period_month: string;
    organizer_id: string | null;
    venue_id: string | null;
    profile_id?: string | null;
  };
  const leggi = (colonne: string) =>
    admin
      .from("profile_referrals")
      .select(colonne)
      .eq("artist_id", artistId)
      .eq("email_status", "inviata")
      .in("period_month", mesi)
      .order("created_at", { ascending: false })
      .returns<Riga[]>();
  const COLONNE = "id, created_at, recipient_name, period_month, organizer_id, venue_id";
  let { data, error } = await leggi(`${COLONNE}, profile_id`);
  // profile_id arriva con la 0075.
  if (colonnaAssente(error, "profile_id")) ({ data, error } = await leggi(COLONNE));

  if (error) {
    if (tabellaAssente(error.code)) {
      logger.warn("dashboard/segnalazioni", "profile_referrals assente: applicare la migration 0068.");
    } else {
      logger.error("dashboard/segnalazioni", "lettura segnalazioni fallita:", error.message);
    }
    return null;
  }

  // Il nome di una persona privata non si mostra all'artista: è un dato
  // personale di un terzo. Le strutture restano visibili per nome.
  const orgIds = [...new Set((data ?? []).filter((r) => !r.venue_id && r.organizer_id).map((r) => r.organizer_id!))];
  const orgPrivati = new Set<string>();
  if (orgIds.length > 0) {
    const { data: orgs, error: orgErr } = await admin
      .from("organizers")
      .select("id, is_private")
      .in("id", orgIds);
    // Senza sapere chi è privato, si nascondono tutti i nomi degli organizzatori.
    for (const id of orgErr ? orgIds : (orgs ?? []).filter((o) => o.is_private).map((o) => o.id)) orgPrivati.add(id);
  }
  const righe = (data ?? []).map((r) => ({
    ...r,
    recipient_name:
      r.profile_id || (r.organizer_id && !r.venue_id && orgPrivati.has(r.organizer_id))
        ? "Un privato registrato"
        : r.recipient_name,
  }));
  const corrente = meseCorrente();
  const nelMese = righe.filter((r) => r.period_month === corrente).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-4" aria-hidden="true" />
          Segnalazioni del tuo profilo
        </CardTitle>
        <Badge variant={nelMese >= quota ? "success" : "warning"} dot>
          {etichettaMese(corrente)}: {nelMese}/{quota}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          N&apos;arte segnala il tuo profilo a strutture e privati in linea con te. Non tratta per te:
          se qualcuno è interessato ti contatta sulla piattaforma.
        </p>
        {righe.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna segnalazione negli ultimi 12 mesi.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {righe.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-medium">{r.recipient_name}</span>
                <span className="text-muted-foreground">{dataIt.format(new Date(r.created_at))}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
