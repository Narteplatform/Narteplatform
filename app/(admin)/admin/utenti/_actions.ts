"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { riattivaAccount, sospendiAccount } from "@/lib/admin/sospensione";
import { MOTIVAZIONE_MIN, registraAzione, registraDecisione } from "@/lib/moderation/decisioni";
import { createAdminClient } from "@/lib/supabase/server";
import { colonnaAssente } from "@/lib/admin/schema-compat";
import { logger } from "@/lib/logger";
import { venueTypeEnum } from "@/lib/validators/schemas";
import { chiudiAccountDalTeam } from "@/lib/admin/chiusura";

// Una Server Action è un endpoint raggiungibile direttamente: il permesso della
// sezione si controlla qui, non solo nella pagina.

export type EsitoSospensioneAzione =
  | { ok: true; notified: boolean }
  | { ok: false; error: string };

const schema = z.object({
  userId: z.string().uuid(),
  motivo: z
    .string()
    .trim()
    .min(MOTIVAZIONE_MIN, `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.`)
    .max(2000, "La motivazione è troppo lunga (massimo 2000 caratteri)."),
});

async function esegui(
  tipo: "sospendi" | "riattiva",
  userId: string,
  motivo: string
): Promise<EsitoSospensioneAzione> {
  const attore = await requireAdminPageAccess("utenti");
  const parsed = schema.safeParse({ userId, motivo });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const fn = tipo === "sospendi" ? sospendiAccount : riattivaAccount;
  const esito = await fn({ userId: parsed.data.userId, motivo: parsed.data.motivo, attoreId: attore.id });
  if (!esito.ok) return { ok: false, error: esito.error };
  revalidatePath("/admin/utenti");
  revalidatePath("/admin/artisti", "layout");
  return { ok: true, notified: esito.notified };
}

export async function sospendiAccountAction(userId: string, motivo: string) {
  return esegui("sospendi", userId, motivo);
}

export async function riattivaAccountAction(userId: string, motivo: string) {
  return esegui("riattiva", userId, motivo);
}

/**
 * Chiusura dell'account da parte del Team. Non esegue la cancellazione
 * definitiva dei dati: resta lo strumento root esistente.
 */
export async function chiudiAccountAction(userId: string, motivo: string): Promise<EsitoSospensioneAzione> {
  const attore = await requireAdminPageAccess("utenti");
  const parsed = schema.safeParse({ userId, motivo });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }
  const esito = await chiudiAccountDalTeam({
    userId: parsed.data.userId,
    motivo: parsed.data.motivo,
    attoreId: attore.id,
  });
  if (!esito.ok) return { ok: false, error: esito.error };
  revalidatePath("/admin/utenti");
  revalidatePath("/admin/artisti", "layout");
  revalidatePath("/artisti");
  return { ok: true, notified: esito.notified };
}

// =========================================
// Strutture di un organizzatore
// =========================================

export type EsitoStruttura = { ok: true; notified?: boolean } | { ok: false; error: string };

const MSG_MIGRATION_0070 = "Per nascondere le strutture applica prima la migration 0070 dal SQL editor.";

const testoOpzionale = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const strutturaSchema = z.object({
  venueId: z.string().uuid(),
  name: z.string().trim().min(2, "Il nome è obbligatorio").max(160),
  venue_type: venueTypeEnum,
  city: testoOpzionale(120),
  region: testoOpzionale(120),
  address: testoOpzionale(200),
  postal_code: testoOpzionale(20),
  capacity: z.number().int().min(0).max(1_000_000).nullable(),
  description: testoOpzionale(4000),
  website: testoOpzionale(300),
  instagram: testoOpzionale(200),
  phone: testoOpzionale(40),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Email non valida")
    .transform((v) => (v === "" ? null : v)),
});

export type StrutturaInput = z.input<typeof strutturaSchema>;

const CAMPI_STRUTTURA = [
  "name",
  "venue_type",
  "city",
  "region",
  "address",
  "postal_code",
  "capacity",
  "description",
  "website",
  "instagram",
  "phone",
  "email",
] as const;

async function proprietarioStruttura(organizerId: string): Promise<{
  userId: string | null;
  nome: string | null;
}> {
  const { data, error } = await createAdminClient()
    .from("organizers")
    .select("user_id, display_name")
    .eq("id", organizerId)
    .maybeSingle();
  if (error) {
    logger.warn("admin/utenti", "organizzatore non leggibile per la notifica:", error.message);
    return { userId: null, nome: null };
  }
  return { userId: data?.user_id ?? null, nome: data?.display_name ?? null };
}

/**
 * Modifica dei campi principali di una struttura da parte del Team. Si scrivono
 * SOLO i campi che cambiano rispetto alla riga letta ora (lettura con errore
 * controllato): niente payload completo che sovrascriva o svuoti il resto.
 * Se c'è una motivazione, la modifica viene comunicata all'organizzatore.
 */
