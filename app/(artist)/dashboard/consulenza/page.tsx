import { Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  ArtistConsulenzaCalendar,
  type CalendarConsultant,
  type CalendarSlot,
} from "@/components/dashboard/ArtistConsulenzaCalendar";

export const metadata = { title: "Consulente N'arte — Dashboard" };
export const dynamic = "force-dynamic";

export default async function ArtistConsulenzaPage() {
  await requireRole(["artist", "superadmin"]);
  const admin = createAdminClient();

  const nowIso = new Date().toISOString();

  const { data: consRaw } = await admin
    .from("consultants")
    .select("id, name, role, bio, avatar_url")
    .eq("is_active", true)
    .order("name", { ascending: true });
  const realConsultants = (consRaw ?? []) as unknown as CalendarConsultant[];

  const ids = realConsultants.map((c) => c.id);

  // #11 — Includi anche gli slot legacy (consultant_id IS NULL): sono prenotabili
  // sotto un consulente generico "Consulente N'arte".
  const LEGACY_CONSULTANT_ID = "legacy-narte";
  type RawSlot = {
    id: string;
    slot_at: string;
    duration_min: number;
    consultant_id: string | null;
  };
  let slotsAll: RawSlot[] = [];
  {
    const orFilter =
      ids.length > 0
        ? `consultant_id.is.null,consultant_id.in.(${ids.join(",")})`
        : "consultant_id.is.null";
    const { data: slotsRaw } = await admin
      .from("consultant_slots")
      .select("id, slot_at, duration_min, consultant_id")
      .eq("is_active", true)
      .gte("slot_at", nowIso)
      .or(orFilter)
      .order("slot_at", { ascending: true })
      .limit(500);
    slotsAll = (slotsRaw ?? []) as unknown as RawSlot[];
  }

  // Espone un consulente generico solo se esistono slot legacy.
  const hasLegacy = slotsAll.some((s) => s.consultant_id === null);
  const consultants: CalendarConsultant[] = [
    ...realConsultants,
    ...(hasLegacy
      ? [
          {
            id: LEGACY_CONSULTANT_ID,
            name: "Consulente N'arte",
            role: "Team N'arte",
            bio: "Un consulente del team N'arte ti ricontatterà nello slot scelto.",
            avatar_url: null,
          } satisfies CalendarConsultant,
        ]
      : []),
  ];

  // Mappa slot prenotati
  let bookedSet = new Set<string>();
  if (slotsAll.length > 0) {
    const { data: booked } = await admin
      .from("consultations")
      .select("slot_id")
      .in("slot_id", slotsAll.map((s) => s.id))
      .in("status", ["requested", "confirmed"]);
    bookedSet = new Set(((booked ?? []) as { slot_id: string }[]).map((b) => b.slot_id));
  }

  const slots: CalendarSlot[] = slotsAll.map((s) => ({
    id: s.id,
    slot_at: s.slot_at,
    duration_min: s.duration_min,
    // Gli slot legacy (consultant_id NULL) vengono raggruppati sotto il consulente generico.
    consultant_id: s.consultant_id ?? LEGACY_CONSULTANT_ID,
    is_booked: bookedSet.has(s.id),
  }));

  const hasAvailability = consultants.length > 0 && slots.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <Sparkles className="size-3.5" /> Gratuito · auto-conferma
        </span>
        <h1 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">
          Consulente N&apos;arte
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          Scegli un giorno dal calendario, poi seleziona orario e consulente. La prenotazione è
          gratuita e confermata automaticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendario disponibilità</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAvailability ? (
            <p className="text-sm text-muted-foreground">
              Nessuno slot disponibile al momento.
            </p>
          ) : (
            <ArtistConsulenzaCalendar consultants={consultants} slots={slots} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
