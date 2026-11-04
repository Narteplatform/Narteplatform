import { HeroNarteClient } from "./HeroNarteClient";
import { getCollaborations } from "@/lib/data/collaborations";
import { getContenuti } from "@/lib/content/site-settings-server";

/**
 * Involucro server della hero: la parte interattiva (ricerca con autocomplete)
 * è client, ma i loghi partner in fondo arrivano dal DB e vanno letti qui.
 * `getCollaborations` è memoizzata per richiesta, quindi questa lettura e
 * quella di CollaborationsSection più in basso nella stessa pagina restano
 * una query sola.
 */
export async function HeroNarte() {
  const [partners, c] = await Promise.all([getCollaborations(), getContenuti()]);
  return (
    <HeroNarteClient
      partners={partners}
      testi={{
        riga1: c["home.hero.riga1"],
        riga2: c["home.hero.riga2"],
        sottotitolo: c["home.hero.sottotitolo"],
        sfondo: c["home.hero.foto"],
      }}
    />
  );
}
