"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";
import { LIMITI } from "@/lib/security/rate-limit";
import { guardPublicForm } from "@/lib/security/form-guard";
import { honeypotShape } from "@/lib/validators/schemas";
import { publicFormConsent } from "@/lib/legal/consents";
import {
  registraProvaSuIubendaInBackground,
  TESTO_CASELLA,
} from "@/lib/legal/iubenda-consent";

export const eventRequestSchema = z.object({
  ...honeypotShape,
  /**
   * Presa visione dell'informativa. Obbligatoria come negli altri moduli
   * pubblici: qui si raccolgono nome, email, telefono e budget di una persona
   * identificabile, e si conservano.
   */
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: "Devi accettare l'informativa privacy per inviare" }),
  }),

  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(30).optional().or(z.literal("").transform(() => undefined)),
  eventType: z.string().min(2).max(120),
  eventDate: z.string().optional().or(z.literal("").transform(() => undefined)),
  location: z.string().max(160).optional().or(z.literal("").transform(() => undefined)),
  budget: z.string().max(60).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().min(10).max(2000),
});

export type EventRequestInput = z.infer<typeof eventRequestSchema>;

export async function submitEventRequest(input: EventRequestInput) {
  const parsed = eventRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Dati non validi" };
  const data = parsed.data;

  // Modulo pubblico: honeypot, controllo dei tempi di compilazione e doppia
  // soglia per IP e per indirizzo, tutto in una chiamata. Prima c'erano solo le
  // due soglie, montate a mano: la trappola anti-bot mancava del tutto, ed è
  // quella che ferma i moduli compilati da uno script in mezzo secondo.
  const guard = await guardPublicForm(input, LIMITI.form, {
    email: data.email,
    area: "richiesta-evento",
  });
  if (!guard.ok) return { ok: false as const, error: guard.error };

  const lines = [
    `**Tipo evento:** ${data.eventType}`,
    data.eventDate ? `**Data desiderata:** ${data.eventDate}` : null,
    data.location ? `**Luogo:** ${data.location}` : null,
    data.budget ? `**Budget:** ${data.budget}` : null,
    data.phone ? `**Telefono:** ${data.phone}` : null,
    "",
    data.message,
  ]
    .filter(Boolean)
    .join("\n");

  const admin = createAdminClient();
  const { error } = await admin.from("contact_messages").insert({
    name: data.name,
    email: data.email,
    subject: `Richiesta evento — ${data.eventType}`,
    message: lines,
    ...publicFormConsent(),
  });

  if (error) return { ok: false as const, error: error.message };

  registraProvaSuIubendaInBackground({
    email: data.email,
    nomeCompleto: data.name,
    documenti: ["privacy_policy"],
    preferenze: { privacy_policy: true },
    modulo: "Richiesta evento (home)",
    testoCasella: TESTO_CASELLA.privacy,
  });

  // Come il form Format, finora questa richiesta non avvisava nessuno.
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await dispatchEmail({
      key: "public_lead_admin",
      to: adminEmail,
      replyTo: data.email,
      params: {
        source: `Richiesta evento — ${data.eventType}`,
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        message: lines,
        adminUrl: `${getSiteUrl()}/admin/leads`,
      },
      subjectPreview: `Richiesta evento: ${data.name}`,
    }).catch((e) => console.error("[email] richiesta evento:", e));
  }

  return { ok: true as const };
}
