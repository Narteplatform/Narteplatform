import Link from "next/link";
import { Inbox, MessageSquare, Sparkles, Bug, MoreHorizontal } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { listPlatformFeedback, getPlatformFeedbackStats } from "@/lib/feedback/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PlatformFeedbackActions } from "@/components/admin/PlatformFeedbackRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feedback — N'arte Admin" };

type SP = {
  status?: string;
  role?: string;
  category?: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  generale: "Generale",
  suggerimento: "Suggerimento",
  bug: "Bug",
  altro: "Altro",
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  generale: <MessageSquare className="size-3" />,
  suggerimento: <Sparkles className="size-3" />,
  bug: <Bug className="size-3" />,
  altro: <MoreHorizontal className="size-3" />,
};

const STATUS_LABEL: Record<string, string> = {
  new: "Nuovo",
  read: "Letto",
  archived: "Archiviato",
};

const STATUS_VARIANT: Record<string, "accent" | "default" | "muted"> = {
  new: "accent",
  read: "default",
  archived: "muted",
};

function isValidStatus(v?: string): v is "new" | "read" | "archived" {
  return v === "new" || v === "read" || v === "archived";
}

function isValidRole(v?: string): v is "artist" | "organizer" {
  return v === "artist" || v === "organizer";
}

function isValidCategory(v?: string): v is "generale" | "bug" | "suggerimento" | "altro" {
  return v === "generale" || v === "bug" || v === "suggerimento" || v === "altro";
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireAdminPageAccess("feedback");
  const sp = await searchParams;
  const statusF = isValidStatus(sp.status) ? sp.status : undefined;
  const roleF = isValidRole(sp.role) ? sp.role : undefined;
  const catF = isValidCategory(sp.category) ? sp.category : undefined;

  const [stats, items] = await Promise.all([
    getPlatformFeedbackStats(),
    listPlatformFeedback({ status: statusF, role: roleF, category: catF }),
  ]);

  function tabHref(next: Partial<SP>) {
    const qs = new URLSearchParams();
    const merged = { status: sp.status, role: sp.role, category: sp.category, ...next };
    for (const [k, v] of Object.entries(merged)) {
      if (v) qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `/admin/feedback?${s}` : "/admin/feedback";
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Feedback piattaforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutti i messaggi inviati da artisti e organizzatori dalla sezione Feedback del proprio
          dashboard. Per recensioni post-evento (organizzatore→artista) vedi i singoli profili
          artista.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Totale</p>
            <p className="font-display text-2xl">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Non letti</p>
            <p className="font-display text-2xl text-accent">{stats.unread}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultimi 30gg</p>
            <p className="font-display text-2xl">{stats.last30}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Per ruolo</p>
            <p className="text-sm">
              <span className="font-semibold">{stats.byRole.artist}</span> artisti ·{" "}
              <span className="font-semibold">{stats.byRole.organizer}</span> organizzatori
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Stato:</span>
          <FilterChip href={tabHref({ status: undefined })} active={!statusF} label="Tutti" />
          <FilterChip
            href={tabHref({ status: "new" })}
            active={statusF === "new"}
            label={`Nuovi (${stats.unread})`}
          />
          <FilterChip href={tabHref({ status: "read" })} active={statusF === "read"} label="Letti" />
          <FilterChip
            href={tabHref({ status: "archived" })}
            active={statusF === "archived"}
            label="Archiviati"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Ruolo:</span>
          <FilterChip href={tabHref({ role: undefined })} active={!roleF} label="Tutti" />
          <FilterChip
            href={tabHref({ role: "artist" })}
            active={roleF === "artist"}
            label={`Artisti (${stats.byRole.artist})`}
          />
          <FilterChip
            href={tabHref({ role: "organizer" })}
            active={roleF === "organizer"}
            label={`Organizzatori (${stats.byRole.organizer})`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Categoria:</span>
        <FilterChip href={tabHref({ category: undefined })} active={!catF} label="Tutte" />
        {(["generale", "suggerimento", "bug", "altro"] as const).map((c) => (
          <FilterChip
            key={c}
            href={tabHref({ category: c })}
            active={catF === c}
            label={`${CATEGORY_LABEL[c]} (${stats.byCategory[c]})`}
          />
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Inbox className="mx-auto mb-2 size-6 opacity-50" />
            Nessun feedback con questi filtri.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <Card
              key={f.id}
              className={f.status === "archived" ? "opacity-60" : ""}
            >
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {f.subject || "(Senza oggetto)"}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    da{" "}
                    <span className="font-medium text-foreground">
                      {f.user_name || f.user_email || "Utente"}
                    </span>{" "}
                    · {f.role === "artist" ? "Artista" : "Organizzatore"} ·{" "}
                    {new Date(f.created_at).toLocaleString("it-IT")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={STATUS_VARIANT[f.status] ?? "default"} dot>
                    {STATUS_LABEL[f.status]}
                  </Badge>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    {CATEGORY_ICON[f.category]} {CATEGORY_LABEL[f.category]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{f.body}</p>
                {f.user_email && (
                  <p className="text-xs text-muted-foreground">
                    Rispondi a:{" "}
                    <Link
                      href={`mailto:${f.user_email}`}
                      className="text-accent hover:underline"
                    >
                      {f.user_email}
                    </Link>
                  </p>
                )}
                <PlatformFeedbackActions id={f.id} status={f.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
