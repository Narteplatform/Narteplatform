/**
 * Matrice dei piani N'arte — FONTE UNICA.
 *
 * Dati puri: nessun import server, nessun accesso al DB. Importabile tanto dai
 * Server Component quanto dai Client Component. È l'unico posto dove i limiti
 * dei piani sono scritti: pricing pubblico, dashboard abbonamento, upsell
 * contestuali ed enforcement leggono tutti da qui.
 *
 * ⚠️  L'ABBONAMENTO È DELL'ACCOUNT, NON DEL SINGOLO ARTISTA.
 *     Un account PRO può creare 2 profili artista, uno MAX ne può creare 5, e
 *     TUTTI i profili ereditano i benefici del piano dell'account. MAX a 99,99€
 *     è di fatto il piano agenzia. Vedi 0042_subscriptions_per_account.sql:
 *     `subscriptions` è agganciata a user_id, e compute_artist_tier() risale
 *     dall'artista al suo proprietario.
 *
 * ⚠️  Due limiti sono duplicati in SQL, deliberatamente e con commento
 *     incrociato: il tetto video (ha una porta d'ingresso separata,
 *     app/api/upload/video/route.ts) e la quota candidature (ha una race che
 *     solo un trigger può chiudere). Se cambi `videoMax` o
 *     `eventApplicationsPerMonth` qui, allinea le funzioni SQL corrispondenti.
 *
 * Contesto strategico. I booking non sono mai limitati, su nessun piano: le
 * richieste in entrata sono domanda che la piattaforma fatica ad attrarre, e
 * bloccarle punirebbe l'organizzatore che scrive e non riceve risposta. Il
 * paywall scatta un passo dopo, sulla CHAT: l'artista Free riceve la richiesta
 * e la mail, ma per negoziare passa a Pro. È il momento di massimo valore
 * percepito — c'è un lavoro vero dall'altra parte del messaggio.
 */

import type { ArtistTier } from "@/lib/supabase/types";
import { MAX_VIDEO_PER_ARTIST } from "@/lib/upload/video-limits";

/**
 * Sentinella per "nessun limite".
 *
 * ⚠️  `JSON.stringify(Infinity)` produce `null`. Non passare mai un oggetto
 *     Entitlements come prop da un Server Component a un Client Component: il
 *     limite arriverebbe come `null` e ogni confronto `next > limit`
 *     diventerebbe `next > 0`, cioè "tutto vietato". Usare `isUnlimited()` /
 *     `formatLimit()` e serializzare stringhe o booleani.
 */
export const UNLIMITED = Number.POSITIVE_INFINITY;

export type StatsLevel = "none" | "basic" | "advanced";
export type SupportLevel = "community" | "email" | "priority";

/** 0 = standard, 1 = priorità, 2 = top artist in evidenza. */
export type SearchRank = 0 | 1 | 2;

export type BillingInterval = "month" | "year";

export type Entitlements = {
  tier: ArtistTier;

  // --- Media del profilo ---
  /** Foto pubblicate nella gallery. */
  galleryMax: number;
  /**
   * Video pubblicati.
   * Il tetto di 3 su Pro/Max non è una leva commerciale ma un vincolo di costo:
   * l'egress Supabase si paga a consumo e un video guardato costa la sua intera
   * dimensione in banda. La motivazione sta in lib/upload/video-limits.ts, che
   * resta la fonte del numero.
   */
  videoMax: number;
  /** Tracce audio pubblicate. L'audio è una feature Pro: 0 su Free. */
  audioMax: number;

  // --- Relazione con gli organizzatori ---
  /**
   * Chat e negoziazione. È il paywall principale.
   * Free NON può rispondere: la conversazione si apre lo stesso (l'organizzatore
   * non deve mai sbattere contro un muro), l'artista riceve la mail di notifica,
   * e per leggere/rispondere passa a Pro.
   */
  canUseChat: boolean;
  /** Ricevere e mostrare recensioni post-evento sul profilo pubblico. */
  canReceiveReviews: boolean;
  /** Richieste di booking: mai limitate, su nessun piano. Vedi nota in testa. */
  bookingsPerMonth: number;

  // --- Visibilità ---
  searchRank: SearchRank;
  /**
   * Se il piano dà diritto a RICHIEDERE la verifica, non a ottenerla.
   * La concessione resta del superadmin: un badge che si compra non verifica
   * nulla, e a 9,99€/mese "Verificato" perderebbe ogni significato verso gli
   * organizzatori — cioè verso l'unico pubblico a cui serve.
   */
  verifiedBadgeEligible: boolean;
  /**
   * L'artista entra nella coda delle proposte che il team N'arte invia a mano
   * alle strutture dall'area admin. Non è un invio automatico: mail non
   * richieste ai locali brucerebbero la reputazione del dominio.
   */
  venueProposalEmails: boolean;

  // --- Account ---
  /** Quanti profili artista può creare l'account. L'abbonamento è dell'account. */
  artistProfilesMax: number;

  // --- Strumenti ---
  canSetPercorso: boolean;
  eventApplicationsPerMonth: number;
  consultationsPerMonth: number;
  stats: StatsLevel;
  /** Giorni di storico visibili nelle statistiche. 0 se `stats === "none"`. */
  statsWindowDays: number;
  support: SupportLevel;
};

