import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import { corpoRiservato } from "@/lib/emails/corpo";
import { recuperaCorpoDalProvider } from "@/lib/emails/recupera-corpo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Email inviata — N'arte Admin" };
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABEL = { sent: "Inviata", failed: "Fallita", skipped: "Saltata" } as const;
const STATUS_VARIANT = { sent: "success", failed: "danger", skipped: "muted" } as const;

type Riga = {
  id: string;
  to_addresses: string[];
  subject: string;
  template: string | null;
  status: "sent" | "failed" | "skipped";
  provider_id: string | null;
  error: string | null;
  meta: unknown;
  sent_at: string;
  /** Presenti dalla 0075. */
  body_html?: string | null;
  body_source?: "salvato" | "provider" | "riservato" | null;
};

type Contenuto =
  | { tipo: "html"; html: string; nota: string | null }
  | { tipo: "riservato" }
  | { tipo: "assente"; motivo: string };

export default async function EmailDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (me?.profile?.role !== "superadmin") redirect("/");

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  // `*`: le colonne del corpo esistono solo con la 0075, e una select esplicita
  // fallirebbe senza.
  const { data, error } = await createAdminClient().from("email_log").select("*").eq("id", id).maybeSingle();
  if (error) {
    logger.error("admin/email", "lettura invio fallita:", error.message);
    return <Errore messaggio="Non riesco a leggere questo invio. Riprova fra un momento." />;
  }
  if (!data) notFound();
  const r = data as unknown as Riga;

  const meta = r.meta && typeof r.meta === "object" && !Array.isArray(r.meta) ? (r.meta as Record<string, unknown>) : {};
  const chiave = typeof meta.key === "string" ? meta.key : null;
  // Le righe Brevo hanno sempre meta.provider; per le più vecchie, senza, il
  // messageId di Brevo è fra parentesi angolari, l'id di Resend no.
  const provider: "brevo" | "resend" =
    meta.provider === "brevo" || meta.provider === "resend"
      ? meta.provider
      : r.provider_id?.startsWith("<")
        ? "brevo"
        : "resend";

  const contenuto = await caricaContenuto(r, chiave, provider);
  const quando = new Date(r.sent_at).toLocaleString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/email"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Torna agli invii
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="break-words text-lg">{r.subject}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">A</dt>
            <dd className="break-all">{r.to_addresses.join(", ")}</dd>
            <dt className="text-muted-foreground">Data</dt>
            <dd>{quando}</dd>
            <dt className="text-muted-foreground">Esito</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[r.status]} dot>
                {STATUS_LABEL[r.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                via {provider === "brevo" ? "Brevo" : "Resend"}
                {r.template ? ` · ${r.template}` : ""}
              </span>
            </dd>
            {r.error && (
              <>
                <dt className="text-muted-foreground">Errore</dt>
                <dd className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{r.error}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenuto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {contenuto.tipo === "html" && (
            <>
              {contenuto.nota && <p className="text-xs text-muted-foreground">{contenuto.nota}</p>}
              {/* sandbox vuoto: niente script, moduli o navigazione dall'email. */}
              <iframe
                title={`Contenuto dell'email «${r.subject}»`}
                sandbox=""
                srcDoc={contenuto.html}
                className="h-[75vh] min-h-[480px] w-full rounded-lg border border-border bg-white"
              />
            </>
          )}
          {contenuto.tipo === "riservato" && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Contenuto riservato: questa email contiene un link d&apos;accesso personale (impostazione della
                password, conferma della cancellazione…) e per sicurezza il testo non viene conservato.
              </span>
            </p>
          )}
          {contenuto.tipo === "assente" && <p className="text-sm text-muted-foreground">{contenuto.motivo}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

async function caricaContenuto(r: Riga, chiave: string | null, provider: "brevo" | "resend"): Promise<Contenuto> {
  if (r.body_source === "riservato" || corpoRiservato(r.template, chiave)) return { tipo: "riservato" };
  if (r.body_html) {
    return {
      tipo: "html",
      html: r.body_html,
      nota:
        provider === "brevo"
          ? "Ricomposta dal modello dell'email con i dati di questo invio: nei dettagli grafici può differire da quella consegnata. I link personali sono oscurati."
          : "I link personali sono oscurati.",
    };
  }
  if (r.status !== "sent") return { tipo: "assente", motivo: "L'email non è partita: non c'è un contenuto da mostrare." };
  if (!r.provider_id) return { tipo: "assente", motivo: "Contenuto non disponibile: l'invio non ha un identificativo del provider." };

  const esito = await recuperaCorpoDalProvider(provider, r.provider_id);
  if (esito.ok) {
    return {
      tipo: "html",
      html: esito.html,
      nota: `Recuperata da ${provider === "brevo" ? "Brevo" : "Resend"}: è un invio precedente alla conservazione del testo. I link personali sono oscurati.`,
    };
  }
  return {
    tipo: "assente",
    motivo:
      esito.motivo === "non_configurato"
        ? "Contenuto non disponibile: il collegamento al provider non è configurato in questo ambiente."
        : esito.motivo === "errore"
          ? "Il provider non ha risposto. Riprova fra un momento."
          : "Contenuto non più disponibile: il provider conserva il testo delle email solo per un periodo limitato.",
  };
}

function Errore({ messaggio }: { messaggio: string }) {
  return (
    <Card className="border-corallo/40 bg-corallo/10">
      <CardContent className="py-4 text-sm text-corallo-dark">{messaggio}</CardContent>
    </Card>
  );
}
