import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { colonnaAssente } from "@/lib/admin/schema-compat";
import { isUtenteSospeso } from "@/lib/auth/sospeso";
import { logger } from "@/lib/logger";

/**
 * Privati registrati a cui il Team può segnalare un artista Max.
 *
 * Alla registrazione non esiste la scelta «privato»: chi cerca un artista
 * diventa organizzatore e, nel profilo, sceglie «Struttura» o «Privato»
 * (`organizers.is_private`, 0035). A questi si aggiungono gli utenti generici
 * (ruolo `user`), nati senza scegliere un ruolo, per esempio con Google.
 *
 * Esclusi: gli organizzatori non ancora approvati o rifiutati (0071), gli
 * account bloccati o chiusi e chi non ha un'email.
 */

export type Privato = {
  /** "org:<organizerId>" oppure "user:<profileId>": lo stesso formato del modulo. */
  value: string;
  name: string;
  email: string;
  tipo: "organizzatore privato" | "utente";
};

/** Tetto di sicurezza sulle letture dell'email (una chiamata ad Auth per voce). */
const MASSIMO = 300;

export async function elencaPrivati(): Promise<{ ok: true; privati: Privato[] } | { ok: false }> {
  const admin = createAdminClient();

  // approval_status c'è solo con la 0071: senza, gli organizzatori sono tutti approvati.
  let orgs = await admin
    .from("organizers")
    .select("id, user_id, display_name, approval_status")
    .eq("is_private", true)
    .limit(MASSIMO);
  if (colonnaAssente(orgs.error, "approval_status")) {
    orgs = (await admin
      .from("organizers")
      .select("id, user_id, display_name")
      .eq("is_private", true)
      .limit(MASSIMO)) as typeof orgs;
  }
  const utenti = await admin.from("profiles").select("id, full_name").eq("role", "user").limit(MASSIMO);
  if (orgs.error || utenti.error) {
    logger.error("referrals", "elenco privati non letto:", orgs.error?.message ?? utenti.error?.message);
    return { ok: false };
  }

  const voci: { value: string; userId: string; nome: string | null; tipo: Privato["tipo"] }[] = [
    ...(orgs.data ?? [])
      .filter((o) => !("approval_status" in o) || (o.approval_status ?? "approved") === "approved")
      .map((o) => ({
        value: `org:${o.id}`,
        userId: o.user_id,
        nome: o.display_name,
        tipo: "organizzatore privato" as const,
      })),
    ...(utenti.data ?? []).map((p) => ({
      value: `user:${p.id}`,
      userId: p.id,
      nome: p.full_name,
      tipo: "utente" as const,
    })),
  ].slice(0, MASSIMO);

  const letti = await Promise.all(
    voci.map(async (v) => {
      const { data, error } = await admin.auth.admin.getUserById(v.userId);
      if (error || !data?.user?.email || isUtenteSospeso(data.user)) return null;
      const meta = data.user.user_metadata as { full_name?: string } | undefined;
      const nome = v.nome?.trim() || meta?.full_name?.trim() || data.user.email;
      return { value: v.value, name: nome, email: data.user.email, tipo: v.tipo } satisfies Privato;
    }),
  );

  const privati = letti
    .filter((p): p is Privato => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
  return { ok: true, privati };
}
