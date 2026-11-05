import { Megaphone } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { entitlementsFor } from "@/lib/billing/plans";
import { logger } from "@/lib/logger";
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
 * «Promozione del tuo profilo»: solo per il piano Max. Mostra il mese in corso
 * (n/quota) e gli invii degli ultimi 12 mesi con la sola data: il materiale è
 * inviato dal Team fuori dalla piattaforma e i destinatari restano riservati.
 * Se il registro non esiste ancora (migration 0068) non mostra nulla.
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
  const { data, error } = await admin
    .from("profile_referrals")
    .select("id, created_at, period_month")
    .eq("artist_id", artistId)
    .eq("email_status", "inviata")
    .in("period_month", mesi)
    .order("created_at", { ascending: false });

  if (error) {
    if (tabellaAssente(error.code)) {
      logger.warn("dashboard/segnalazioni", "profile_referrals assente: applicare la migration 0068.");
    } else {
      logger.error("dashboard/segnalazioni", "lettura segnalazioni fallita:", error.message);
    }
    return null;
  }

  const righe = data ?? [];
  const corrente = meseCorrente();
  const nelMese = righe.filter((r) => r.period_month === corrente).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-4" aria-hidden="true" />
          Promozione del tuo profilo
        </CardTitle>
        <Badge variant={nelMese >= quota ? "success" : "warning"} dot>
          {etichettaMese(corrente)}: {nelMese}/{quota}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ogni mese il Team invia per tuo conto materiale promozionale a strutture del settore, fuori
          dalla piattaforma. È pubblicità del tuo profilo, non una candidatura a eventi: N&apos;arte non
          tratta per te. Se una struttura è interessata ti contatta sulla piattaforma.
        </p>
        {righe.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun invio negli ultimi 12 mesi.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {righe.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="font-medium">Invio di materiale promozionale</span>
                <span className="text-muted-foreground">{dataIt.format(new Date(r.created_at))}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
