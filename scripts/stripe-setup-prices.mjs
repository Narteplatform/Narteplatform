/**
 * Crea (o riusa) i prodotti e i price N'arte su Stripe, e stampa le env.
 *
 * Idempotente: si appoggia ai `lookup_key` dei price e ai metadata dei prodotti,
 * quindi rilanciarlo NON crea duplicati. Serve perché un price duplicato non si
 * può cancellare da Stripe — solo disattivare — e il listino resterebbe sporco
 * per sempre.
 *
 * Uso:
 *   node --env-file=.env.local scripts/stripe-setup-prices.mjs           # crea
 *   node --env-file=.env.local scripts/stripe-setup-prices.mjs --dry-run # mostra e basta
 *
 * Gli importi sono la fonte PLAN_PRICES_CENTS di lib/billing/plans.ts: se
 * cambiano lì, vanno ricreati i price qui (su Stripe un price è immutabile
 * nell'importo — si crea il nuovo e si archivia il vecchio).
 */
import Stripe from "stripe";

const dryRun = process.argv.includes("--dry-run");
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("❌ STRIPE_SECRET_KEY non configurata in .env.local");
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });

// Guardia: questo script non deve MAI girare per sbaglio sull'account live.
if (key.startsWith("sk_live_")) {
  console.error("🚨 Chiave LIVE rilevata. Questo script è pensato per il test mode.");
  console.error("   Per creare i price in produzione, fallo consapevolmente dalla dashboard Stripe.");
  process.exit(1);
}

const PLANS = [
  {
    tier: "pro",
    name: "N'arte Pro",
    description:
      "Chat con locali e organizzatori, recensioni, badge Verificato su richiesta, 10 foto, 3 video, 1 file audio, 2 profili artista, priorità nei risultati.",
    prices: [
      { interval: "month", amount: 999, lookup: "narte_pro_month", env: "STRIPE_PRICE_PRO_MONTH" },
      { interval: "year", amount: 4999, lookup: "narte_pro_year", env: "STRIPE_PRICE_PRO_YEAR" },
    ],
  },
  {
    tier: "max",
    name: "N'arte Max",
    description:
      "Tutto di Pro, più: top artist in evidenza, proposta alle strutture, 30 foto, 5 profili artista, consulenza illimitata. Shooting fotografico incluso nell'abbonamento annuale.",
    prices: [
      { interval: "month", amount: 9999, lookup: "narte_max_month", env: "STRIPE_PRICE_MAX_MONTH" },
      { interval: "year", amount: 49999, lookup: "narte_max_year", env: "STRIPE_PRICE_MAX_YEAR" },
    ],
  },
];

const eur = (c) => (c / 100).toFixed(2).replace(".", ",") + " €";
const envOut = {};

// `products.list` invece di `products.search`.
//
// L'indice di ricerca di Stripe è EVENTUALLY CONSISTENT: un prodotto appena
// creato non vi compare per qualche secondo. Usando search, un secondo lancio
// ravvicinato di questo script non trovava il prodotto e ne creava un duplicato
// — cosa che è successa davvero al primo test. `list` legge lo stato reale ed è
// fortemente consistente. Il filtro sui metadata si fa qui, su pochi oggetti.
const allProducts = (await stripe.products.list({ limit: 100 })).data;

for (const plan of PLANS) {
  let product = allProducts.find(
    (p) => p.metadata?.narte_tier === plan.tier && p.active
  );

  if (product) {
    console.log(`▷ Prodotto "${plan.name}" già presente → ${product.id}`);
  } else if (dryRun) {
    console.log(`▷ [dry-run] creerei il prodotto "${plan.name}"`);
    product = { id: "(dry-run)" };
  } else {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { narte_tier: plan.tier },
    });
    console.log(`✅ Prodotto creato "${plan.name}" → ${product.id}`);
  }

  for (const p of plan.prices) {
    const found = await stripe.prices.list({ lookup_keys: [p.lookup], limit: 1 });
    if (found.data[0]) {
      const price = found.data[0];
      // Un price su Stripe è immutabile: se l'importo diverge dal listino, non
      // si "aggiorna" — va creato un price nuovo e archiviato il vecchio.
      if (price.unit_amount !== p.amount) {
        console.log(
          `⚠️  ${p.lookup}: su Stripe ${eur(price.unit_amount)} ma il listino dice ${eur(p.amount)}.`
        );
        console.log(`    I price sono immutabili: crea un price nuovo e archivia ${price.id}.`);
      } else {
        console.log(`▷ Price ${p.lookup} già presente (${eur(price.unit_amount)}/${p.interval}) → ${price.id}`);
      }
      envOut[p.env] = price.id;
      continue;
    }

    if (dryRun) {
      console.log(`▷ [dry-run] creerei ${p.lookup} — ${eur(p.amount)}/${p.interval}`);
      envOut[p.env] = "(dry-run)";
      continue;
    }

    const price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: p.amount,
      recurring: { interval: p.interval },
      lookup_key: p.lookup,
      metadata: { narte_tier: plan.tier, narte_interval: p.interval },
    });
    console.log(`✅ Price creato ${p.lookup} — ${eur(p.amount)}/${p.interval} → ${price.id}`);
    envOut[p.env] = price.id;
  }
}

console.log("\n" + "=".repeat(60));
console.log("Env da mettere in .env.local:\n");
for (const [k, v] of Object.entries(envOut)) console.log(`${k}=${v}`);
console.log("=".repeat(60));
