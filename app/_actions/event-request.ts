"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { getSiteUrl } from "@/lib/site-url";

export const eventRequestSchema = z.object({
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
  });

  if (error) return { ok: false as const, error: error.message };

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
