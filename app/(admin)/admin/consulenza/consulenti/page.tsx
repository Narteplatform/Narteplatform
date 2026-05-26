import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, User2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ConsultantToggle } from "@/components/admin/ConsultantActions";

export const metadata = { title: "Consulenti — N'arte Admin" };
export const dynamic = "force-dynamic";

type Consultant = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
};

export default async function AdminConsulentiPage() {
  const me = await getCurrentUser();
  if (me?.profile?.role === "consultant") redirect("/admin/consulenza");
  const admin = createAdminClient();
  const { data: rawList } = await admin
    .from("consultants")
    .select("id, name, role, email, phone, avatar_url, is_active, created_at")
    .order("name", { ascending: true });
  const consultants = (rawList ?? []) as unknown as Consultant[];

  // Slot count per consultant
  const ids = consultants.map((c) => c.id);
  const slotCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: slots } = await admin
      .from("consultant_slots")
      .select("consultant_id")
      .in("consultant_id", ids)
      .eq("is_active", true)
      .gte("slot_at", new Date().toISOString());
    for (const row of (slots ?? []) as { consultant_id: string }[]) {
      slotCounts.set(row.consultant_id, (slotCounts.get(row.consultant_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Consulenti N&apos;arte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea i profili dei consulenti e gestisci le loro disponibilità.
          </p>
        </div>
        <Button asChild variant="accent" size="sm">
          <Link href="/admin/consulenza/consulenti/new">
            <Plus className="size-4" /> Nuovo consulente
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {consultants.length} {consultants.length === 1 ? "consulente" : "consulenti"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {consultants.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun consulente. Creane uno per iniziare a gestire gli slot.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {consultants.map((c) => {
                const count = slotCounts.get(c.id) ?? 0;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-4 py-3"
                  >
                    <Avatar src={c.avatar_url} name={c.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/consulenza/consulenti/${c.id}`}
                        className="font-display text-base hover:text-accent"
                      >
                        {c.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.role ?? "Consulente"}
                        {c.email && <span> · {c.email}</span>}
                      </p>
                    </div>
                    <Badge variant={count > 0 ? "success" : "muted"}>
                      {count} slot futuri
                    </Badge>
                    <ConsultantToggle consultantId={c.id} isActive={c.is_active} />
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/consulenza/consulenti/${c.id}`}>
                        <User2 className="size-3.5" /> Dettaglio
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