export const ENTITLEMENTS: Record<ArtistTier, Entitlements> = {
  free: {
    tier: "free",
    galleryMax: 3,
    videoMax: 1,
    audioMax: 0,
    canUseChat: false,
    canReceiveReviews: false,
    bookingsPerMonth: UNLIMITED,
    searchRank: 0,
    verifiedBadgeEligible: false,
    venueProposalEmails: false,
    artistProfilesMax: 1,
    canSetPercorso: false,
    eventApplicationsPerMonth: 2,
    consultationsPerMonth: 0,
    stats: "none",
    statsWindowDays: 0,
    support: "community",
  },
  pro: {
    tier: "pro",
    galleryMax: 10,
    videoMax: MAX_VIDEO_PER_ARTIST,
    audioMax: 1,
    canUseChat: true,
    canReceiveReviews: true,
    bookingsPerMonth: UNLIMITED,
    searchRank: 1,
    verifiedBadgeEligible: true,
    venueProposalEmails: false,
    artistProfilesMax: 2,
    canSetPercorso: true,
    eventApplicationsPerMonth: UNLIMITED,
    consultationsPerMonth: 1,
    stats: "basic",
    statsWindowDays: 30,
    support: "email",
  },
  max: {
    tier: "max",
    galleryMax: 30,
    videoMax: MAX_VIDEO_PER_ARTIST,
    audioMax: 1,
    canUseChat: true,
    canReceiveReviews: true,
    bookingsPerMonth: UNLIMITED,
    searchRank: 2,
    verifiedBadgeEligible: true,
    venueProposalEmails: true,
    artistProfilesMax: 5,
    canSetPercorso: true,
    eventApplicationsPerMonth: UNLIMITED,
    consultationsPerMonth: UNLIMITED,
    stats: "advanced",
    statsWindowDays: 365,
    support: "priority",
  },
};

export function entitlementsFor(tier: ArtistTier): Entitlements {
  return ENTITLEMENTS[tier] ?? ENTITLEMENTS.free;
}

export function isUnlimited(n: number): boolean {
  return !Number.isFinite(n);
}

export function formatLimit(n: number, unlimitedLabel = "illimitate"): string {
  return isUnlimited(n) ? unlimitedLabel : String(n);
}

// =========================================
// Prezzi
// =========================================
// In centesimi: i float non si usano per il denaro (0.1 + 0.2 !== 0.3), e
// Stripe stessa ragiona in unità minime.
// Questi valori servono SOLO a mostrare il listino. L'importo realmente
// addebitato è quello del Price su Stripe: se i due divergono vince Stripe, e
// il sito mostrerebbe un prezzo falso. Al primo scostamento, allineare qui.
export const PLAN_PRICES_CENTS: Record<ArtistTier, Record<BillingInterval, number>> = {
  free: { month: 0, year: 0 },
  pro: { month: 999, year: 4999 },
  max: { month: 9999, year: 49999 },
};

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Sconto dell'annuale rispetto a 12 mensilità, in percentuale intera.
 * Con il listino attuale è ~58% su entrambi i piani: l'annuale costa quanto 5
 * mesi. È uno sconto molto aggressivo — di fatto il mensile diventa una prova e
 * l'annuale è il prezzo reale.
 */
export function annualDiscountPercent(tier: ArtistTier): number {
  const { month, year } = PLAN_PRICES_CENTS[tier];
  if (!month || !year) return 0;
  return Math.round((1 - year / (month * 12)) * 100);
}

/**
 * Lo shooting fotografico è incluso SOLO nel MAX annuale.
 *
 * Non è una scelta estetica: su MAX mensile sarebbe arbitraggio puro. Uno
 * shooting costa a N'arte diverse centinaia di euro; chiunque potrebbe
 * abbonarsi un mese a 99,99€, incassarlo e disdire, con perdita netta a ogni
 * giro. A 499,99€ annuali il margine lo copre.
 *
 * Per questo NON è un campo di `Entitlements`: non dipende solo dal piano ma
 * anche dall'intervallo di fatturazione, che vive sulla subscription.
 */
export function includesPhotoShoot(tier: ArtistTier, interval: BillingInterval): boolean {
  return tier === "max" && interval === "year";
}

export const PLAN_LABELS: Record<ArtistTier, string> = {
  free: "N'arte Free",
  pro: "N'arte Pro",
  max: "N'arte Max",
};

