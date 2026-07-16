import Link from "next/link";
import { Mail, Phone, UserCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole, getConsultantForUser } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ConsultationStatusSelect,
  ConsultationNotes,
} from "@/components/admin/ConsultationRow";
import { AssignConsultantSelect } from "@/components/admin/AssignConsultantSelect";

export const metadata = { title: "Consulenza — N'arte Admin" };
export const dynamic = "force-dynamic";

type Status = "requested" | "confirmed" | "completed" | "cancelled";

const STATUS_LABEL: Record<Status, string> = {
  requested: "Richiesto",
  confirmed: "Confermato",
  completed: "Completato",
  cancelled: "Annullato",
};

const STATUS_VARIANT: Record<Status, "warning" | "success" | "muted" | "danger"> = {
  requested: "warning",
  confirmed: "success",
  completed: "muted",
  cancelled: "danger",
};

export default async function AdminConsulenzaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const admin = createAdminClient();
  const ALLOWED = ["requested", "confirmed", "completed", "cancelled"] as const;
  const filter = sp?.status && (ALLOWED as readonly string[]).includes(sp.status)
    ? (sp.status as Status)
    : null;

  // #15 — Accesso consentito a superadmin e consultant.
  const currentUser = await requireRole(["superadmin", "consultant"]);
  const isConsultant = currentUser.profile?.role === "consultant";
  const consultantRow = isConsultant ? await getConsultantForUser(currentUser.id) : null;

  // Se è consultant, restringe agli slot del consulente
  let slotIdFilter: string[] | null = null;
  if (isConsultant) {
    if (!consultantRow) {
      return (
        <div className="space-y-4">
          <h1 className="font-display text-2xl tracking-tight">Consulenza</h1>
          <p className="text-sm text-muted-foreground">
            Il tuo account non è collegato ad alcun profilo consulente. Contatta il superadmin.
          </p>
        </div>
      );
    }
    const { data: mySlots } = await admin
      .from("consultant_slots")
      .select("id")
      .eq("consultant_id", consultantRow.id);
    slotIdFilter = (mySlots ?? []).map((s) => (s as { id: string }).id);
    if (slotIdFilter.length === 0) slotIdFilter = ["00000000-0000-0000-0000-000000000000"];
  }

  let q = admin
    .from("consultations")
    .select(
      "id, name, email, phone, needs, status, admin_notes, created_at, slot_id, consultant_slots(slot_at, duration_min, consultant_id)"
    )
    .order("created_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  if (slotIdFilter) q = q.in("slot_id", slotIdFilter);

  const { data: rowsRaw } = await q;
  type Row = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    needs: string | null;
    status: Status;
    admin_notes: string | null;
    created_at: string;
    slot_id: string | null;
    consultant_slots: { slot_at: string; duration_min: number; consultant_id: string | null } | null;
  };
  const rows = (rowsRaw ?? []) as unknown as Row[];

  // #10 — Lookup consulenti per mostrare nome/ruolo per ogni appuntamento.
  const consultantIds = Array.from(
    new Set(
      rows
        .map((r) => r.consultant_slots?.consultant_id)
        .filter((v): v is string => Boolean(v))
    )
  );
  const consultantsMap = new Map<string, { name: string; role: string | null }>();
  if (consultantIds.length > 0) {
    const { data: cs } = await admin
      .from("consultants")
      .select("id, name, role")
      .in("id", consultantIds);
    for (const c of (cs ?? []) as { id: string; name: string; role: string | null }[]) {
      consultantsMap.set(c.id, { name: c.name, role: c.role });
    }
  }

  // #12 — Elenco consulenti attivi per assegnare gli slot legacy (solo superadmin).
  let activeConsultants: { id: string; name: string }[] = [];
  if (!isConsultant) {
    const { data: ac } = await admin
      .from("consultants")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });
    activeConsultants = (ac ?? []) as { id: string; name: string }[];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Consulenza</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestisci gli appuntamenti telefonici dei consulenti N&apos;arte.
          </p>
        </div>
        {!isConsultant && (
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/consulenza/slots">Gestisci slot</Link>
          </Button>
        )}
        {isConsultant && consultantRow && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/consulenza/consulenti/${consultantRow.id}`}>I miei slot</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <FilterChip href="/admin/consulenza" active={!filter}>
          Tutti
        </FilterChip>
        {ALLOWED.map((s) => (
          <FilterChip
            key={s}
            href={`/admin/consulenza?status=${s}`}
            active={filter === s}
          >
            {STATUS_LABEL[s]}
          </FilterChip>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} {rows.length === 1 ? "appuntamento" : "appuntamenti"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun appuntamento al momento.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => {
                const slotAt = r.consultant_slots?.slot_at
                  ? new Date(r.consultant_slots.slot_at).toLocaleString("it-IT", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })
                  : "Slot rimosso";
                // #10 — Consulente associato all'appuntamento (via consultant_slots.consultant_id).
                const cId = r.consultant_slots?.consultant_id ?? null;
                const consultant = cId ? consultantsMap.get(cId) ?? null : null;
                const hasSlot = Boolean(r.slot_id);
                return (
                  <div
                    key={r.id}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-base">{r.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{slotAt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[r.status]} dot>
                          {STATUS_LABEL[r.status]}
                        </Badge>
                        <ConsultationStatusSelect consultationId={r.id} status={r.status} />
                      </div>
                    </div>
                    {/* #10 — Consulente assegnato */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <UserCircle className="size-3.5" />
                        {consultant ? (
                          <span className="text-foreground">
                            {consultant.name}
                            {consultant.role ? ` · ${consultant.role}` : ""}
                          </span>
                        ) : (
                          <span>Consulente N&apos;arte — non assegnato</span>
                        )}
                      </span>
                      {/* #12 — Assegnazione consulente per slot legacy (solo superadmin) */}
                      {!isConsultant && !consultant && hasSlot && r.slot_id && (
                        <AssignConsultantSelect
                          slotId={r.slot_id}
                          consultants={activeConsultants}
                        />
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <a
                        href={`mailto:${r.email}`}
                        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="size-3" /> {r.email}
                      </a>
                      {r.phone && (
                        <a
                          href={`tel:${r.phone}`}
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Phone className="size-3" /> {r.phone}
                        </a>
                      )}
                    </div>
                    {r.needs && (
                      <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                        {r.needs}
                      </p>
                    )}
                    <div className="mt-3">
                      <ConsultationNotes
                        consultationId={r.id}
                        initialNotes={r.admin_notes}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 uppercase tracking-wide transition ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-background text-foreground hover:border-accent"
      }`}
    >
      {children}
    </Link>
  );
}
