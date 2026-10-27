import type { ArtistFormation } from "@/lib/supabase/types";

/**
 * Artista singolo o band (0075). Scelta in candidatura, passa al profilo
 * all'approvazione, si vede sulla pagina pubblica e filtra il catalogo.
 */
export const FORMAZIONI: readonly { value: ArtistFormation; label: string }[] = [
  { value: "solista", label: "Artista singolo" },
  { value: "band", label: "Band" },
];

/** Strumenti indicabili in candidatura: una band ne suona di più. */
export const MAX_STRUMENTI_CANDIDATURA: Record<ArtistFormation, number> = {
  solista: 3,
  band: 6,
};

export const COMPONENTI_MIN = 2;
export const COMPONENTI_MAX = 30;

export function isFormazione(v: unknown): v is ArtistFormation {
  return v === "solista" || v === "band";
}

/** «Solista», «Band», «Band · 4 componenti». Null se non indicato. */
export function etichettaFormazione(
  formazione: ArtistFormation | null | undefined,
  componenti?: number | null,
): string | null {
  if (formazione === "solista") return "Solista";
  if (formazione === "band") return componenti ? `Band · ${componenti} componenti` : "Band";
  return null;
}
