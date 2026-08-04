import { getCurrentUser } from "@/lib/auth/guards";
import { getFavoritesForUser } from "@/lib/favorites/server";
import { FavoritesProvider } from "@/components/favorites/FavoritesProvider";

/**
 * Risolve la sessione e i preferiti a database, poi monta il provider.
 *
 * Esiste per non ripetere questa coppia di letture nei due layout che montano
 * l'header (app/(public) e app/(user)/artisti): sono gemelli, e una logica
 * duplicata in entrambi finirebbe per divergere.
 *
 * Va avvolto attorno a <Header/> E a <main>: FavoriteToggle vive nelle card di
 * pagina, FavoritesMenu nell'header, e il contesto deve coprirli entrambi.
 */
export async function FavoritesRoot({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const items = user ? await getFavoritesForUser(user.id) : [];

  return (
    <FavoritesProvider isAuthenticated={Boolean(user)} initialItems={items}>
      {children}
    </FavoritesProvider>
  );
}
