import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ContentReportActions } from "@/components/admin/ContentReportActions";
import { REPORT_CATEGORIES, REPORT_TARGET_TYPES } from "@/lib/validators/schemas";
import type { Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const metadata = { title: "Segnalazioni — N'arte Admin" };
export const dynamic = "force-dynamic";

type Report = Database["public"]["Tables"]["content_reports"]["Row"];
type Status = Report["status"];
type Kind = Report["kind"];

const STATI: Status[] = ["ricevuta", "in_esame", "accolta", "respinta", "archiviata"];
const TIPI: Kind[] = ["segnalazione", "reclamo"];

const STATUS_LABEL: Record<Status, string> = {
  ricevuta: "Ricevuta",
  in_esame: "In esame",
  accolta: "Accolta",
  respinta: "Respinta",
  archiviata: "Archiviata",
};
const STATUS_VARIANT: Record<Status, "warning" | "accent" | "success" | "muted" | "outline"> = {
  ricevuta: "warning",
  in_esame: "accent",
  accolta: "success",
  respinta: "muted",
  archiviata: "outline",
};

/** Dove applicare la misura quando una segnalazione è accolta. */
const SEZIONE_MISURA: Record<Report["target_type"], { href: string; label: string }> = {
  profilo: { href: "/admin/artisti", label: "Artisti" },
  media: { href: "/admin/moderazione", label: "Moderazione" },
  recensione: { href: "/admin/recensioni", label: "Recensioni" },
  struttura: { href: "/admin/moderazione", label: "Moderazione" },
  messaggio: { href: "/admin/chat", label: "Chat" },
  decisione: { href: "/admin/moderazione", label: "Moderazione" },
  altro: { href: "/admin/moderazione", label: "Moderazione" },
};

/** Slug del profilo contenuto in un URL /artisti/<slug>, se c'è. */
function slugDaUrl(url: string | null): string | null {
  if (!url) return null;
  const m = /\/artisti\/([^/?#]+)/.exec(url);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" });
}

export default async function AdminSegnalazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; tipo?: string }>;
}) {
  await requireAdminPageAccess("segnalazioni");
  const sp = await searchParams;
  const stato = (STATI as string[]).includes(sp.stato ?? "") ? (sp.stato as Status) : null;
  const tipo = (TIPI as string[]).includes(sp.tipo ?? "") ? (sp.tipo as Kind) : null;

  const admin = createAdminClient();
  let q = admin.from("content_reports").select("*").order("created_at", { ascending: false }).limit(200);
  if (stato) q = q.eq("status", stato);
  if (tipo) q = q.eq("kind", tipo);
  const { data, error } = await q;

  const tabellaMancante = error?.code === "42P01" || error?.code === "PGRST205";

  // Segnalazioni per dati personali su un profilo: link diretto alla modifica
  // del profilo. Sola lettura; se la lettura fallisce o lo slug non si trova,
  // semplicemente nessun link.
  const profiloPerReport = new Map<string, string>();
  const slugPerReport = new Map<string, string>();
  for (const r of data ?? []) {
    if (r.category !== "dati_personali" || r.target_type !== "profilo") continue;
    const slug = slugDaUrl(r.target_url);
    if (slug) slugPerReport.set(r.id, slug);
  }
  if (slugPerReport.size > 0) {
    const { data: artisti, error: artistiErr } = await admin
      .from("artists")
      .select("id, slug")
      .in("slug", [...new Set(slugPerReport.values())]);
    if (artistiErr) {
      logger.warn("admin/segnalazioni", "ricerca profili per slug fallita", artistiErr.message);
    } else {
      const idPerSlug = new Map((artisti ?? []).map((a) => [a.slug, a.id]));
      for (const [reportId, slug] of slugPerReport) {
        const id = idPerSlug.get(slug);
        if (id) profiloPerReport.set(reportId, id);
      }
    }
  }

  const href = (over: { stato?: string | null; tipo?: string | null }) => {
    const p = new URLSearchParams();
    const s = over.stato === undefined ? stato : over.stato;
    const t = over.tipo === undefined ? tipo : over.tipo;
    if (s) p.set("stato", s);
    if (t) p.set("tipo", t);
    const qs = p.toString();
    return qs ? `/admin/segnalazioni?${qs}` : "/admin/segnalazioni";
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Segnalazioni e reclami</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Presa in carico entro 2 giorni lavorativi, esito di norma entro 7. Ogni decisione ha una
          motivazione e viene comunicata a chi ha segnalato.
        </p>
      </header>

      {tabellaMancante && (
        <div role="alert" className="flex gap-3 rounded-xl border border-[#E8A030] bg-[#E8A03018] p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Migration 0063 da applicare.</strong> La tabella <code>content_reports</code> non
            esiste ancora: finché manca, il modulo pubblico invita a scrivere da /contatti. Il file è
            <code> supabase/migrations/0063_content_reports.sql</code>, da incollare nel SQL editor di Supabase.
          </p>
        </div>
      )}

      {error && !tabellaMancante && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Impossibile leggere le segnalazioni: {error.message}. L&rsquo;elenco non è vuoto, è
          semplicemente non disponibile.
        </div>
      )}

      {!error && (
        <>
          <nav className="space-y-2 text-sm" aria-label="Filtri">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-12 text-xs uppercase tracking-wider text-muted-foreground">Stato</span>
              <FilterLink href={href({ stato: null })} active={!stato}>Tutti</FilterLink>
              {STATI.map((s) => (
                <FilterLink key={s} href={href({ stato: s })} active={stato === s}>
                  {STATUS_LABEL[s]}
                </FilterLink>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-12 text-xs uppercase tracking-wider text-muted-foreground">Tipo</span>
              <FilterLink href={href({ tipo: null })} active={!tipo}>Tutti</FilterLink>
              <FilterLink href={href({ tipo: "segnalazione" })} active={tipo === "segnalazione"}>Segnalazioni</FilterLink>
              <FilterLink href={href({ tipo: "reclamo" })} active={tipo === "reclamo"}>Reclami</FilterLink>
            </div>
          </nav>

          {(data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna segnalazione con questi filtri.</p>
          ) : (
            <ul className="space-y-4">
              {(data ?? []).map((r) => (
                <li key={r.id}>
                  <ReportCard r={r} profiloId={profiloPerReport.get(r.id) ?? null} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition",
        active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function ReportCard({ r, profiloId }: { r: Report; profiloId: string | null }) {
  const categoria = (REPORT_CATEGORIES as Record<string, string>)[r.category] ?? r.category;
  const misura = SEZIONE_MISURA[r.target_type];
  const interno = r.target_url?.startsWith("/");

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{r.reference}</span>
          <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
          <Badge variant={r.kind === "reclamo" ? "dark" : "muted"}>
            {r.kind === "reclamo" ? "Reclamo" : "Segnalazione"}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">{fmt(r.created_at)}</span>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm md:grid-cols-[9rem_1fr]">
          <Row label="Categoria">{categoria}</Row>
          <Row label="Oggetto">{REPORT_TARGET_TYPES[r.target_type]}</Row>
          {r.target_url && (
            <Row label="Contenuto">
              {interno ? (
                <Link href={r.target_url} target="_blank" className="underline underline-offset-2">
                  {r.target_url}
                </Link>
              ) : (
                <a href={r.target_url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
                  {r.target_url}
                </a>
              )}
            </Row>
          )}
          {profiloId && (
            <Row label="Profilo">
              <Link href={`/admin/artisti/${profiloId}`} className="underline underline-offset-2">
                Modifica il profilo segnalato
              </Link>
            </Row>
          )}
          {r.contested_reference && <Row label="Contesta">{r.contested_reference}</Row>}
          <Row label="Descrizione">
            <span className="whitespace-pre-wrap">{r.description}</span>
          </Row>
          <Row label="Segnalante">
            {r.reporter_name} ·{" "}
            <a href={`mailto:${r.reporter_email}`} className="underline underline-offset-2">
              {r.reporter_email}
            </a>
            {r.reporter_user_id ? " (con account)" : ""}
          </Row>
          <Row label="Buona fede">dichiarata il {fmt(r.good_faith_at)}</Row>
          {r.decided_at && (
            <>
              <Row label="Decisione">
                {STATUS_LABEL[r.status]} il {fmt(r.decided_at)}
              </Row>
              <Row label="Motivazione">
                <span className="whitespace-pre-wrap">{r.decision_note}</span>
              </Row>
              <Row label="Segnalante avvisato">
                {r.reporter_notified_at ? fmt(r.reporter_notified_at) : "no — scrivigli a mano"}
              </Row>
            </>
          )}
        </dl>

        {r.status === "accolta" && (
          <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
            <strong>Promemoria:</strong> accogliere la segnalazione non modifica il contenuto. Applica
            la misura da{" "}
            <Link href={misura.href} className="underline underline-offset-2">
              {misura.label}
            </Link>
            : la decisione va registrata e comunicata anche a chi ha pubblicato il contenuto.
          </p>
        )}

        <ContentReportActions id={r.id} status={r.status} />
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
