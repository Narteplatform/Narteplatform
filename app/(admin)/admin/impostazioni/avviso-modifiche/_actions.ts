"use server";

import { revalidatePath } from "next/cache";
import { requireRootSuperadmin } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { chiaveInvioAvviso, destinatariAvviso } from "@/lib/legal/avviso-destinatari";
import { registraAzione } from "@/lib/moderation/decisioni";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import { dataLeggibile, GIORNI_PREAVVISO_MODIFICHE, modificheAnnunciate } from "@/lib/legal/avviso-modifiche";

export type EsitoAvviso = { ok: true; inviate: number; fallite: number } | { ok: false; error: string };

/**
 * Invia a tutti gli utenti attivi il preavviso delle modifiche annunciate in
 * lib/legal/avviso-modifiche.ts. Solo root, una volta per data.
 */
export async function inviaAvvisoModifiche(): Promise<EsitoAvviso> {
  const root = await requireRootSuperadmin();
  const m = modificheAnnunciate();
  if (!m) return { ok: false, error: "Nessuna modifica annunciata in lib/legal/avviso-modifiche.ts." };

  const giorni = (new Date(`${m.inVigoreDal}T00:00:00+01:00`).getTime() - Date.now()) / 86_400_000;
  if (giorni < GIORNI_PREAVVISO_MODIFICHE) {
    return {
      ok: false,
      error: `Mancano meno di ${GIORNI_PREAVVISO_MODIFICHE} giorni all'entrata in vigore: sposta la data in avanti prima di inviare.`,
    };
  }

  const admin = createAdminClient();
  const chiave = chiaveInvioAvviso(m.inVigoreDal);
  const { data: gia, error: giaErr } = await admin.from("site_settings").select("value").eq("key", chiave).maybeSingle();
  if (giaErr) return { ok: false, error: "Non riesco a verificare se l'avviso è già stato inviato. Nessun invio." };
  if (gia) return { ok: false, error: `Avviso già inviato (${gia.value}).` };

  const dest = await destinatariAvviso();
  if (!dest.ok) return { ok: false, error: `Destinatari non letti: ${dest.error}. Nessun invio.` };

  // Segna l'invio PRIMA di partire: un doppio clic non manda due email a tutti.
  const { error: segnaErr } = await admin
    .from("site_settings")
    .insert({ key: chiave, value: `avviato il ${new Date().toISOString()} da ${root.email ?? root.id}`, updated_by: root.id });
  if (segnaErr) return { ok: false, error: "Non riesco a registrare l'invio: nessuna email partita." };

  const params = {
    effectiveDate: dataLeggibile(m.inVigoreDal),
    summary: m.sintesi,
    documentsUrl: `${getSiteUrl()}${m.link}`,
  };
  let inviate = 0;
  let fallite = 0;
  for (const to of dest.email) {
    const r = await dispatchEmail({
      key: "terms_update_notice",
      to,
      params,
      subjectPreview: `Cambiano le condizioni di N'arte dal ${params.effectiveDate}`,
      meta: { avviso: chiave },
    });
    if (r.ok) inviate++;
    else fallite++;
  }

  await admin
    .from("site_settings")
    .update({ value: `inviato il ${new Date().toISOString()}: ${inviate} ok, ${fallite} non partite` })
    .eq("key", chiave);
  await registraAzione({
    actorId: root.id,
    targetType: "documenti_legali",
    targetId: null,
    action: "avviso_modifiche_inviato",
    descrizione: `Preavviso modifiche in vigore dal ${m.inVigoreDal}: ${inviate} email inviate, ${fallite} non partite.`,
  });
  if (fallite > 0) logger.warn("avviso-modifiche", `${fallite} email non partite`);
  revalidatePath("/admin/impostazioni/avviso-modifiche");
  return { ok: true, inviate, fallite };
}
