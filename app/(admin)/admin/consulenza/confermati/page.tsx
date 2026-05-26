import Link from "next/link";
import { ArrowLeft, Mail, Phone, User2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser, getConsultantForUser } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  ConsultationStatusSelect,
  ConsultationNotes,
} from "@/components/admin/ConsultationRow";

export const metadata = { title: "Slot confermati — N'arte Admin" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  needs: string | null;
  status: "requested" | "confirmed" | "completed" | "cancelled";
  admin_notes: string | null;
  created_at: string;
  user_id: string | null;
  consultant_slots: {
    slot_at: string;
    duration_min: number;
    consultant_id: string | null;
  } | null;
};

export default async function AdminConsulenzaConfermatiPage({
  searchParams,
}: {
  searchParams: Promise<{ when?: string }>;
}) {
  const sp = await searchParams;
  const filter: "upcoming" | "past" | "all" =
    sp?.when === "past" ? "past" : sp?.when === "all" ? "all" : "upcoming";

  const admin = createAdminClient();

  const me = await getCurrentUser();
  const isConsultant = me?.profile?.role === "consultant";
  let consultantId: string | null = null;
  if (isConsultant) {
    const row = await getConsultantForUser(me!.id);
    consultantId = row?.id ?? null;
  }

  let q = admin
    .from("consultations")
    .select(
      "id, name, email, phone, needs, status, admin_notes, created_at, user_id, consultant_slots!inner(slot_at, duration_min, consultant_id)"
    )
    .eq("status", "confirmed");
  if (isConsultant && consultantId) {
    q = q.eq("consultant_slots.consultant_id", consultantId);
  }

  const { data: rowsRaw } = await q;
  let rows = (rowsRaw ?? []) as unknown as Row[];

  // Filtra per upcoming/past
  const now = new Date();
  if (filter === "upcoming") {
    rows = rows.filter(
      (r) => r.consultant_slots && new Date(r.consultant_slots.slot_at) >= now
    );
  } else if (filter === "past") {
    rows = rows.filter(
      (r) => r.consultant_slots && new Date(r.consultant_slots.slot_at) < now
    );
  }
  rows.sort((a, b) => {
    const at = a.consultant_slots?.slot_at ?? "";
    const bt = b.consultant_slots?.slot_at ?? "";
    return filter === "past" ? bt.localeCompare(at) : at.localeCompare(bt);
  });

  // Lookup consulenti + artisti
  const consultantIds = Array.from(
    new Set(
      rows
        .map((r) => r.consultant_slots?.consultant_id)
        .filter((v): v is string => Boolean(v))
    )
  );
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]));

  const consultantsMap = new Map<
    string,
    { name: string; role: string | null; avatar_url: string | null; email: string | null; phone: string | null }
  >();
  if (consultantIds.length > 0) {
    const { data: cs } = await admin
      .from("consultants")
      .select("id, name, role, avatar_url, email, phone")
      .in("id", consultantIds);
    for (const c of (cs ?? []) as {
      id: string;
      name: string;
      role: string | null;
      avatar_url: string | null;
      email: string | null;
      phone: string | null;
    }[]) {
      consultantsMap.set(c.id, c);
    }
  }

  const artistsMap = new Map<string, { stage_name: string; slug: string; cover_image: string | null }>();
  if (userIds.length > 0) {
    const { data: ar } = await admin
      .from("artists")
      .select("user_id, stage_name, slug, cover_image")
      .in("user_id", userIds);
    for (const a of (ar ?? []) as {
      user_id: string;
      stage_name: string;
      slug: string;
      cover_image: string | null;
    }[]) {
      artistsMap.set(a.user_id, {
        stage_name: a.stage_name,
        slug: a.slug,
        cover_image: a.cover_image,
      });
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/consulenza"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Indietro
      </Link>

      <div>
        <h1 className="font-display text-2xl tracking-tight">Slot confermati</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Appuntamenti confermati con artisti/utenti e dettagli dei consulenti coinvolti.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <FilterChip href="/admin/consulenza/confermati" active={filter === "upcoming"}>
          In arrivo
        </FilterChip>
        <FilterChip href="/admin/consulenza/confermati?when=past" active={filter === "past"}>
          Passati
        </FilterChip>
        <FilterChip href="/admin/consulenza/confermati?when=all" active={filter === "all"}>
          Tutti
        </FilterChip>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} {rows.length === 1 ? "appuntamento confermato" : "appuntamenti confermati"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessuno slot confermato in questa vista.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => {
                const slot = r.consultant_slots;
                const consultantId = slot?.consultant_id ?? null;
                const consultant = consultantId ? consultantsMap.get(consultantId) ?? null : null;
                const artist = r.user_id ? artistsMap.get(r.user_id) ?? null : null;
                const slotAt = slot
                  ? new Date(slot.slot_at).toLocaleString("it-IT", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })
                  : "Slot rimosso";

                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-base capitalize">{slotAt}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Durata {slot?.duration_min ?? "—"} min · creato il{" "}
                          {new Date(r.created_at).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success" dot>
                          Confermato
                        </Badge>
                        <ConsultationStatusSelect consultationId={r.id} status={r.status} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {/* ARTISTA / RICHIEDENTE */}
                      <div className="rounded-lg border border-border bg-muted p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {artist ? "Artista" : "Richiedente"}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <Avatar
                            src={artist?.cover_image ?? null}
                            name={artist?.stage_name ?? r.name}
                            size="md"
                          />
                          <div className="min-w-0">
                            {artist ? (
                              <Link
                                href={`/artisti/${artist.slug}`}
                                className="font-display text-sm hover:text-accent"
                                target="_blank"
                              >
                                {artist.stage_name}
                              </Link>
                            ) : (
                              <p className="font-display text-sm">{r.name}</p>
                            )}
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {!artist && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-background px-1.5 py-0.5 text-[10px]">
                                  <User2 className="size-2.5" /> Esterno
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                          <a
                            href={`mailto:${r.email}`}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="size-3" /> {r.email}
                          </a>
                          {r.phone && (
                            <a
                              href={`tel:${r.phone}`}
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Phone className="size-3" /> {r.phone}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* CONSULENTE */}
                      <div className="rounded-lg border border-border bg-muted p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Consulente
                        </p>
                        {consultant ? (
                          <>
                            <div className="mt-2 flex items-center gap-3">
                              <Avatar
                                src={consultant.avatar_url}
                                name={consultant.name}
                                size="md"
                              />
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/consulenza/consulenti/${consultantId}`}
                                  className="font-display text-sm hover:text-accent"
                                >
                                  {consultant.name}
                                </Link>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {consultant.role ?? "Consulente"}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                              {consultant.email && (
                                <a
                                  href={`mailto:${consultant.email}`}
                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Mail className="size-3" /> {consultant.email}
                                </a>
                              )}
                              {consultant.phone && (
                                <a
                                  href={`tel:${consultant.phone}`}
                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Phone className="size-3" /> {consultant.phone}
                                </a>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Consulente non assegnato (slot legacy).
                          </p>
                        )}
                      </div>
                    </div>

                    {r.needs && (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Necessità
                        </p>
                        <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                          {r.needs}
                        </p>
                      </div>
                    )}

                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Note interne
                      </p>
                      <div className="mt-1">
                        <ConsultationNotes consultationId={r.id} initialNotes={r.admin_notes} />
                      </div>
                    </div>
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
