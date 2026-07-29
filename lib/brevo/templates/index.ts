/**
 * Manifest dei template email. È la fonte di verità unica: da qui leggono
 * sia la preview (`scripts/brevo-build.mjs`, `/dev/emails`) sia il push su
 * Brevo (`scripts/brevo-sync.mjs`), che non ha più un elenco proprio.
 */

import type { AnyTemplateDef } from "./types.ts";
import { APPLICATION_TEMPLATES } from "./application.ts";
import { ORGANIZER_TEMPLATES } from "./organizer.ts";
import { BOOKING_TEMPLATES } from "./booking.ts";
import { BOOKING_STATUS_TEMPLATES } from "./booking-status.ts";
import { CHAT_TEMPLATES } from "./chat.ts";
import { CONSULTATION_TEMPLATES } from "./consultation.ts";
import { BILLING_TEMPLATES } from "./billing.ts";
import { CONTACT_TEMPLATES } from "./contact.ts";
import { ACCOUNT_TEMPLATES } from "./account.ts";
import { LIFECYCLE_TEMPLATES } from "./lifecycle.ts";

export type { TemplateDef, AnyTemplateDef } from "./types.ts";
export { defineTemplate } from "./types.ts";

export const TEMPLATES: readonly AnyTemplateDef[] = [
  ...APPLICATION_TEMPLATES,
  ...ORGANIZER_TEMPLATES,
  ...BOOKING_TEMPLATES,
  ...BOOKING_STATUS_TEMPLATES,
  ...CHAT_TEMPLATES,
  ...CONSULTATION_TEMPLATES,
  ...BILLING_TEMPLATES,
  ...CONTACT_TEMPLATES,
  ...ACCOUNT_TEMPLATES,
  ...LIFECYCLE_TEMPLATES,
];

/** Cerca un template per chiave. */
export function findTemplate(key: string): AnyTemplateDef | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
