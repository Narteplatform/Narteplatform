import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  CHIAVI_CONTENUTI,
  CONTENUTI,
  contenutiPredefiniti,
  type ChiaveContenuto,
  type Contenuti,
} from "@/lib/content/site-settings";

export const TAG_CONTENUTI = "site-settings";

/** Quanto resta in cache se nessuno salva: il salvataggio la svuota subito. */
const DURATA_CACHE_S = 600;

async function leggiDalDatabase(): Promise<Contenuti> {
  const valori = contenutiPredefiniti();
  const { data, error } = await createAdminClient()
    .from("site_settings")
    .select("key, value")
    .in("key", CHIAVI_CONTENUTI);
  if (error) {
    // Tabella assente (0074 non applicata) o database in pausa: il sito mostra
    // i testi predefiniti, cioè quelli di sempre. Solo lettura, nessun effetto.
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      logger.warn("contenuti", "site_settings non leggibile:", error.message);
    }
    return valori;
  }
  for (const r of data ?? []) {
    if (r.key in CONTENUTI) valori[r.key as ChiaveContenuto] = r.value;
  }
  return valori;
}

/** I contenuti del sito, con i predefiniti al posto delle chiavi mai modificate. */
export const getContenuti = unstable_cache(leggiDalDatabase, ["site-settings-v1"], {
  tags: [TAG_CONTENUTI],
  revalidate: DURATA_CACHE_S,
});

/** Lettura senza cache, per il modulo admin: mostra sempre il valore salvato. */
export async function getContenutiPerModifica(): Promise<
  { ok: true; valori: Contenuti; salvati: Set<string> } | { ok: false; error: string; nonDisponibile: boolean }
> {
  const { data, error } = await createAdminClient()
    .from("site_settings")
    .select("key, value")
    .in("key", CHIAVI_CONTENUTI);
  if (error) {
    const assente = error.code === "42P01" || error.code === "PGRST205";
    return {
      ok: false,
      nonDisponibile: assente,
      error: assente
        ? "La tabella dei contenuti non esiste ancora: va applicata la migration 0074 dal SQL editor di Supabase."
        : `Non riesco a leggere i contenuti (${error.message}).`,
    };
  }
  const valori = contenutiPredefiniti();
  const salvati = new Set<string>();
  for (const r of data ?? []) {
    if (r.key in CONTENUTI) {
      valori[r.key as ChiaveContenuto] = r.value;
      salvati.add(r.key);
    }
  }
  return { ok: true, valori, salvati };
}
