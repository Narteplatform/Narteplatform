import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/billing/entitlements";

/**
 * Chi può usare la chat, e i recapiti per chi non può.
 *
 * Regola (novembre 2026): la chat è dei piani Pro e Max dell'ARTISTA e vale
 * per entrambe le parti. Con un artista Free non si apre nessuna chat, né lui
 * né l'organizzatore: la trattativa si svolge via email, e dopo «Inizia
 * trattativa» ciascuno vede l'indirizzo dell'altro.
 *
 * Il canale si decide dal piano ATTUALE, non da un valore salvato: chi passa a
 * Pro durante una trattativa via email trova subito la chat, chi torna Free la
 * trova in sola lettura con il rimando all'email.
 */

export type CanaleTrattativa = "chat" | "email";

/** L'artista (profilo) ha la chat? Usa il tier del profilo, che include l'omaggio del team. */
export async function chatAttivaPerArtista(artistId: string): Promise<boolean> {
  const ent = await getEntitlements(artistId);
  return ent.canUseChat;
}

export async function canaleTrattativa(artistId: string): Promise<CanaleTrattativa> {
  return (await chatAttivaPerArtista(artistId)) ? "chat" : "email";
}

/**
 * Email dell'account (auth). Restituisce `null` se l'utente non c'è o la
 * lettura fallisce: serve solo a MOSTRARE un recapito, mai a derivare scritture.
 */
export async function emailAccount(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    console.error("[chat/accesso] account non leggibile:", error.message);
    return null;
  }
  return data?.user?.email ?? null;
}

/** Più account in parallelo: mappa userId → email (assenti quelli non leggibili). */
export async function emailAccounts(userIds: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unici = [...new Set(userIds.filter((u): u is string => Boolean(u)))];
  const coppie = await Promise.all(unici.map(async (id) => [id, await emailAccount(id)] as const));
  const out = new Map<string, string>();
  for (const [id, email] of coppie) if (email) out.set(id, email);
  return out;
}

/** Piani dei profili artista in un colpo solo: mappa artistId → chat attiva. */
export async function chatAttivaPerArtisti(artistIds: string[]): Promise<Map<string, boolean>> {
  const unici = [...new Set(artistIds)];
  const coppie = await Promise.all(unici.map(async (id) => [id, await chatAttivaPerArtista(id)] as const));
  return new Map(coppie);
}
