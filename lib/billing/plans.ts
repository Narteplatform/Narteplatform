/**
 * Matrice dei piani artista — FONTE UNICA.
 *
 * Questo file è dati puri: nessun import server, nessun accesso al DB. È
 * importabile tanto dai Server Component quanto dai Client Component, ed è
 * l'unico posto dove i limiti dei piani sono scritti. Pricing pubblico,
 * dashboard abbonamento, upsell contestuali ed enforcement leggono tutti da qui.
 *
 * ⚠️  Due limiti sono duplicati in SQL, deliberatamente e con commento
 *     incrociato: il tetto video (ha una porta d'ingresso separata,
 *     app/api/upload/video/route.ts) e la quota candidature (ha una race che
 *     solo un trigger può chiudere). Se cambi `videoMax` o
 *     `eventApplicationsPerMonth` qui, allinea anche le funzioni SQL
 *     `tier_video_max()` e `tier_event_applications_max()`.
 *
 * Contesto strategico (deciso col cliente): i booking NON sono mai limitati,
 * su nessun piano. Limitare le richieste in entrata punirebbe l'organizzatore
 * che scrive e non riceve risposta — cioè la domanda che la piattaforma fatica
 * ad attrarre. Di conseguenza la leva di conversione è la SCOPERTA (searchRank),
 * la CREDIBILITÀ (badge) e gli STRUMENTI (media, stats, consulenza).
 */

import type { ArtistTier } from "@/lib/supabase/types";
import { MAX_VIDEO_PER_ARTIST } from "@/lib/upload/video-limits";

/**
 * Sentinella per "nessun limite".
 *
 * ⚠️  `JSON.stringify(Infinity)` produce `null`. Non passare mai un oggetto
 *     Entitlements come prop da un Server Component a un Client Component:
 *     il limite arriverebbe come `null` e ogni confronto `next > limit`
 *     diventerebbe `next > 0`, cioè "tutto vietato". Usare sempre
 *     `isUnlimited()` / `formatLimit()` e serializzare stringhe o booleani.
 */
export const UNLIMITED = Number.POSITIVE_INFINITY;

export type StatsLevel = "none" | "basic" | "advanced";
export type SupportLevel = "community" | "email" | "priority";

/** 0 = standard, 1 = priorità, 2 = top + featured. Ordine crescente di visibilità. */
export type SearchRank = 0 | 1 | 2;

export type Entitlements = {
  tier: ArtistTier;
  /** Foto pubblicate nella gallery del profilo. */
  galleryMax: number;
  /** Tracce audio pubblicate. */
  audioMax: number;
  /**
   * Video pubblicati. 0 su free = i video sono una feature Pro.
   *
   * Pro e Max condividono lo stesso tetto (MAX_VIDEO_PER_ARTIST) perché quel
   * numero non è una leva commerciale ma un vincolo di costo: l'egress di
   * Supabase si paga a consumo e un video guardato costa la sua intera
   * dimensione in banda. La motivazione sta in lib/upload/video-limits.ts, che
   * resta la fonte del numero — alzarlo è una decisione economica, non di piano.
   */
  videoMax: number;
  /** Campo `percorso_artistico` (cover artist / tribute band / progetto inedito). */
  canSetPercorso: boolean;
  /** Candidature agli eventi N'arte, per mese solare (fuso Europe/Rome). */
  eventApplicationsPerMonth: number;
  /** Prenotazioni di consulenza col team, per mese solare. */
  consultationsPerMonth: number;
  stats: StatsLevel;
  /** Giorni di storico visibili nelle statistiche. 0 se `stats === "none"`. */
  statsWindowDays: number;
  /** Se il piano dà diritto a RICHIEDERE la verifica (non a ottenerla). */
  verifiedBadgeEligible: boolean;
  searchRank: SearchRank;
  support: SupportLevel;
};

