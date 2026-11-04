/** Una notifica, come arriva a campanella e pagina Notifiche. */
export type NotificaItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  /** Destinazione «grezza» salvata a DB. */
  href: string | null;
  /**
   * Dove porta davvero il clic: per una notifica di un altro profilo
   * dell'account passa prima da /dashboard/profili/passa.
   */
  link: string | null;
  artist_id: string | null;
  created_at: string;
  read_at: string | null;
};

export type AreaNotifiche = "artist" | "organizer" | "admin";

export type NotificheIniziali = {
  items: NotificaItem[];
  /** Non lette (nel perimetro del profilo attivo, per l'artista). */
  count: number;
  /** Per il canale realtime (filtro user_id). */
  userId: string;
  area: AreaNotifiche;
  /** Pagina Notifiche dell'area. */
  pageHref: string;
};

/**
 * Link effettivo di una notifica. Per l'artista, una notifica di un profilo
 * diverso da quello attivo passa prima dal cambio profilo: senza, il clic
 * apriva la lista del profilo sbagliato e «non usciva niente».
 */
export function linkNotifica(
  n: { href: string | null; artist_id: string | null },
  activeArtistId: string | null | undefined,
): string | null {
  if (!n.href) return null;
  if (n.artist_id && activeArtistId && n.artist_id !== activeArtistId && n.href.startsWith("/dashboard")) {
    return `/dashboard/profili/passa?to=${n.artist_id}&next=${encodeURIComponent(n.href)}`;
  }
  return n.href;
}
