export type BudgetRangeValue = "0-100" | "100-300" | "300-500" | "500-1000" | "1000+";

export const BUDGET_RANGES: { value: BudgetRangeValue; label: string; min: number }[] = [
  { value: "0-100", label: "0 — 100 €", min: 0 },
  { value: "100-300", label: "100 — 300 €", min: 100 },
  { value: "300-500", label: "300 — 500 €", min: 300 },
  { value: "500-1000", label: "500 — 1.000 €", min: 500 },
  { value: "1000+", label: "1.000 € e oltre", min: 1000 },
];

// Encoding: salviamo il valore minimo del range in `booking_requests.budget_offer`
// (numeric esistente). Decodifichiamo in display via minToLabel.
export function rangeToMin(value: BudgetRangeValue | string | undefined | null): number | null {
  if (!value) return null;
  const hit = BUDGET_RANGES.find((r) => r.value === value);
  return hit ? hit.min : null;
}

export function minToBudgetLabel(n: number | null | undefined): string | null {
  if (n == null) return null;
  // Match esatto sui min noti
  const exact = BUDGET_RANGES.find((r) => r.min === n);
  if (exact) return exact.label;
  // Fallback: trova il bucket che contiene n
  for (let i = 0; i < BUDGET_RANGES.length; i++) {
    const cur = BUDGET_RANGES[i];
    const next = BUDGET_RANGES[i + 1];
    if (n >= cur.min && (!next || n < next.min)) return cur.label;
  }
  return `€${n}`;
}
