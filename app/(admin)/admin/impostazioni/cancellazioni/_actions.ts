"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRootSuperadmin } from "@/lib/admin/permissions";
import { logger } from "@/lib/logger";
import { annullaCancellazioneConfermata } from "@/lib/legal/cancellazione";
import { MOTIVAZIONE_MIN } from "@/lib/moderation/decisioni";
import {
  anteprimaCompletamento,
  eseguiCompletamento,
  type AnteprimaCompletamento,
} from "@/lib/legal/completa-cancellazione";

/**
 * Le due azioni della pagina «Cancellazioni account». Entrambe solo root.
 * L'anteprima è sola lettura; il completamento è irreversibile e chiede tre
 * conferme distinte (email ridigitata, anteprima verificata, e — prima dei 30
 * giorni — la richiesta esplicita dell'interessato).
 */

const idSchema = z.string().uuid("Richiesta non valida.");

export type AnteprimaResult =
  | { ok: true; anteprima: AnteprimaCompletamento }
  | { ok: false; error: string };

export async function anteprimaCancellazioneAction(richiestaId: string): Promise<AnteprimaResult> {
  await requireRootSuperadmin();
  const id = idSchema.safeParse(richiestaId);
  if (!id.success) return { ok: false, error: id.error.issues[0]?.message ?? "Richiesta non valida." };
  const anteprima = await anteprimaCompletamento(id.data);
  return { ok: true, anteprima };
}

export type CompletaState = {
  esito?: "ok" | "errore";
  messaggio?: string;
  passoFallito?: string;
  passiEseguiti?: string[];
  avvisi?: string[];
};

const completaSchema = z.object({
  richiestaId: z.string().uuid("Richiesta non valida."),
  confermaEmail: z.string().trim().min(3, "Ridigita l'email dell'account.").max(320),
  anteprimaVerificata: z.literal("on", { message: "Conferma di aver verificato l'anteprima." }),
  forza: z.literal("on").optional(),
});

export async function completaCancellazioneAction(
  _prev: CompletaState,
  formData: FormData
): Promise<CompletaState> {
  const attore = await requireRootSuperadmin();

  const parsed = completaSchema.safeParse({
    richiestaId: formData.get("richiestaId"),
    confermaEmail: formData.get("confermaEmail"),
    anteprimaVerificata: formData.get("anteprimaVerificata") ?? undefined,
    forza: formData.get("forza") ?? undefined,
  });
  if (!parsed.success) {
    return { esito: "errore", messaggio: parsed.error.issues[0]?.message ?? "Dati non validi." };
  }

  try {
    const esito = await eseguiCompletamento({
      richiestaId: parsed.data.richiestaId,
      confermaEmail: parsed.data.confermaEmail,
      attoreId: attore.id,
      forza: parsed.data.forza === "on",
    });
    revalidatePath("/admin/impostazioni/cancellazioni");
    if (!esito.ok) {
      return {
        esito: "errore",
        messaggio: esito.errore,
        passoFallito: esito.passoFallito,
        passiEseguiti: esito.passiEseguiti,
      };
    }
    return {
      esito: "ok",
      messaggio: esito.riferimento
        ? `Cancellazione completata. Riferimento ${esito.riferimento}.`
        : "Cancellazione completata.",
      passiEseguiti: esito.passiEseguiti,
      avvisi: esito.avvisi,
    };
  } catch (e) {
    logger.error("admin/cancellazioni", "eccezione non gestita:", e instanceof Error ? e.message : e);
    return {
      esito: "errore",
      messaggio: "Errore imprevisto. Controlla i log: l'operazione potrebbe essere a metà.",
    };
  }
}

export type AnnullaResult =
  | { ok: true; messaggio: string }
  | { ok: false; error: string };

const annullaSchema = z.object({
  richiestaId: z.string().uuid("Richiesta non valida."),
  motivo: z
    .string()
    .trim()
    .min(MOTIVAZIONE_MIN, `La motivazione deve avere almeno ${MOTIVAZIONE_MIN} caratteri.`)
    .max(2000, "La motivazione è troppo lunga (massimo 2000 caratteri)."),
});

/** Ripensamento dell'interessato dopo la conferma: solo root, motivazione obbligatoria. */
export async function annullaCancellazioneAction(richiestaId: string, motivo: string): Promise<AnnullaResult> {
  const attore = await requireRootSuperadmin();
  const parsed = annullaSchema.safeParse({ richiestaId, motivo });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  try {
    const esito = await annullaCancellazioneConfermata({
      richiestaId: parsed.data.richiestaId,
      attoreId: attore.id,
      motivo: parsed.data.motivo,
    });
    revalidatePath("/admin/impostazioni/cancellazioni");
    revalidatePath("/admin/utenti");
    revalidatePath("/artisti");
    if (!esito.ok) return { ok: false, error: esito.error };
    return {
      ok: true,
      messaggio:
        (esito.accessoRipristinato
          ? "Cancellazione annullata, accesso ripristinato."
          : "Cancellazione annullata. L'account resta sospeso: l'accesso non è stato riaperto.") +
        (esito.notified ? " L'utente è stato avvisato via email." : " L'email all'utente non è partita: scrivigli a mano."),
    };
  } catch (e) {
    logger.error("admin/cancellazioni", "annullamento, eccezione:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Errore imprevisto. Controlla i log: l'operazione è ripetibile." };
  }
}
