"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  clearLocalWithBackup,
  readLocal,
  subscribeLocal,
  writeLocal,
} from "@/lib/favorites/local";
import type { FavoriteArtist } from "@/lib/favorites/types";
import { addFavorite, importLocalFavorites, removeFavorite } from "@/app/_actions/favorites";

/**
 * Una sola fonte per i preferiti, qualunque sia l'utente.
 *
 * Il contratto di `useFavorites()` è rimasto identico a quando i preferiti
 * vivevano solo nel browser (`items, hydrated, has, toggle, remove`): per
 * questo FavoriteToggle e FavoritesMenu non hanno dovuto cambiare forma. Quello
 * che cambia è da dove arrivano i dati.
 *
 *   OSPITE   → localStorage, esattamente come prima. Zero regressioni.
 *   LOGGATO  → database, con `initialItems` già risolti dal server (niente
 *              lampeggio di lista vuota all'idratazione) e aggiornamento
 *              ottimistico: il cuore risponde subito, e se la Server Action
 *              fallisce lo stato torna indietro con un avviso.
 *
 * Il provider va montato SOPRA sia <Header/> sia <main>: FavoriteToggle vive
 * dentro le card di pagina e FavoritesMenu dentro l'header, sono rami fratelli
 * e l'unico antenato comune è il layout.
 */

type FavoritesApi = {
  items: FavoriteArtist[];
  hydrated: boolean;
  has: (slug: string) => boolean;
  toggle: (artist: FavoriteArtist) => void;
  remove: (slug: string) => void;
};

const FavoritesContext = createContext<FavoritesApi | null>(null);

export function useFavorites(): FavoritesApi {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    // Succede solo se un componente finisce fuori dai due layout che montano il
    // provider. Meglio un errore esplicito che dei cuori che non fanno nulla.
    throw new Error("useFavorites richiede <FavoritesProvider> in un layout superiore.");
  }
  return ctx;
}

export function FavoritesProvider({
  isAuthenticated,
  initialItems,
  children,
}: {
  isAuthenticated: boolean;
  /** Preferiti letti dal database lato server. Vuoto per gli ospiti. */
  initialItems: FavoriteArtist[];
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<FavoriteArtist[]>(isAuthenticated ? initialItems : []);
  const [hydrated, setHydrated] = useState(isAuthenticated);

  // --- OSPITE: localStorage, come sempre ---
  useEffect(() => {
    if (isAuthenticated) return;
    setItems(readLocal());
    setHydrated(true);
    return subscribeLocal(() => setItems(readLocal()));
  }, [isAuthenticated]);

  // Il server è la fonte di verità: quando la pagina si aggiorna dopo una
  // mutazione, `initialItems` cambia e lo stato ottimistico viene riallineato.
  useEffect(() => {
    if (isAuthenticated) setItems(initialItems);
  }, [isAuthenticated, initialItems]);

  // --- LOGGATO: importa una volta i preferiti rimasti nel browser ---
  const importStarted = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || importStarted.current) return;
    const local = readLocal();
    if (local.length === 0) return;
    importStarted.current = true;

    void (async () => {
      const res = await importLocalFavorites(local.map((a) => a.slug));
      // La pulizia avviene SOLO a import confermato, e con una copia messa da
      // parte prima. Se la rete cade, la lista resta nel browser e il prossimo
      // caricamento riprova: l'import è idempotente apposta.
      if (!res.ok) return;
      clearLocalWithBackup();
      setItems((cur) => {
        const known = new Set(cur.map((a) => a.slug));
        return [...local.filter((a) => !known.has(a.slug)), ...cur];
      });
      if (res.imported > 0) {
        toast.success(
          res.imported === 1
            ? "Il tuo artista preferito è ora salvato sul tuo account."
            : `${res.imported} preferiti sono ora salvati sul tuo account.`
        );
      }
    })();
  }, [isAuthenticated]);

  const has = useCallback((slug: string) => items.some((a) => a.slug === slug), [items]);

  const toggle = useCallback(
    (artist: FavoriteArtist) => {
      const exists = items.some((a) => a.slug === artist.slug);

      if (!isAuthenticated) {
        const cur = readLocal();
        const next = exists
          ? cur.filter((a) => a.slug !== artist.slug)
          : [artist, ...cur.filter((a) => a.slug !== artist.slug)];
        writeLocal(next);
        setItems(next);
        return;
      }

      // Senza id non c'è nulla da scrivere: la riga del database è
      // (user_id, artist_id). Capita solo se una superficie passa un artista
      // senza averne selezionato l'id — meglio dirlo che fingere un salvataggio.
      const artistId = artist.id;
      if (!artistId) {
        toast.error("Non è stato possibile salvare questo artista.");
        return;
      }

      const previous = items;
      setItems(
        exists
          ? items.filter((a) => a.slug !== artist.slug)
          : [artist, ...items.filter((a) => a.slug !== artist.slug)]
      );

      void (async () => {
        const res = exists ? await removeFavorite(artistId) : await addFavorite(artistId);
        if (!res.ok) {
          setItems(previous);
          toast.error(res.error);
        }
      })();
    },
    [isAuthenticated, items]
  );

  const remove = useCallback(
    (slug: string) => {
      const target = items.find((a) => a.slug === slug);
      if (!target) return;
      toggle(target);
    },
    [items, toggle]
  );

  const value = useMemo<FavoritesApi>(
    () => ({ items, hydrated, has, toggle, remove }),
    [items, hydrated, has, toggle, remove]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
