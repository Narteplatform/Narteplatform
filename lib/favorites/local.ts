"use client";

import type { FavoriteArtist } from "@/lib/favorites/types";

/**
 * Preferiti nel browser.
 *
 * Da quando esiste `artist_favorites` a database, questo strato NON è più la
 * fonte di verità per tutti: serve agli OSPITI, che un account non ce l'hanno e
 * a cui il cuore deve funzionare lo stesso. Per gli utenti autenticati la fonte
 * è il database, e queste voci vengono importate al primo accesso utile
 * (vedi FavoritesProvider).
 */

export const FAVORITES_KEY = "narte:favorites:artists";
/**
 * Copia di sicurezza scritta subito prima di svuotare la chiave principale
 * durante la migrazione verso il database. Esiste per un caso solo: se qualcosa
 * andasse storto fra l'import riuscito e la pulizia, i dati sono ancora qui.
 */
export const FAVORITES_BACKUP_KEY = "narte:favorites:artists:backup";

const EVENT = "narte:favorites:changed";

export function readLocal(): FavoriteArtist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is FavoriteArtist =>
        a && typeof a.slug === "string" && typeof a.stage_name === "string"
    );
  } catch {
    return [];
  }
}

export function writeLocal(items: FavoriteArtist[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Svuota i preferiti locali dopo averne messo da parte una copia.
 *
 * È l'unica operazione distruttiva di tutta la migrazione: va chiamata SOLO
 * dopo che il server ha confermato l'import. Un fallimento di rete deve
 * lasciare la lista dov'è, non azzerarla.
 */
export function clearLocalWithBackup() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (raw) window.localStorage.setItem(FAVORITES_BACKUP_KEY, raw);
    window.localStorage.removeItem(FAVORITES_KEY);
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // Quota piena o storage negato: meglio non pulire che perdere i dati.
  }
}

/** Notifica gli altri componenti montati (e le altre schede, via `storage`). */
export function subscribeLocal(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
