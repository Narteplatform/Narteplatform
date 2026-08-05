import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CollabLogo } from "@/components/marketing/LogoMarquee";

/**
 * Lettura pubblica dei partner, per il nastro di loghi.
 *
 * Estratta perché il nastro ora vive in due punti della stessa pagina — in
 * fondo alla hero e nella sezione "I nostri partner" — più la pagina
 * /collaborazioni. `cache()` fa sì che la query parta una volta sola per
 * richiesta invece di una per sezione.
 *
 * Client anon e non service-role: la policy su `collaborations` è
 * `for select using (true)`, quindi la lettura pubblica basta e non c'è motivo
 * di scomodare una chiave che scavalca RLS per dei loghi.
 *
 * In caso di errore torna `[]`: chi chiama nasconde il nastro. Qui la
 * distinzione fra "query fallita" e "nessun partner" non serve, perché
 * l'esito a schermo è lo stesso — non c'è nessuna scrittura a valle che
 * potrebbe interpretare l'array vuoto come "cancella tutto".
 */
export const getCollaborations = cache(async (): Promise<CollabLogo[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("collaborations")
      .select("id, name, logo_url, link")
      .order("order_index", { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
});
