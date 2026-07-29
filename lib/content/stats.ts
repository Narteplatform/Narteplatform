/**
 * I numeri di N’arte, in un posto solo.
 *
 * Prima vivevano in tre punti con tre valori diversi (hero home 200+/500+/50+,
 * chi-siamo 100+/30+/200+, AboutBlock dentro la prosa dell’H2): chi apriva due
 * pagine di fila trovava il sito che si contraddiceva da solo. Se i numeri
 * cambiano, cambiano qui e si propagano ovunque.
 */
export type NarteStat = { value: string; label: string };

/** Esportati anche singolarmente: servono dentro le frasi, non solo nelle griglie. */
export const NARTE_ARTISTS = "100+";
export const NARTE_EVENTS = "50+";
export const NARTE_YEARS = "8+";

export const NARTE_STATS: readonly NarteStat[] = [
  { value: NARTE_ARTISTS, label: "Artisti nel roster" },
  { value: NARTE_EVENTS, label: "Eventi svolti" },
  { value: NARTE_YEARS, label: "Anni di attività" },
];

/** Anno di fondazione. Alimenta le frasi "dal 2018…" e il conteggio degli anni. */
export const NARTE_SINCE = 2018;
