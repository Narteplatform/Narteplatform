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
 * Gli importi si leggono da PLAN_PRICES_CENTS in lib/billing/plans.ts, l'unica
 * fonte del listino: lo script non ha numeri suoi. Se il file non è leggibile
 * o l'oggetto non ha la forma attesa, lo script si ferma PRIMA di contattare
 * Stripe. Se cambiano lì, vanno ricreati i price qui (su Stripe un price è
 * immutabile nell'importo — si crea il nuovo e si archivia il vecchio).
 *
 * (Novembre 2026: lo script creava il Max mensile a 99,99 € mentre il listino
 * dice 49,99 €. Da qui la lettura diretta da plans.ts.)
 */
import Stripe from "stripe";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * PLAN_PRICES_CENTS letto dal sorgente TypeScript (lo script è .mjs e non può
 * importarlo). Forma attesa:
 *   pro: { month: 999, year: 4999 },
 *   max: { month: 4999, year: 49999 },
 */
function listinoDaPlans() {
  const percorso = fileURLToPath(new URL("../lib/billing/plans.ts", import.meta.url));
  const sorgente = readFileSync(percorso, "utf8");
  const blocco = /PLAN_PRICES_CENTS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(sorgente)?.[1];
  if (!blocco) throw new Error("PLAN_PRICES_CENTS non trovato in lib/billing/plans.ts");
  const listino = {};
  for (const tier of ["pro", "max"]) {
    const riga = new RegExp(`\\b${tier}\\s*:\\s*\\{\\s*month\\s*:\\s*(\\d+)\\s*,\\s*year\\s*:\\s*(\\d+)\\s*\\}`).exec(blocco);
    if (!riga) throw new Error(`Prezzi di "${tier}" non leggibili in PLAN_PRICES_CENTS`);
    listino[tier] = { month: Number(riga[1]), year: Number(riga[2]) };
    if (!(listino[tier].month > 0 && listino[tier].year > 0)) throw new Error(`Prezzi di "${tier}" non validi`);
  }
  return listino;
}

let LISTINO;
try {
  LISTINO = listinoDaPlans();
} catch (e) {
  console.error("❌ Listino non leggibile:", e instanceof Error ? e.message : e);
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("❌ STRIPE_SECRET_KEY non configurata in .env.local");
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });

// Guardia: con una chiave LIVE lo script crea prodotti/price VERI, che poi
// incasseranno denaro reale. Non deve mai partire in live per sbaglio, quindi
// serve il flag esplicito --live.
const allowLive = process.argv.includes("--live");
if (key.startsWith("sk_live_") && !allowLive) {
  console.error("🚨 Chiave LIVE rilevata. Questo crea i price in PRODUZIONE (denaro reale).");
  console.error("   Se è ciò che vuoi, rilancia con il flag esplicito:");
  console.error("     node --env-file=.env.local scripts/stripe-setup-prices.mjs --live");
  process.exit(1);
}
if (key.startsWith("sk_live_") && allowLive) {
  console.log("🔴 MODALITÀ LIVE — sto creando prodotti e price REALI sull'account di produzione.\n");
}

const PLANS = [
  {
    tier: "pro",
    name: "N'arte Pro",
    description:
      "Chat con locali e organizzatori, recensioni, badge Artista Pro, 10 foto, 3 video, 1 file audio, 2 profili artista, priorità nei risultati.",
    prices: [
      { interval: "month", amount: LISTINO.pro.month, lookup: "narte_pro_month", env: "STRIPE_PRICE_PRO_MONTH" },
      { interval: "year", amount: LISTINO.pro.year, lookup: "narte_pro_year", env: "STRIPE_PRICE_PRO_YEAR" },
    ],
  },
  {
    tier: "max",
    name: "N'arte Max",
    description:
      "Tutto di Pro, più: top artist in evidenza, promozione del profilo presso le strutture, 30 foto, 5 profili artista, consulenza senza limite mensile (in base agli slot). Shooting fotografico incluso nel primo anno dell'abbonamento annuale.",
    prices: [
      { interval: "month", amount: LISTINO.max.month, lookup: "narte_max_month", env: "STRIPE_PRICE_MAX_MONTH" },
      { interval: "year", amount: LISTINO.max.year, lookup: "narte_max_year", env: "STRIPE_PRICE_MAX_YEAR" },
    ],
  },
];

const eur = (c) => (c / 100).toFixed(2).replace(".", ",") + " €";
const envOut = {};

console.log("Listino da lib/billing/plans.ts:");
for (const plan of PLANS) for (const p of plan.prices) console.log(`  ${p.lookup}: ${eur(p.amount)}/${p.interval}`);
console.log("");

// Controllo di coerenza sulle env già configurate: un price id in env con un
// importo diverso dal listino è esattamente il problema che si vuole evitare.
let incoerenze = 0;
for (const plan of PLANS) {
  for (const p of plan.prices) {
    const id = process.env[p.env];
    if (!id) continue;
    try {
      const price = await stripe.prices.retrieve(id);
      if (price.unit_amount !== p.amount || price.recurring?.interval !== p.interval) {
        incoerenze++;
        console.log(
          `⚠️  ${p.env}=${id}: su Stripe ${eur(price.unit_amount ?? 0)}/${price.recurring?.interval ?? "?"}, listino ${eur(p.amount)}/${p.interval}.`
        );
      }
    } catch (e) {
      incoerenze++;
      console.log(`⚠️  ${p.env}=${id}: non leggibile su Stripe (${e instanceof Error ? e.message : e}).`);
    }
  }
}
if (incoerenze > 0) {
  console.log(`\n⚠️  ${incoerenze} price in env non coerenti con il listino: il checkout addebiterebbe un importo diverso da quello mostrato.\n`);
}

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
