"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { registraAzione } from "@/lib/moderation/decisioni";
import { logger } from "@/lib/logger";

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
