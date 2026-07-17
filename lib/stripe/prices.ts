import "server-only";
import type { ArtistTier } from "@/lib/supabase/types";
import type { BillingInterval, PaidTier } from "@/lib/billing/plans";

/**
 * Mappa fra i piani N'arte e i Price di Stripe.
 *
 * ⚠️  I price id NON devono mai raggiungere il browser, e infatti nessuna di
 *     queste env è NEXT_PUBLIC_. Il client manda {tier, interval} e il server
 *     risolve l'id: se il client potesse passare un price id arbitrario,
 *     chiunque potrebbe aprire un checkout su un price da 0,50 € creato per
 *     test e ottenere Max. È lo stesso principio del tier, che è una cache
 *     scrivibile solo dal ledger.
 */

const ENV_BY_PLAN: Record<PaidTier, Record<BillingInterval, string>> = {
  pro: { month: "STRIPE_PRICE_PRO_MONTH", year: "STRIPE_PRICE_PRO_YEAR" },
  max: { month: "STRIPE_PRICE_MAX_MONTH", year: "STRIPE_PRICE_MAX_YEAR" },
};

/** Price id per un piano. Solleva se l'env manca: meglio un errore chiaro di un checkout muto. */
export function priceIdFor(tier: PaidTier, interval: BillingInterval): string {
  const envName = ENV_BY_PLAN[tier]?.[interval];
  const value = envName ? process.env[envName] : undefined;
  if (!value) {
    throw new Error(
      `Price Stripe non configurato per ${tier}/${interval}: manca ${envName}. Vedi .env.local.example.`
    );
  }
  return value;
}

/**
 * Dal price id al piano. Serve al webhook, che riceve da Stripe un price id e
 * deve sapere che tier scrivere nel ledger.
 *
 * Ritorna null per un price sconosciuto — es. un price vecchio dopo un cambio
 * di listino, o uno creato a mano in dashboard. Il chiamante deve trattarlo
 * come anomalia e NON declassare l'artista: un price non mappato è un problema
 * nostro, non suo.
 */
export function resolvePriceId(
  priceId: string
): { tier: PaidTier; interval: BillingInterval } | null {
  for (const tier of ["pro", "max"] as const) {
    for (const interval of ["month", "year"] as const) {
      if (process.env[ENV_BY_PLAN[tier][interval]] === priceId) return { tier, interval };
    }
  }
  return null;
}

/** True se tutti e 4 i price sono configurati. La UI non offre checkout senza. */
export function arePricesConfigured(): boolean {
  return (["pro", "max"] as const).every((t) =>
    (["month", "year"] as const).every((i) => Boolean(process.env[ENV_BY_PLAN[t][i]]))
  );
}

export function isPaidTierValue(v: string): v is PaidTier {
  return v === "pro" || v === "max";
}

export type { ArtistTier };
