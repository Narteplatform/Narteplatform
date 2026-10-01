"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { DURATA_ACCESSO_MINUTI, registroAssente } from "@/lib/chat/access";
import { registraAzione } from "@/lib/moderation/decisioni";

export type AccessoState = { error?: string };

const schema = z.object({
  conversationId: z.string().uuid("Conversazione non valida"),
  category: z.enum(["assistenza", "contestazione", "segnalazione", "obbligo_di_legge"], {
    message: "Scegli il motivo dell'accesso",
  }),
  reason: z
    .string()
    .trim()
    .min(10, "La motivazione deve avere almeno 10 caratteri")
    .max(1000, "Massimo 1000 caratteri"),
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[SRD]-[0-9A-F]{8}$/, "Il riferimento ha la forma S-XXXXXXXX, R-XXXXXXXX o D-XXXXXXXX")
    .optional(),
});

/**
 * Registra l'accesso e apre la conversazione per DURATA_ACCESSO_MINUTI.
 * Se la scrittura del registro non riesce non si apre nulla.
 */
export async function apriConversazioneMotivata(
  _prev: AccessoState,
  formData: FormData,
): Promise<AccessoState> {
  const user = await requireAdminPageAccess("chat");

  const rawRef = String(formData.get("reference") ?? "").trim();
  const parsed = schema.safeParse({
    conversationId: formData.get("conversationId"),
    category: formData.get("category"),
    reason: formData.get("reason"),
    reference: rawRef === "" ? undefined : rawRef,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const { conversationId, category, reason, reference } = parsed.data;

  const admin = createAdminClient();
  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();
  if (convErr) return { error: "Non riesco a verificare la conversazione. Riprova." };
  if (!conv) return { error: "Conversazione non trovata" };

  const expiresAt = new Date(Date.now() + DURATA_ACCESSO_MINUTI * 60_000).toISOString();
  const { error } = await admin.from("chat_access_log").insert({
    admin_user_id: user.id,
    conversation_id: conversationId,
    reason_category: category,
    reason_text: reason,
    report_reference: reference ?? null,
    expires_at: expiresAt,
  });
  if (error) {
    if (registroAssente(error.code)) {
      return { error: "Per aprire le conversazioni applica la migration 0064." };
    }
    logger.error("chat-access", "registrazione accesso fallita:", error.message);
    return { error: "Non sono riuscito a registrare l'accesso, quindi la conversazione non è stata aperta." };
  }

  // Seconda traccia, nel registro unico delle azioni del team. Non blocca.
  await registraAzione({
    actorId: user.id,
    targetType: "conversazione",
    targetId: conversationId,
    action: "chat_aperta",
    descrizione: `Conversazione aperta per ${DURATA_ACCESSO_MINUTI} minuti (${category}): ${reason}`,
  });

  redirect(`/admin/chat/${conversationId}`);
}