export async function aggiornaStrutturaAction(input: StrutturaInput, motivo?: string): Promise<EsitoStruttura> {
  const attore = await requireAdminPageAccess("utenti");
  const parsed = strutturaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const dati = parsed.data;
  const motivoPulito = (motivo ?? "").trim();
  if (motivoPulito !== "" && motivoPulito.length < MOTIVAZIONE_MIN) {
    return { ok: false, error: `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.` };
  }

  const admin = createAdminClient();
  const { data: prima, error: letturaErr } = await admin
    .from("venues")
    .select("id, organizer_id, name, venue_type, city, region, address, postal_code, capacity, description, website, instagram, phone, email")
    .eq("id", dati.venueId)
    .maybeSingle();
  if (letturaErr) return { ok: false, error: letturaErr.message };
  if (!prima) return { ok: false, error: "Struttura non trovata." };

  const cambiati: Record<string, string | number | null> = {};
  for (const campo of CAMPI_STRUTTURA) {
    const nuovo = dati[campo];
    if ((prima[campo] ?? null) !== (nuovo ?? null)) cambiati[campo] = nuovo ?? null;
  }
  if (Object.keys(cambiati).length === 0) return { ok: true };

  const { error } = await admin
    .from("venues")
    .update({ ...cambiati, updated_at: new Date().toISOString() })
    .eq("id", dati.venueId);
  if (error) return { ok: false, error: error.message };

  const elenco = Object.keys(cambiati).join(", ");
  let notified = false;
  if (motivoPulito !== "") {
    const prop = await proprietarioStruttura(prima.organizer_id);
    const esito = await registraDecisione({
      actorId: attore.id,
      targetType: "struttura",
      targetId: prima.id,
      action: "struttura_modificata_dal_team",
      reason: motivoPulito,
      affectedUserId: prop.userId,
      affectedName: prop.nome,
      notify: prop.userId
        ? {
            decision: "Il team ha aggiornato alcune informazioni di una tua struttura.",
            target: `Struttura "${dati.name}"`,
            consequences: `Campi modificati: ${elenco}.`,
          }
        : false,
    });
    if (!esito.ok) logger.warn("admin/utenti", "modifica struttura non registrata:", esito.error);
    else notified = esito.notified;
  } else {
    await registraAzione({
      actorId: attore.id,
      targetType: "struttura",
      targetId: prima.id,
      action: "struttura_modificata_dal_team",
      descrizione: `Struttura «${dati.name}» modificata dal team (campi: ${elenco}).`,
    });
  }

  revalidatePath(`/admin/utenti`);
  revalidatePath("/organizzatore/strutture");
  return { ok: true, notified };
}

const nascondiSchema = z.object({
  venueId: z.string().uuid(),
  nascondi: z.boolean(),
  motivo: z
    .string()
    .trim()
    .min(MOTIVAZIONE_MIN, `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.`)
    .max(2000),
});

/** Nasconde o mostra una struttura (`venues.hidden_at`), con motivazione e avviso all'organizzatore. */
export async function nascondiStrutturaAction(
  venueId: string,
  nascondi: boolean,
  motivo: string,
): Promise<EsitoStruttura> {
  const attore = await requireAdminPageAccess("utenti");
  const parsed = nascondiSchema.safeParse({ venueId, nascondi, motivo });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };

  const admin = createAdminClient();
  const { data: struttura, error: letturaErr } = await admin
    .from("venues")
    .select("id, name, organizer_id, hidden_at")
    .eq("id", parsed.data.venueId)
    .maybeSingle();
  if (letturaErr) {
    if (colonnaAssente(letturaErr, "hidden_at")) return { ok: false, error: MSG_MIGRATION_0070 };
    return { ok: false, error: letturaErr.message };
  }
  if (!struttura) return { ok: false, error: "Struttura non trovata." };
  if (parsed.data.nascondi === Boolean(struttura.hidden_at)) {
    return { ok: false, error: parsed.data.nascondi ? "La struttura è già nascosta." : "La struttura è già visibile." };
  }

  const { error } = await admin
    .from("venues")
    .update({
      hidden_at: parsed.data.nascondi ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", struttura.id);
  if (error) {
    if (colonnaAssente(error, "hidden_at")) return { ok: false, error: MSG_MIGRATION_0070 };
    return { ok: false, error: error.message };
  }

  const prop = await proprietarioStruttura(struttura.organizer_id);
  const esito = await registraDecisione({
    actorId: attore.id,
    targetType: "struttura",
    targetId: struttura.id,
    action: parsed.data.nascondi ? "struttura_nascosta" : "struttura_mostrata",
    reason: parsed.data.motivo,
    affectedUserId: prop.userId,
    affectedName: prop.nome,
    notify: prop.userId
      ? {
          decision: parsed.data.nascondi
            ? "Abbiamo nascosto una tua struttura."
            : "Abbiamo di nuovo reso visibile una tua struttura.",
          target: `Struttura "${struttura.name}"`,
          consequences: parsed.data.nascondi
            ? "La struttura non compare più tra le scelte per le richieste di booking, finché la decisione non viene rivista."
            : "La struttura torna tra le scelte per le richieste di booking.",
        }
      : false,
  });
  if (!esito.ok) logger.warn("admin/utenti", "decisione sulla struttura non registrata:", esito.error);

  revalidatePath("/admin/utenti");
  revalidatePath("/organizzatore/strutture");
  revalidatePath("/organizzatore/calendario");
  revalidatePath("/artisti");
  return { ok: true, notified: esito.ok ? esito.notified : false };
}
