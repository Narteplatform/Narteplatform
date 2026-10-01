import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ConsultationParams } from "@/lib/brevo/registry";
import { getSiteUrl } from "@/lib/site-url";
import { formatDateRome, formatMinutes, formatTimeRome, googleCalendarUrl, toPlainText } from "@/lib/emails/format";

/**
 * Params delle email di consulenza nel formato dei template Brevo.
 *
 * Modalità, link e tema non hanno ancora una colonna: restano vuoti e le
 * relative righe della scheda non compaiono.
 */
export async function buildConsultationParams(
  admin: SupabaseClient,
  o: {
    slotAt: string;
    durationMin: number | null;
    consultantId: string | null;
    name: string;
    email: string;
    phone: string;
    notes: string;
    statusLabel: string;
    panelPath: string;
  }
): Promise<ConsultationParams> {
  let consultantName = "";
  if (o.consultantId) {
    // Sola lettura per una riga facoltativa: in caso di errore la riga manca.
    const { data, error } = await admin
      .from("consultants")
      .select("name")
      .eq("id", o.consultantId)
      .maybeSingle();
    if (!error && data) consultantName = (data as { name: string }).name ?? "";
  }
  const base = getSiteUrl();
  return {
    name: o.name,
    consultantName,
    dateLabel: formatDateRome(o.slotAt),
    timeLabel: formatTimeRome(o.slotAt),
    durationLabel: formatMinutes(o.durationMin),
    modeLabel: "",
    meetingUrl: "",
    topic: "",
    statusLabel: o.statusLabel,
    notes: toPlainText(o.notes),
    panelUrl: `${base}${o.panelPath}`,
    calendarUrl: googleCalendarUrl({
      title: "Consulenza N'arte",
      start: new Date(o.slotAt),
      durationMin: o.durationMin ?? 30,
    }),
    email: o.email,
    phone: o.phone,
    adminUrl: `${base}/admin/consulenza`,
  };
}
