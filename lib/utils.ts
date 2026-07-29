import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEventDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const days = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"];
  const months = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

/**
 * Prezzo di un evento (in euro). Usata da EventCard ed EventInfoCards — quella
 * dei piani è un'altra, in lib/billing/plans.ts, e ragiona in centesimi.
 *
 * `0` vale come "Gratis" quanto `null`: nell'archivio eventi i concerti
 * gratuiti inseriti con prezzo 0 comparivano come "€0.00" accanto ad altri che
 * dicevano "Gratis", per la sola differenza di come erano stati salvati.
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null || value === 0) return "Gratis";
  return `€${value.toFixed(2)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
