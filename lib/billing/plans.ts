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
 *     TUTTI i profili ereditano i benefici del piano dell'account. MAX a 49,99€
 *     è di fatto il piano agenzia. Vedi 0042_subscriptions_per_account.sql:
 *     `subscriptions` è agganciata a user_id, e compute_artist_tier() risale
 *     dall'artista al suo proprietario.
 *
 * ⚠️  Un solo limite è duplicato in SQL, deliberatamente e con commento
 *     incrociato: il tetto profili artista (`artistProfilesMax` ↔
 *     `tier_artist_profiles_max()`, 0042), perché la quota ha una race che solo
 *     un trigger può chiudere. Il tetto video ha invece una porta d'ingresso
 *     separata (app/api/upload/video/route.ts) e la sua fonte resta
 *     lib/upload/video-limits.ts.
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
   * Badge "Verificato N'arte" sul profilo pubblico, incluso nel piano.
   *
   * È automatico e senza richiesta: qui "verificato" non attesta un controllo
   * documentale, attesta che dietro il profilo c'è un abbonamento attivo — cioè
   * un artista che sta lavorando sul serio, che è l'informazione che interessa
   * all'organizzatore quando sceglie fra venti schede. Non esiste nessuna
   * colonna `is_verified`: la fonte è solo il piano, e cambiarne la regola
   * significa cambiare questa riga e basta.
   */
  verifiedBadge: boolean;
  /** Etichetta "TOP Artist" oltre al Verificato. Esclusiva del piano Max. */
  topArtistBadge: boolean;
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
  /**
   * A quanti eventi N'arte il team candida l'artista ogni mese.
   *
   * È una PROMESSA OPERATIVA, non una funzione software: candida il team a
   * mano, non esiste (e non deve esistere) un bottone "candidati" da qualche
   * parte. Sostituisce il vecchio `eventApplicationsPerMonth`, che prometteva
   * un self-service mai costruito — niente tabella, niente UI, nessun
   * chiamante — e che quindi il listino vendeva a vuoto.
   *
   * Nessun enforcement lato codice: non c'è nulla da bloccare, semmai da
   * onorare. Il numero vive qui perché il listino lo mostri da una fonte sola.
   */
  narteEventPitchesPerMonth: number;
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
    verifiedBadge: false,
    topArtistBadge: false,
    venueProposalEmails: false,
    artistProfilesMax: 1,
    canSetPercorso: false,
    narteEventPitchesPerMonth: 0,
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
    verifiedBadge: true,
    topArtistBadge: false,
    venueProposalEmails: false,
    artistProfilesMax: 2,
    canSetPercorso: true,
    narteEventPitchesPerMonth: 0,
    consultationsPerMonth: 1,
    // Le statistiche del profilo sono un'esclusiva Max: è la leva che giustifica
    // il salto da 9,99€ a 49,99€ insieme a TOP Artist e ai 5 profili.
    stats: "none",
    statsWindowDays: 0,
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
    verifiedBadge: true,
    topArtistBadge: true,
    venueProposalEmails: true,
    artistProfilesMax: 5,
    canSetPercorso: true,
    narteEventPitchesPerMonth: 2,
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
// Badge del profilo pubblico
// =========================================
// Stanno qui e non in lib/billing/entitlements.ts per un motivo preciso: quel
// modulo è `server-only`, mentre metà delle superfici che mostrano i badge sono
// Client Component (ArtistsExplorer, SearchBar, ProfileDialog). Questo file è
// dati puri e si importa da entrambe le parti.

/** "Verificato N'arte": incluso in Pro e Max, senza richiesta né approvazione. */
export function hasVerifiedBadge(tier: ArtistTier | null | undefined): boolean {
  return ENTITLEMENTS[tier as ArtistTier]?.verifiedBadge === true;
}

/** "TOP Artist": esclusiva Max. */
export function hasTopArtistBadge(tier: ArtistTier | null | undefined): boolean {
  return ENTITLEMENTS[tier as ArtistTier]?.topArtistBadge === true;
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
  max: { month: 4999, year: 49999 },
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
 * Con il listino attuale vale ~58% su PRO (l'annuale costa quanto 5 mesi) e
 * ~17% su MAX. Su PRO è uno sconto molto aggressivo: di fatto il mensile
 * diventa una prova e l'annuale è il prezzo reale. Il badge del toggle mostra
 * la percentuale di PRO, la più rappresentativa.
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
 * abbonarsi un mese a 49,99€, incassarlo e disdire, con perdita netta a ogni
 * giro. A 499,99€ annuali il margine lo copre. Col mensile sceso da 99,99€ a
 * 49,99€ il margine di arbitraggio raddoppia: questo vincolo è ora ancora più
 * critico, non allentarlo.
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

/** Sottotitolo breve delle schede piano (home / card marketing). */
export const PLAN_TAGLINES: Record<ArtistTier, string> = {
  free: "Per iniziare a farti trovare.",
  pro: "Per ricevere più booking.",
  max: "Per chi fa dell'arte un lavoro.",
};

/**
 * Punti salienti mostrati dentro ogni scheda piano (vista a card della home).
 * Sono un estratto curato di PLAN_FEATURES, pensato per la lettura rapida: il
 * confronto completo resta la tabella su /prezzi.
 */
export const PLAN_CARD_HIGHLIGHTS: Record<ArtistTier, string[]> = {
  free: [
    "Profilo artista pubblico",
    "Calendario e richieste di booking illimitate",
    "3 foto e 1 video",
    "Supporto community",
  ],
  pro: [
    "Tutto del piano Free",
    "Chat privata con locali e organizzatori",
    "Recensioni e badge Verificato N'arte",
    "Fino a 10 foto e 3 video, 2 profili",
    "Priorità nei risultati di ricerca",
    "1 consulenza professionale al mese",
  ],
  max: [
    "Tutto del piano Pro",
    "Ti candidiamo a 2 eventi N'arte al mese",
    "Statistiche del profilo sull'ultimo anno",
    "Fino a 30 foto e 5 profili artista",
    "Shooting fotografico incluso (annuale)",
    "Top artist in evidenza e supporto prioritario",
  ],
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
    values: { free: false, pro: true, max: true },
    hint: "Incluso nei piani Pro e Max: il badge compare sul profilo pubblico senza doverlo richiedere.",
    primary: true,
  },
  {
    label: "TOP Artist in evidenza",
    values: { free: false, pro: false, max: true },
    hint: "Etichetta TOP sul profilo e fascia dedicata in cima alla pagina Artisti.",
    primary: true,
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
    label: "Eventi N'arte",
    values: { free: false, pro: false, max: "Ti candidiamo a 2 eventi al mese" },
    hint: "Ci pensiamo noi: il team ti candida agli eventi in linea con il tuo profilo, non devi cercarli tu.",
    primary: true,
  },
  {
    label: "Statistiche del profilo",
    values: { free: false, pro: false, max: "Ultimo anno" },
    hint: "Visite al profilo, quante arrivano da organizzatori, richieste ricevute e salvataggi.",
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
