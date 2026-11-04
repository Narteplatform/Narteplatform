/**
 * Profilo artista attivo letto dal cookie nel browser (il cookie non e'
 * httpOnly). Solo per scelte di interfaccia — testi dei toast, link — mai per
 * i permessi: quelli li verifica sempre il server (lib/artist/current.ts).
 */
export function activeArtistFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )narte_active_artist=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