export const ENTITLEMENTS: Record<ArtistTier, Entitlements> = {
  free: {
    tier: "free",
    galleryMax: 3,
    audioMax: 1,
    videoMax: 0,
    canSetPercorso: false,
    eventApplicationsPerMonth: 2,
    consultationsPerMonth: 0,
    stats: "none",
    statsWindowDays: 0,
    verifiedBadgeEligible: false,
    searchRank: 0,
    support: "community",
  },
  pro: {
    tier: "pro",
    galleryMax: UNLIMITED,
    audioMax: UNLIMITED,
    videoMax: MAX_VIDEO_PER_ARTIST,
    canSetPercorso: true,
    eventApplicationsPerMonth: UNLIMITED,
    consultationsPerMonth: 1,
    stats: "basic",
    statsWindowDays: 30,
    verifiedBadgeEligible: false,
    searchRank: 1,
    support: "email",
  },
  max: {
    tier: "max",
    galleryMax: UNLIMITED,
    audioMax: UNLIMITED,
    videoMax: MAX_VIDEO_PER_ARTIST,
    canSetPercorso: true,
    eventApplicationsPerMonth: UNLIMITED,
    consultationsPerMonth: UNLIMITED,
    stats: "advanced",
    statsWindowDays: 365,
    verifiedBadgeEligible: true,
    searchRank: 2,
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

export const PLAN_LABELS: Record<ArtistTier, string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
};

export const PAID_TIERS = ["pro", "max"] as const;
export type PaidTier = (typeof PAID_TIERS)[number];

export type BillingInterval = "month" | "year";

export function isPaidTier(tier: ArtistTier): tier is PaidTier {
  return tier === "pro" || tier === "max";
}

/**
 * Righe della tabella comparativa. Alimenta /prezzi, /dashboard/abbonamento e
 * la scheda piano nell'area admin: una sola definizione, tre superfici.
 * L'ordine è quello di lettura, dal valore più concreto al più accessorio.
 */
export type PlanFeatureRow = {
  label: string;
  /** Testo per cella. `false` rende un trattino, `true` una spunta. */
  values: Record<ArtistTier, string | boolean>;
  hint?: string;
};

export const PLAN_FEATURES: PlanFeatureRow[] = [
  {
    label: "Profilo pubblico",
    values: { free: "Base", pro: "Completo", max: "Completo" },
  },
  {
    label: "Foto in gallery",
    values: { free: "3", pro: "Illimitate", max: "Illimitate" },
  },
  {
    label: "Tracce audio",
    values: { free: "1", pro: "Illimitate", max: "Illimitate" },
  },
  {
    label: "Video",
    values: { free: false, pro: "Fino a 3", max: "Fino a 3" },
  },
  {
    label: "Percorso artistico",
    values: { free: false, pro: true, max: true },
    hint: "Cover artist, tribute band o progetto inedito sul profilo pubblico.",
  },
  {
    label: "Richieste di booking",
    values: { free: "Illimitate", pro: "Illimitate", max: "Illimitate" },
    hint: "Nessun limite su nessun piano: le richieste degli organizzatori non vengono mai bloccate.",
  },
  {
    label: "Chat e negoziazione",
    values: { free: "Illimitata", pro: "Illimitata", max: "Illimitata" },
  },
  {
    label: "Candidature a eventi N'arte",
    values: { free: "2 al mese", pro: "Illimitate", max: "Illimitate" },
    hint: "Le candidature ritirate rientrano comunque nel conteggio del mese.",
  },
  {
    label: "Statistiche del profilo",
    values: { free: false, pro: "Ultimi 30 giorni", max: "Ultimo anno" },
    hint: "Il piano Max mostra anche quanti organizzatori hanno visitato il profilo.",
  },
  {
    label: "Posizione nei risultati",
    values: { free: "Standard", pro: "Priorità", max: "In cima + in evidenza" },
  },
  {
    label: "Badge Verificato",
    values: { free: false, pro: false, max: "Su richiesta" },
    hint: "Il piano Max sblocca la richiesta di verifica; il team N'arte la valuta e la concede.",
  },
  {
    label: "Consulenza professionale",
    values: { free: false, pro: "1 slot al mese", max: "Illimitata" },
  },
  {
    label: "Supporto",
    values: { free: "Community", pro: "Email", max: "Prioritario" },
  },
];
