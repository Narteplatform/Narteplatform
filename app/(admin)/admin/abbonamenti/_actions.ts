"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { registraAzione } from "@/lib/moderation/decisioni";
import { logger } from "@/lib/logger";
import { localeRomaAIso } from "@/lib/billing/fuso-roma";
import { formatPrice } from "@/lib/billing/plans";

const schema = z.object({
  id: z.string().uuid(),
  campo: z.enum(["scheduled_at", "done_at"]),
  // yyyy-mm-dd dal campo data; vuoto = togli la data.
  data: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data non valida"),
});

/** Segna la data fissata o quella di esecuzione dello shooting. */
export async function aggiornaShooting(formData: FormData): Promise<void> {
  const user = await requireAdminPageAccess("abbonamenti");
  const parsed = schema.safeParse({
    id: formData.get("id"),
    campo: formData.get("campo"),
    data: String(formData.get("data") ?? ""),
  });
  if (!parsed.success) return;
  const { id, campo, data } = parsed.data;
  // Mezzogiorno a Roma: la data resta quella scelta in ogni fuso.
  const valore = data ? new Date(`${data}T12:00:00+01:00`).toISOString() : null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("photo_shoots")
    .update({
      ...(campo === "done_at" ? { done_at: valore } : { scheduled_at: valore }),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    logger.error("admin/shooting", "aggiornamento fallito:", error.message);
    return;
  }
  await registraAzione({
    actorId: user.id,
    targetType: "shooting",
    targetId: id,
    action: campo === "done_at" ? "shooting_eseguito" : "shooting_fissato",
    descrizione: `${campo === "done_at" ? "Eseguito" : "Fissato"}: ${data || "data rimossa"}.`,
  });
  revalidatePath("/admin/abbonamenti");
}

// =========================================
// Registro dei recessi (subscription_withdrawals, 0070)
// =========================================
//
// Il recesso online passa da /dashboard/abbonamento e si registra da solo. Qui
// si registrano quelli arrivati per email o PEC, e si segna il rimborso
// eseguito a mano. Registrare NON annulla l'abbonamento su Stripe e NON
// rimborsa: sono azioni da fare nel pannello Stripe, e la pagina lo dice.

/** Torna alla pagina con l'esito da mostrare nella sezione Recessi. */
function esito(codice: string): never {
  redirect(`/admin/abbonamenti?recesso=${encodeURIComponent(codice)}#recessi`);
}

const recessoSchema = z.object({
  stripe_subscription_id: z
    .string()
    .trim()
    .regex(/^sub_[A-Za-z0-9]{6,}$/, "Id abbonamento Stripe non valido (sub_…)"),
  user_email: z.string().trim().email("Email non valida").max(320).or(z.literal("")),
  canale: z.enum(["email", "pec"]),
  ricevuto_il: z.string().trim().min(10, "Data di ricezione mancante"),
  rimborso: z
    .string()
    .trim()
    .regex(/^\d{1,5}([.,]\d{1,2})?$/, "Importo non valido")
    .or(z.literal("")),
  stato_rimborso: z.enum(["da_eseguire", "eseguito", "non_dovuto"]),
  note: z.string().trim().max(2000).optional(),
});

/** Inserimento manuale di un recesso arrivato via email o PEC. */
export async function registraRecessoManuale(formData: FormData): Promise<void> {
  const user = await requireAdminPageAccess("abbonamenti");
  const parsed = recessoSchema.safeParse({
    stripe_subscription_id: String(formData.get("stripe_subscription_id") ?? ""),
    user_email: String(formData.get("user_email") ?? ""),
    canale: formData.get("canale"),
    ricevuto_il: String(formData.get("ricevuto_il") ?? ""),
    rimborso: String(formData.get("rimborso") ?? ""),
    stato_rimborso: formData.get("stato_rimborso"),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) esito(`errore:${parsed.error.issues[0]?.message ?? "Dati non validi"}`);
  const v = parsed.data;

  const ricevutoIl = localeRomaAIso(v.ricevuto_il);
  if (!ricevutoIl) esito("errore:Data di ricezione non valida");
  if (new Date(ricevutoIl).getTime() > Date.now() + 5 * 60_000) esito("errore:La data di ricezione è nel futuro");

  const rimborsoCent = v.rimborso ? Math.round(Number(v.rimborso.replace(",", ".")) * 100) : 0;
  if (!Number.isFinite(rimborsoCent) || rimborsoCent < 0) esito("errore:Importo non valido");
  if (v.stato_rimborso === "non_dovuto" && rimborsoCent > 0) {
    esito("errore:Con un importo da rimborsare lo stato non può essere «non dovuto»");
  }

  // L'account si ricava dal ledger: errore di lettura = ci si ferma, non si
  // registra un recesso senza sapere di chi è.
  const admin = createAdminClient();
  const { data: riga, error: leggiErr } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", v.stripe_subscription_id)
    .maybeSingle();
  if (leggiErr) {
    logger.error("admin/recessi", "ledger non leggibile:", leggiErr.message);
    esito("errore:Non riesco a leggere gli abbonamenti. Riprova fra un momento.");
  }

  let email = v.user_email || null;
  if (!email && riga?.user_id) {
    const { data: u } = await admin.auth.admin.getUserById(riga.user_id);
    email = u?.user?.email ?? null;
  }

  const { data: inserita, error } = await admin
    .from("subscription_withdrawals")
    .insert({
      user_id: riga?.user_id ?? null,
      user_email: email,
      stripe_subscription_id: v.stripe_subscription_id,
      canale: v.canale,
      ricevuto_il: ricevutoIl,
      rimborso_cent: rimborsoCent,
      stato_rimborso: v.stato_rimborso,
      registrato_da: user.id,
      note: v.note ? v.note : null,
    })
    .select("id")
    .single();
  if (error) {
    const mancante = error.code === "42P01" || error.code === "PGRST205";
    logger.error("admin/recessi", "recesso non registrato:", error.message);
    esito(mancante ? "errore:Registro dei recessi non disponibile (migration 0070)." : "errore:Recesso non registrato. Riprova.");
  }

  await registraAzione({
    actorId: user.id,
    targetType: "recesso",
    targetId: inserita.id,
    action: "recesso_registrato",
    affectedUserId: riga?.user_id ?? null,
    descrizione: `Recesso ricevuto via ${v.canale === "pec" ? "PEC" : "email"} il ${ricevutoIl.slice(0, 10)} per ${v.stripe_subscription_id}; rimborso ${formatPrice(rimborsoCent)} (${v.stato_rimborso.replace("_", " ")}).`,
  });
  revalidatePath("/admin/abbonamenti");
  esito(riga ? "registrato" : "registrato_senza_account");
}

/** Segna come eseguito un rimborso «da eseguire» (fatto a mano dal pannello Stripe). */
export async function segnaRimborsoEseguito(formData: FormData): Promise<void> {
  const user = await requireAdminPageAccess("abbonamenti");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) esito("errore:Recesso non valido");

  const admin = createAdminClient();
  const { data: riga, error: leggiErr } = await admin
    .from("subscription_withdrawals")
    .select("id, user_id, note, rimborso_cent, stato_rimborso, stripe_subscription_id")
    .eq("id", id.data)
    .maybeSingle();
  if (leggiErr || !riga) {
    if (leggiErr) logger.error("admin/recessi", "recesso non leggibile:", leggiErr.message);
    esito("errore:Recesso non trovato o non leggibile.");
  }
  if (riga.stato_rimborso !== "da_eseguire") esito("errore:Il rimborso non è più «da eseguire».");

  const quando = new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" });
  const annotazione = `Rimborso segnato come eseguito da ${user.email ?? user.id} il ${quando}.`;
  // Aggiornamento condizionato allo stato letto: due clic simultanei non
  // scrivono due volte, e la nota esistente si conserva (si aggiunge in coda).
  const { data: aggiornate, error } = await admin
    .from("subscription_withdrawals")
    .update({
      stato_rimborso: "eseguito",
      note: riga.note ? `${riga.note}\n${annotazione}` : annotazione,
    })
    .eq("id", riga.id)
    .eq("stato_rimborso", "da_eseguire")
    .select("id");
  if (error) {
    logger.error("admin/recessi", "rimborso non segnato:", error.message);
    esito("errore:Non riesco a salvare. Riprova.");
  }
  if ((aggiornate ?? []).length === 0) esito("errore:Il rimborso è già stato segnato da qualcun altro.");

  await registraAzione({
    actorId: user.id,
    targetType: "recesso",
    targetId: riga.id,
    action: "recesso_rimborso_eseguito",
    affectedUserId: riga.user_id,
    descrizione: `Rimborso di ${formatPrice(riga.rimborso_cent)} per ${riga.stripe_subscription_id} segnato come eseguito.`,
  });
  revalidatePath("/admin/abbonamenti");
  esito("rimborso_eseguito");
}
