import Link from "next/link";
import { AlertTriangle, Camera, Clock, ExternalLink, Gift } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { getOwnedArtists } from "@/lib/artist/current";
import { getAccountEntitlements } from "@/lib/billing/entitlements";
import {
  PLAN_LABELS,
  PLAN_PRICES_CENTS,
  formatPrice,
  includesPhotoShoot,
  isPaidTier,
  type BillingInterval,
} from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/stripe/client";
import { arePricesConfigured } from "@/lib/stripe/prices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SubscriptionPanel } from "@/components/billing/SubscriptionPanel";
import type { ArtistTier } from "@/lib/supabase/types";

export const metadata = { title: "Abbonamento — N'arte" };
export const dynamic = "force-dynamic";

type SubRow = {
  tier: ArtistTier;
  status: string;
  billing_interval: BillingInterval;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Attivo",
  trialing: "In prova",
  past_due: "Pagamento in sospeso",
  canceled: "Disdetto",
  unpaid: "Non pagato",
  incomplete: "Da completare",
  incomplete_expired: "Scaduto",
  paused: "In pausa",
};

const dt = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default async function AbbonamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireRole(["artist", "superadmin"]);
  const sp = await searchParams;

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("tier, status, billing_interval, current_period_end, cancel_at_period_end")
    .eq("user_id", user.id)
    .in("status", ["trialing", "active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1);
  const sub = ((data ?? []) as unknown as SubRow[])[0] ?? null;

  const ent = await getAccountEntitlements(user.id);
  const owned = await getOwnedArtists(user.id);
  const suspended = owned.filter((a) => a.plan_suspended);

  // Un piano può arrivare da Stripe oppure da un omaggio del superadmin (0044).
  // Senza questa distinzione la pagina mostrerebbe "N'arte Max" e, subito sotto,
  // "stai usando il piano gratuito" a chi ha ricevuto un omaggio.
  const { data: overrideRows } = await admin
    .from("artists")
    .select("tier_override, tier_override_expires_at, tier_override_reason")
    .eq("user_id", user.id)
    .not("tier_override", "is", null)
    .order("tier_override", { ascending: false })
    .limit(1);
  const override = ((overrideRows ?? []) as unknown as {
    tier_override: ArtistTier;
    tier_override_expires_at: string | null;
    tier_override_reason: string | null;
  }[])[0] ?? null;
  const activeOverride =
    override &&
    (!override.tier_override_expires_at ||
      new Date(override.tier_override_expires_at) > new Date())
      ? override
      : null;
  const isGifted = !sub && activeOverride !== null && isPaidTier(ent.tier);

  const configured = isStripeConfigured() && arePricesConfigured();

  // Il webhook può arrivare DOPO il redirect di Stripe: la pagina non assume
  // mai che il piano sia già attivo. Se torniamo dal checkout e il ledger non
  // ha ancora la riga, si mostra un'attesa esplicita invece di dire "Free" a
  // chi ha appena pagato.
  const justPaid = sp?.checkout === "success";
  const awaitingWebhook = justPaid && !sub;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Abbonamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Il piano vale per l&apos;intero account: tutti i tuoi profili artista ne ereditano i
          vantaggi.
        </p>
      </header>

      {awaitingWebhook && (
        <Card className="border-accent/40 bg-accent/[0.04]">
          <CardContent className="flex items-start gap-3 py-4">
            <Clock className="mt-0.5 size-4 shrink-0 text-accent" />
            <div>
              <p className="font-medium">Stiamo attivando il tuo piano</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Il pagamento è andato a buon fine. L&apos;attivazione richiede qualche secondo:
                ricarica la pagina fra poco. Se non cambia nulla entro qualche minuto, scrivici.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {sp?.checkout === "cancelled" && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Pagamento annullato. Non è stato addebitato nulla.
          </CardContent>
        </Card>
      )}

      {sub?.status === "past_due" && (
        <Card className="border-destructive/40 bg-destructive/[0.04]">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Pagamento non riuscito</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Non siamo riusciti ad addebitare il rinnovo. Il tuo piano resta attivo mentre
                riproviamo, ma aggiorna il metodo di pagamento per non perderlo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Piano corrente */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Il tuo piano</CardTitle>
          {sub ? (
            <Badge variant={sub.status === "past_due" ? "warning" : "success"}>
              {STATUS_LABEL[sub.status] ?? sub.status}
            </Badge>
          ) : isGifted ? (
            <Badge variant="success">Omaggio</Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-display text-2xl">{PLAN_LABELS[ent.tier]}</p>

          {sub ? (
            <>
              {isPaidTier(ent.tier) && (
                <p className="text-sm text-muted-foreground">
                  {formatPrice(PLAN_PRICES_CENTS[ent.tier][sub.billing_interval])} /{" "}
                  {sub.billing_interval === "month" ? "mese" : "anno"}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {sub.cancel_at_period_end
                  ? `Disdetto: resta attivo fino al ${dt(sub.current_period_end)}.`
                  : `Si rinnova il ${dt(sub.current_period_end)}.`}
              </p>
              {includesPhotoShoot(ent.tier, sub.billing_interval) && (
                <p className="flex items-center gap-2 pt-1 text-sm text-accent">
                  <Camera className="size-4" />
                  Shooting fotografico incluso — scrivici per fissarlo.
                </p>
              )}
            </>
          ) : isGifted ? (
            <>
              <p className="flex items-center gap-2 text-sm text-accent">
                <Gift className="size-4" />
                Piano assegnato dal team N&apos;arte.
              </p>
              <p className="text-sm text-muted-foreground">
                {activeOverride?.tier_override_expires_at
                  ? `Resta attivo fino al ${dt(activeOverride.tier_override_expires_at)}.`
                  : "Non ha scadenza e non prevede alcun addebito."}
                {activeOverride?.tier_override_reason
                  ? ` ${activeOverride.tier_override_reason}`
                  : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Stai usando il piano gratuito. Passa a Pro per la chat con gli organizzatori, le
              recensioni e il badge Verificato.
            </p>
          )}

          {suspended.length > 0 && (
            <p className="pt-2 text-sm text-muted-foreground">
              <strong>
                {suspended.length === 1
                  ? "1 profilo artista è sospeso"
                  : `${suspended.length} profili artista sono sospesi`}
              </strong>{" "}
              perché superano il limite del piano {PLAN_LABELS[ent.tier]}: non sono visibili sul
              sito, ma non sono stati cancellati e tornano online appena passi a un piano
              superiore.{" "}
              <Link href="/dashboard/profili" className="underline underline-offset-2">
                Vedi i profili
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {!configured ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            I pagamenti non sono ancora attivi su questo ambiente.
          </CardContent>
        </Card>
      ) : (
        <SubscriptionPanel currentTier={ent.tier} hasSubscription={Boolean(sub)} />
      )}

      <p className="text-center text-xs text-muted-foreground">
        Hai domande sui piani?{" "}
        <Link href="/prezzi" className="inline-flex items-center gap-1 underline underline-offset-2">
          Confronta i piani <ExternalLink className="size-3" />
        </Link>
      </p>
    </div>
  );
}
