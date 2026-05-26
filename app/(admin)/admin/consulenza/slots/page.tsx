import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SlotsManager } from "@/components/admin/SlotsManager";

export const metadata = { title: "Slot consulenza — N'arte Admin" };
export const dynamic = "force-dynamic";

export default async function AdminConsulenzaSlotsPage() {
  const me = await getCurrentUser();
  if (me?.profile?.role === "consultant") redirect("/admin/consulenza");
  const admin = createAdminClient();
  const { data: slotsRaw } = await admin
    .from("consultant_slots")
    .select("id, slot_at, duration_min, is_active")
    .order("slot_at", { ascending: true });

  type Slot = { id: string; slot_at: string; duration_min: number; is_active: boolean };
  const slots = (slotsRaw ?? []) as unknown as Slot[];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/consulenza"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Appuntamenti
      </Link>
      <div>
        <h1 className="font-display text-2xl tracking-tight">Slot consulenza</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggiungi, attiva/disattiva o elimina gli slot orari prenotabili dagli utenti.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestione slot</CardTitle>
        </CardHeader>
        <CardContent>
          <SlotsManager initial={slots} />
        </CardContent>
      </Card>
    </div>
  );
}
