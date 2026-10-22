"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { registraAzione } from "@/lib/moderation/decisioni";
import { CHIAVI_CONTENUTI, CONTENUTI, type ChiaveContenuto } from "@/lib/content/site-settings";
import { TAG_CONTENUTI, getContenutiPerModifica } from "@/lib/content/site-settings-server";

export type EsitoSalvataggio = { ok: true; cambiati: number } | { ok: false; error: string };

function valida(chiave: ChiaveContenuto, grezzo: unknown): { ok: true; valore: string } | { ok: false; error: string } {
  const def = CONTENUTI[chiave];
  const valore = typeof grezzo === "string" ? grezzo.trim() : "";
  const nome = `${def.gruppo} › ${def.etichetta}`;
  if (!valore) {
    return "facoltativo" in def && def.facoltativo ? { ok: true, valore } : { ok: false, error: `${nome}: non può restare vuoto.` };
  }
  if (valore.length > def.max) return { ok: false, error: `${nome}: massimo ${def.max} caratteri.` };
  if (def.tipo === "url") {
    try {
      const u = new URL(valore);
      if (u.protocol !== "https:") return { ok: false, error: `${nome}: deve iniziare con https://` };
    } catch {
      return { ok: false, error: `${nome}: non è un indirizzo valido (es. https://instagram.com/narte.official).` };
    }
  }
  if (def.tipo === "telefono" && !/^\+?[\d\s().-]{6,30}$/.test(valore)) {
    return { ok: false, error: `${nome}: solo cifre, spazi e il + iniziale (es. +39 333 586 0666).` };
  }
  return { ok: true, valore };
}

/**
 * Salva i contenuti modificati. Si scrivono solo le chiavi il cui valore è
 * cambiato rispetto a quello in vigore; nulla viene mai cancellato.
 */
export async function salvaContenuti(input: Record<string, unknown>): Promise<EsitoSalvataggio> {
  const user = await requireAdminPageAccess("contenuti");

  // Prima si legge lo stato attuale: senza, non si sa cosa è cambiato. Se la
  // lettura fallisce ci si ferma (regola 4 di CLAUDE.md).
  const attuale = await getContenutiPerModifica();
  if (!attuale.ok) return { ok: false, error: attuale.error };

  const righe: { key: string; value: string; updated_at: string; updated_by: string }[] = [];
  const adesso = new Date().toISOString();
  for (const chiave of CHIAVI_CONTENUTI) {
    if (!(chiave in input)) continue;
    const v = valida(chiave, input[chiave]);
    if (!v.ok) return { ok: false, error: v.error };
    if (v.valore === attuale.valori[chiave]) continue;
    righe.push({ key: chiave, value: v.valore, updated_at: adesso, updated_by: user.id });
  }
  if (righe.length === 0) return { ok: true, cambiati: 0 };

  const { error } = await createAdminClient().from("site_settings").upsert(righe, { onConflict: "key" });
  if (error) return { ok: false, error: `Salvataggio non riuscito: ${error.message}` };

  await registraAzione({
    actorId: user.id,
    targetType: "contenuti",
    action: "contenuti_modificati",
    descrizione: `Contenuti del sito modificati: ${righe
      .map((r) => CONTENUTI[r.key as ChiaveContenuto].etichetta)
      .join(", ")}.`,
  });

  updateTag(TAG_CONTENUTI);
  revalidatePath("/", "layout");
  return { ok: true, cambiati: righe.length };
}
