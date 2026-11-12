import "server-only";
import { cookies } from "next/headers";
import { COOKIE_INVITO } from "@/lib/inviti/regole";
import { invitiVisibili } from "@/lib/inviti/modalita";
import { risolviCodice, type ArtistaCheInvita } from "@/lib/inviti/codice";

/**
 * L'artista che ha invitato chi sta navigando, dal cookie impostato da
 * /invito/{codice}. Il codice viene sempre ri-risolto: un cookie scaduto,
 * modificato a mano o di un account non più attivo vale «nessun invito».
 */
export async function invitoDaCookie(): Promise<ArtistaCheInvita | null> {
  if (!invitiVisibili()) return null;
  const jar = await cookies();
  const raw = jar.get(COOKIE_INVITO)?.value;
  if (!raw) return null;
  return risolviCodice(raw);
}
