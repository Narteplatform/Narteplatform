import "server-only";
import Stripe from "stripe";

/**
 * Client Stripe, lato server soltanto.
 *
 * Init lazy, stesso motivo di `getResend()` in lib/emails/send.ts: durante la
 * build di Vercel (collect page data) i moduli vengono valutati senza le env di
 * runtime. Istanziare Stripe a livello di modulo romperebbe il build ogni volta
 * che la chiave non è presente in quel contesto.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY non configurata: impossibile contattare Stripe. Vedi .env.local.example."
    );
  }
  _stripe = new Stripe(key, {
    // Versione API pinnata di proposito, e allineata a quella attesa da
    // stripe@22.3.2 (node_modules/stripe/cjs/apiVersion.js). Senza il pin, un
    // aggiornamento dell'SDK cambierebbe lo shape dei payload dei webhook sotto
    // i piedi — e un ledger di fatturazione non è il posto dove scoprirlo in
    // produzione. Aggiornandola, verificare prima gli eventi in test mode.
    apiVersion: "2026-06-24.dahlia",
    appInfo: { name: "N'arte", url: "https://narteofficial.it" },
  });
  return _stripe;
}

/** True se Stripe è configurata: la UI usa questo per non offrire checkout rotti. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
