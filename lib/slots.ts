// Risoluzione slot disponibili per un artista in una data specifica.
// Logica:
//   1. Se il giorno è "busy" in artist_availability → nessuno slot.
//   2. Se esistono slot in artist_date_slots per quella data → usa quelli.
//   3. Altrimenti usa gli artist_default_slots.

export type Slot = {
  id?: string;
  label: string | null;
  start_time: string; // HH:MM o HH:MM:SS
  end_time: string;
};

export function normalizeTime(t: string): string {
  // accetta "HH:MM:SS" e "HH:MM" → restituisce "HH:MM"
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export function formatSlot(s: Slot): string {
  const a = normalizeTime(s.start_time);
  const b = normalizeTime(s.end_time);
  return s.label ? `${s.label} (${a}–${b})` : `${a}–${b}`;
}

export function resolveSlotsForDate(opts: {
  isBusyDay: boolean;
  dateSlots: Slot[];
  defaultSlots: Slot[];
}): Slot[] {
  if (opts.isBusyDay) return [];
  if (opts.dateSlots.length > 0) return opts.dateSlots;
  return opts.defaultSlots;
}
