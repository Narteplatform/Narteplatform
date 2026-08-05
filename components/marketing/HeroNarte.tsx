import { HeroNarteClient } from "./HeroNarteClient";
import { getCollaborations } from "@/lib/data/collaborations";

/**
 * Involucro server della hero: la parte interattiva (ricerca con autocomplete)
 * è client, ma i loghi partner in fondo arrivano dal DB e vanno letti qui.
 * `getCollaborations` è memoizzata per richiesta, quindi questa lettura e
 * quella di CollaborationsSection più in basso nella stessa pagina restano
 * una query sola.
 */
export async function HeroNarte() {
  const partners = await getCollaborations();
  return <HeroNarteClient partners={partners} />;
}
