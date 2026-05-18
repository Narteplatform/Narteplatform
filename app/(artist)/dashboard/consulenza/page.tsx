import { Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  ArtistConsultationBooker,
  type ConsultantWithSlots,
} from "@/components/dashboard/ArtistConsultationBooker";

export const metadata = { title: "Consulente N'arte — Dashboard" };
export const dynamic = "force-dynamic";

export default async function ArtistConsulenzaPage() {
  await requireRole(["artist", "superadmin"]);
  const admin = createAdminClient();

  const nowIso = new Date().toISOString();

  const { data: consRaw } = await admin
    .from("consultants")
    .select("id, name, role, bio, avatar_url, email")
    .eq("is_active", true)
    .order("name", { ascending: true });
  type Consultant = {
    id: string;
    name: string;
    role: string | null;
    bio: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  const consultants = (consRaw ?? []) as unknown as Consultant[];
  const ids = consultants.map((c) => c.id);

  type SlotRow = {
    id: string;
    slot_at: string;
    duration_min: number;
    consultant_id: string;
  };
  let slots: SlotRow[] = [];
  if (ids.length > 0) {
    const { data: slotsRaw } = await admin
      .from("consultant_slots")
      .select("id, slot_at, duration_min, consultant_id")
      .eq("is_active", true)
      .gte("slot_at", nowIso)
      .in("consultant_id", ids)
      .order("slot_at", { ascending: true })
      .limit(120);
    slots = (slotsRaw ?? []) as unknown as SlotRow[];
  }

  // Filtra slot già prenotati
  let bookedSet = new Set<string>();
  if (slots.length > 0) {
    const { data: booked } = await admin
      .from("consultations")
      .select("slot_id")
      .in("slot_id", slots.map((s) => s.id))
      .in("status", ["requested", "confirmed"]);
    bookedSet = new Set(((booked ?? []) as { slot_id: string }[]).map((b) => b.slot_id));
  }

  const consultantsWithSlots: ConsultantWithSlots[] = consultants
    .map((c) => ({
      ...c,
      slots: slots
        .filter((s) => s.consultant_id === c.id && !bookedSet.has(s.id))
        .map(({ id, slot_at, duration_min }) => ({ id, slot_at, duration_min })),
    }))
    .filter((c) => c.slots.length > 0);

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
          Prenota una consulenza telefonica gratuita con uno dei nostri consulenti. Per gli
          artisti N&apos;arte gli appuntamenti vengono confermati automaticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Slot disponibili</CardTitle>
        </CardHeader>
        <CardContent>
          <ArtistConsultationBooker consultants={consultantsWithSlots} />
        </CardContent>
      </Card>
    </div>
  );
}