/** Etichetta breve per i badge (FREE / PRO / MAX). */
export const PLAN_SHORT_LABELS: Record<ArtistTier, string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
};

/**
 * Variante del <Badge> per ciascun piano. Una sola definizione alimenta il
 * badge del roster admin, dell'overview artista e della pillola profilo.
 */
export const PLAN_BADGE_VARIANT: Record<ArtistTier, "muted" | "default" | "accent"> = {
  free: "muted",
  pro: "default",
  max: "accent",
};

export const PAID_TIERS = ["pro", "max"] as const;
export type PaidTier = (typeof PAID_TIERS)[number];

export function isPaidTier(tier: ArtistTier): tier is PaidTier {
  return tier === "pro" || tier === "max";
}

/**
 * Righe della tabella comparativa. Alimenta /prezzi, /dashboard/abbonamento e
 * gli upsell: una sola definizione, tre superfici.
 */
export type PlanFeatureRow = {
  label: string;
  /** `false` rende un trattino, `true` una spunta. */
  values: Record<ArtistTier, string | boolean>;
  hint?: string;
  /**
   * Riga-differenziatore, mostrata sempre nella vista compatta della tabella.
   * Le righe senza `primary` (in genere uguali su tutti i piani) restano dietro
   * il toggle "Mostra tutte le funzioni".
   */
  primary?: boolean;
};

export const PLAN_FEATURES: PlanFeatureRow[] = [
  {
    label: "Profilo artista pubblico",
    values: { free: true, pro: true, max: true },
  },
  {
    label: "Area riservata",
    values: { free: true, pro: true, max: true },
  },
  {
    label: "Calendario booking",
    values: { free: true, pro: true, max: true },
  },
  {
    label: "Richieste di booking",
    values: { free: "Illimitate", pro: "Illimitate", max: "Illimitate" },
    hint: "Nessun limite su nessun piano: le richieste degli organizzatori non vengono mai bloccate.",
  },
  {
    label: "Mail automatiche sulle richieste",
    values: { free: true, pro: true, max: true },
  },
  {
    label: "Foto in gallery",
    values: { free: "3", pro: "Fino a 10", max: "Fino a 30" },
    primary: true,
  },
  {
    label: "Video",
    values: { free: "1", pro: "Fino a 3", max: "Fino a 3" },
    primary: true,
  },
  {
    label: "File audio",
    values: { free: false, pro: "1", max: "1" },
  },
  {
    label: "Chat privata con locali e organizzatori",
    values: { free: false, pro: true, max: true },
    hint: "Con il piano Free ricevi la richiesta e la mail, ma per negoziare in chat serve Pro.",
    primary: true,
  },
  {
    label: "Sistema di recensioni",
    values: { free: false, pro: true, max: true },
    primary: true,
  },
  {
    label: "Verificato N'arte",
    values: { free: false, pro: "Su richiesta", max: "Su richiesta" },
    hint: "Il piano sblocca la richiesta di verifica; il team N'arte la valuta e la concede.",
  },
  {
    label: "Profili artista creabili",
    values: { free: "1", pro: "2", max: "5" },
    hint: "L'abbonamento è dell'account: tutti i profili che crei ereditano i benefici del piano.",
    primary: true,
  },
  {
    label: "Posizione nei risultati",
    values: { free: "Standard", pro: "Priorità", max: "Top artist in evidenza" },
    primary: true,
  },
  {
    label: "Percorso artistico",
    values: { free: false, pro: true, max: true },
    hint: "Cover artist, tribute band o progetto inedito sul profilo pubblico.",
  },
  {
    label: "Candidature a eventi N'arte",
    values: { free: "2 al mese", pro: "Illimitate", max: "Illimitate" },
    hint: "Le candidature ritirate rientrano comunque nel conteggio del mese.",
    primary: true,
  },
  {
    label: "Statistiche del profilo",
    values: { free: false, pro: "Ultimi 30 giorni", max: "Ultimo anno" },
    hint: "Il piano Max mostra anche quanti organizzatori hanno visitato il profilo.",
    primary: true,
  },
  {
    label: "Consulenza professionale",
    values: { free: false, pro: "1 slot al mese", max: "Illimitata" },
    primary: true,
  },
  {
    label: "Proposta alle strutture",
    values: { free: false, pro: false, max: true },
    hint: "Il team N'arte propone l'artista ai locali in target.",
    primary: true,
  },
  {
    label: "Shooting fotografico",
    values: { free: false, pro: false, max: "Incluso nell'annuale" },
    hint: "Una tantum, riservato all'abbonamento Max annuale.",
    primary: true,
  },
  {
    label: "Supporto",
    values: { free: "Community", pro: "Email", max: "Prioritario" },
    primary: true,
  },
];
