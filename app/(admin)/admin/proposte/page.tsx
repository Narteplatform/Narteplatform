import { AlertTriangle, Megaphone } from "lucide-react";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  QUOTA_SEGNALAZIONI_MENSILE as QUOTA,
  etichettaMese,
  meseCorrente,
  spostaMese,
  tabellaAssente,
} from "@/lib/referrals/periodo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import {
  ProfileReferralForm,
  type CandidatoDestinatario,
} from "@/components/admin/ProfileReferralForm";

export const metadata = { title: "Segnalazioni ai locali — N'arte Admin" };
export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Toglie i caratteri che hanno significato in un filtro ilike / or() di PostgREST. */
function ripulisciRicerca(q: string): string {
  return q.replace(/[%_,()\\*]/g, " ").trim().slice(0, 60);
}

const dataIt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export default async function AdminPropostePage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  await requireAdminPageAccess("proposte");
  const sp = await searchParams;
  const q = ripulisciRicerca(first(sp.q));
  const artistaScelto = first(sp.artista);

  const admin = createAdminClient();
  const corrente = meseCorrente();
  const scorso = spostaMese(corrente, -1);
  const primaDelloScorso = spostaMese(corrente, -2);

  const [artistsRes, referralsRes, storicoRes] = await Promise.all([
    admin.from("artists").select("id, stage_name, slug, is_public").eq("tier", "max").order("stage_name"),
    admin
      .from("profile_referrals")
      .select("artist_id, period_month")
      .eq("email_status", "inviata")
      .in("period_month", [corrente, scorso, primaDelloScorso]),
    admin
      .from("profile_referrals")
      .select("id, created_at, artist_id, sent_by, recipient_name, recipient_email, email_status, period_month, note")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (artistsRes.error) {
    logger.error("admin/proposte", "lettura artisti Max fallita:", artistsRes.error.message);
    return (
      <ErroreLettura messaggio="Non riesco a leggere l'elenco degli artisti Max. Riprova fra un momento." />
    );
  }
  const tabellaMancante =
    (referralsRes.error && tabellaAssente(referralsRes.error.code)) ||
    (storicoRes.error && tabellaAssente(storicoRes.error.code));
  if (tabellaMancante) {
    return (
      <ErroreLettura messaggio="Il registro delle segnalazioni non esiste ancora: la migration 0068 è da applicare dal SQL editor di Supabase." />
    );
  }
  if (referralsRes.error || storicoRes.error) {
    logger.error(
      "admin/proposte",
      "lettura segnalazioni fallita:",
      referralsRes.error?.message ?? storicoRes.error?.message,
    );
    return <ErroreLettura messaggio="Non riesco a leggere le segnalazioni. Riprova fra un momento." />;
  }

  const artisti = artistsRes.data ?? [];
  const conteggi = new Map<string, Record<string, number>>();
  for (const r of referralsRes.data ?? []) {
    const per = conteggi.get(r.artist_id) ?? {};
    per[r.period_month] = (per[r.period_month] ?? 0) + 1;
    conteggi.set(r.artist_id, per);
  }
  const conta = (id: string, mese: string) => conteggi.get(id)?.[mese] ?? 0;

  // Nomi per lo storico: artisti (anche non più Max) e autori.
  const storico = storicoRes.data ?? [];
  const nomiArtista = new Map(artisti.map((a) => [a.id, a.stage_name]));
  const idMancanti = [...new Set(storico.map((s) => s.artist_id).filter((id) => !nomiArtista.has(id)))];
  if (idMancanti.length > 0) {
    const { data, error } = await admin.from("artists").select("id, stage_name").in("id", idMancanti);
    if (error) logger.warn("admin/proposte", "nomi artisti storico non letti:", error.message);
    for (const a of data ?? []) nomiArtista.set(a.id, a.stage_name);
  }
  const nomiAutore = new Map<string, string>();
  const idAutori = [...new Set(storico.map((s) => s.sent_by).filter((id): id is string => !!id))];
  if (idAutori.length > 0) {
    const { data, error } = await admin.from("profiles").select("id, full_name").in("id", idAutori);
    if (error) logger.warn("admin/proposte", "nomi autori storico non letti:", error.message);
    for (const p of data ?? []) nomiAutore.set(p.id, p.full_name ?? "—");
  }

  // Destinatari registrati che corrispondono alla ricerca.
  const candidati: CandidatoDestinatario[] = [];
  let erroreRicerca: string | null = null;
  if (q.length >= 2) {
    const [venuesRes, orgsRes] = await Promise.all([
      admin
        .from("venues")
        .select("id, name, city, email")
        .ilike("name", `%${q}%`)
        .not("email", "is", null)
        .order("name")
        .limit(10),
      admin.from("organizers").select("id, user_id, display_name").ilike("display_name", `%${q}%`).order("display_name").limit(10),
    ]);
    if (venuesRes.error || orgsRes.error) {
      logger.error("admin/proposte", "ricerca destinatari fallita:", venuesRes.error?.message ?? orgsRes.error?.message);
      erroreRicerca = "La ricerca non è andata a buon fine. Riprova o inserisci il destinatario a mano.";
    } else {
      for (const v of venuesRes.data ?? []) {
        if (!v.email) continue;
        candidati.push({
          value: `venue:${v.id}`,
          name: v.name,
          detail: `struttura${v.city ? ` · ${v.city}` : ""} · ${v.email}`,
        });
      }
      for (const o of orgsRes.data ?? []) {
        const { data: u, error } = await admin.auth.admin.getUserById(o.user_id);
        if (error || !u?.user?.email) continue;
        candidati.push({
          value: `org:${o.id}`,
          name: o.display_name,
          detail: `organizzatore · ${u.user.email}`,
        });
      }
    }
  }

  const opzioniArtista = artisti.filter((a) => a.is_public).map((a) => ({ id: a.id, name: a.stage_name }));
  const defaultArtista = opzioniArtista.some((a) => a.id === artistaScelto) ? artistaScelto : "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tight">Segnalazioni ai locali</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Col piano Max il Team segnala il profilo dell&apos;artista ad almeno {QUOTA} strutture al
          mese. N&apos;arte segnala e si ferma lì: non partecipa alla trattativa. Il conteggio è sul
          mese solare, fuso Europe/Rome; contano solo le segnalazioni con email partita.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Quota del mese: {etichettaMese(corrente)}</CardTitle>
        </CardHeader>
        <CardContent>
          {artisti.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun artista con il piano Max.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Artista</th>
                    <th className="py-2 pr-4 font-semibold">Questo mese</th>
                    <th className="py-2 pr-4 font-semibold">{etichettaMese(scorso)}</th>
                    <th className="py-2 pr-4 font-semibold">{etichettaMese(primaDelloScorso)}</th>
                    <th className="py-2 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {artisti.map((a) => {
                    const ora = conta(a.id, corrente);
                    const m1 = conta(a.id, scorso);
                    const m2 = conta(a.id, primaDelloScorso);
                    const rimedio = m1 < QUOTA && m2 < QUOTA;
                    return (
                      <tr key={a.id} className="border-t border-border">
                        <td className="py-2 pr-4 font-medium">
                          {a.stage_name}
                          {!a.is_public && (
                            <span className="ml-2 text-xs text-muted-foreground">(non pubblico)</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={ora >= QUOTA ? "success" : "warning"} dot>
                            {ora}/{QUOTA}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={m1 >= QUOTA ? "success" : "danger"}>{m1}/{QUOTA}</Badge>
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={m2 >= QUOTA ? "success" : "danger"}>{m2}/{QUOTA}</Badge>
                        </td>
                        <td className="py-2">
                          {rimedio && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-corallo-dark">
                              <AlertTriangle className="size-3.5" aria-hidden="true" />
                              Due mesi sotto quota: l&apos;artista può chiedere proroga o cessazione
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            L&apos;avviso sui due mesi vale per i due mesi solari conclusi. Se l&apos;artista è passato
            a Max da poco, verifica la data di attivazione prima di trarne conseguenze.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-4" aria-hidden="true" />
            Segnala questo artista
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
            {defaultArtista && <input type="hidden" name="artista" value={defaultArtista} />}
            <div className="min-w-[14rem] flex-1">
              <Label htmlFor="q">Cerca fra strutture e organizzatori registrati</Label>
              <Input id="q" name="q" defaultValue={q} placeholder="Nome (almeno 2 lettere)" maxLength={60} />
            </div>
            <Button type="submit" variant="outline">
              Cerca
            </Button>
          </form>
          {q.length > 0 && q.length < 2 && (
            <p className="text-sm text-muted-foreground">Scrivi almeno 2 lettere.</p>
          )}
          {erroreRicerca && (
            <p role="alert" className="text-sm text-corallo-dark">
              {erroreRicerca}
            </p>
          )}
          {q.length >= 2 && !erroreRicerca && candidati.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nessun risultato con un&apos;email. Puoi inserire il destinatario a mano.
            </p>
          )}

          {opzioniArtista.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun artista Max con profilo pubblico.</p>
          ) : (
            <ProfileReferralForm
              key={`${q}|${defaultArtista}|${candidati.length}`}
              artists={opzioniArtista}
              defaultArtistId={defaultArtista}
              candidates={candidati}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storico (ultime 100)</CardTitle>
        </CardHeader>
        <CardContent>
          {storico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna segnalazione registrata.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Data</th>
                    <th className="py-2 pr-4 font-semibold">Artista</th>
                    <th className="py-2 pr-4 font-semibold">Destinatario</th>
                    <th className="py-2 pr-4 font-semibold">Email</th>
                    <th className="py-2 font-semibold">Inviata da</th>
                  </tr>
                </thead>
                <tbody>
                  {storico.map((s) => (
                    <tr key={s.id} className="border-t border-border align-top">
                      <td className="whitespace-nowrap py-2 pr-4">{dataIt.format(new Date(s.created_at))}</td>
                      <td className="py-2 pr-4">{nomiArtista.get(s.artist_id) ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {s.recipient_name}
                        <span className="block text-xs text-muted-foreground">{s.recipient_email}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={s.email_status === "inviata" ? "success" : "danger"}>
                          {s.email_status === "inviata" ? "Inviata" : "Non inviata"}
                        </Badge>
                      </td>
                      <td className="py-2">{s.sent_by ? (nomiAutore.get(s.sent_by) ?? "—") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ErroreLettura({ messaggio }: { messaggio: string }) {
  return (
    <Card className="border-corallo/40 bg-corallo/10">
      <CardContent className="flex items-start gap-3 py-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-corallo-dark" aria-hidden="true" />
        <p className="text-sm text-corallo-dark">{messaggio}</p>
      </CardContent>
    </Card>
  );
}
