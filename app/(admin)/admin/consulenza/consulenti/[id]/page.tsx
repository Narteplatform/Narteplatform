import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole, getConsultantForUser } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ConsultantForm } from "@/components/admin/ConsultantForm";
import { ConsultantSlotsCalendar } from "@/components/admin/ConsultantSlotsCalendar";
import { ConsultantToggle, ConsultantDelete } from "@/components/admin/ConsultantActions";
import { LinkConsultantAccount } from "@/components/admin/LinkConsultantAccount";

export const metadata = { title: "Consulente — N'arte Admin" };
export const dynamic = "force-dynamic";

type Consultant = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  user_id: string | null;
};

type Slot = {
  id: string;
  slot_at: string;
  duration_min: number;
  is_active: boolean;
};

export default async function ConsultantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  // #15 — Accesso a superadmin e consultant; il consultant vede SOLO il proprio detail.
  const currentUser = await requireRole(["superadmin", "consultant"]);
  const isConsultant = currentUser.profile?.role === "consultant";
  if (isConsultant) {
    const own = await getConsultantForUser(currentUser.id);
    if (!own || own.id !== id) redirect("/admin/consulenza");
  }

  const [{ data: cRaw }, { data: slotsRaw }] = await Promise.all([
    admin
      .from("consultants")
      .select("id, name, role, email, phone, bio, avatar_url, is_active, user_id")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("consultant_slots")
      .select("id, slot_at, duration_min, is_active")
      .eq("consultant_id", id)
      .order("slot_at", { ascending: true }),
  ]);
  const consultant = cRaw as unknown as Consultant | null;
  if (!consultant) notFound();
  const slots = (slotsRaw ?? []) as unknown as Slot[];

  return (
    <div className="space-y-6">
      {!isConsultant && (
        <Link
          href="/admin/consulenza/consulenti"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Tutti i consulenti
        </Link>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={consultant.avatar_url} name={consultant.name} size="xl" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl tracking-tight">{consultant.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {consultant.role ?? "Consulente"}
                {consultant.email && <span> · {consultant.email}</span>}
                {consultant.phone && <span> · {consultant.phone}</span>}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Badge variant={consultant.is_active ? "success" : "muted"} dot>
                  {consultant.is_active ? "Attivo" : "Disattivo"}
                </Badge>
                <Badge variant={consultant.user_id ? "success" : "muted"}>
                  {consultant.user_id ? "Account collegato" : "Nessun account"}
                </Badge>
                {!isConsultant && (
                  <ConsultantToggle consultantId={consultant.id} isActive={consultant.is_active} />
                )}
              </div>
            </div>
          </div>
          {!isConsultant && <ConsultantDelete consultantId={consultant.id} name={consultant.name} />}
        </CardContent>
      </Card>

      {!isConsultant && !consultant.user_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account di login</CardTitle>
          </CardHeader>
          <CardContent>
            <LinkConsultantAccount
              consultantId={consultant.id}
              initialEmail={consultant.email}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profilo</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsultantForm
            initial={{
              id: consultant.id,
              name: consultant.name,
              role: consultant.role,
              email: consultant.email,
              phone: consultant.phone,
              bio: consultant.bio,
              avatarUrl: consultant.avatar_url,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disponibilità (calendario interattivo)</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsultantSlotsCalendar consultantId={consultant.id} initial={slots} />
        </CardContent>
      </Card>
    </div>
  );
}
