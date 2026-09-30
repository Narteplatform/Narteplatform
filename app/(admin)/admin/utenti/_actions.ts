"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { riattivaAccount, sospendiAccount } from "@/lib/admin/sospensione";
import { MOTIVAZIONE_MIN } from "@/lib/moderation/decisioni";

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
