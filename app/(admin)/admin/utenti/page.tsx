import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { leggiSospensione } from "@/lib/admin/sospensione";
import { isUtenteSospeso } from "@/lib/auth/sospeso";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SospensioneAccount } from "@/components/admin/SospensioneAccount";
import { ChiusuraAccount } from "@/components/admin/ChiusuraAccount";
import { ApprovazioneOrganizzatore } from "@/components/admin/ApprovazioneOrganizzatore";
import { colonnaAssente } from "@/lib/admin/schema-compat";
import { contaOrganizzatoriInAttesa } from "@/lib/organizers/approvazione";

export const dynamic = "force-dynamic";
export const metadata = { title: "Utenti — N'arte Admin" };

const PER_PAGINA = 50;
/** Con una ricerca si scorre l'elenco pagina per pagina: tetto dichiarato in interfaccia. */
const PAGINE_MAX_RICERCA = 20;

const RUOLO: Record<string, string> = {
  superadmin: "Superadmin",
  artist: "Artista",
  organizer: "Organizzatore",
  consultant: "Consulente",
  user: "Utente",
};

function dataIt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function nomeMetadata(u: User): string {
  const m = (u.user_metadata ?? {}) as { full_name?: unknown; name?: unknown };
  return typeof m.full_name === "string" ? m.full_name : typeof m.name === "string" ? m.name : "";
}

type Caricamento =
  | { ok: true; utenti: User[]; pagina: number; ultima: number | null; ricerca: boolean }
  | { ok: false; error: string };

async function carica(q: string, pagina: number): Promise<Caricamento> {
  const admin = createAdminClient();

  if (!q) {
    const { data: res, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: PER_PAGINA });
    if (error) {
      logger.error("admin/utenti", `listUsers fallita: ${error.message}`);
      return { ok: false, error: "Non riesco a leggere l'elenco degli utenti." };
    }
    const ultima = "lastPage" in res && typeof res.lastPage === "number" ? res.lastPage : null;
    return { ok: true, utenti: res.users, pagina, ultima, ricerca: false };
  }

  // Nomi presenti solo in `profiles`: si cercano lì e si confrontano per id.
  const pattern = q.replace(/[%_\\,()]/g, " ").trim();
  const idPerNome = new Set<string>();
  if (pattern) {
    const { data: prof, error } = await admin
      .from("profiles")
      .select("id")
      .ilike("full_name", `%${pattern}%`)
      .limit(200);
    if (error) {
      logger.error("admin/utenti", `ricerca profili fallita: ${error.message}`);
      return { ok: false, error: "Ricerca non riuscita. Riprova." };
    }
    for (const p of prof ?? []) idPerNome.add(p.id);
  }

  const ago = q.toLowerCase();
  const trovati: User[] = [];
  for (let p = 1; p <= PAGINE_MAX_RICERCA; p++) {
    const { data: res, error } = await admin.auth.admin.listUsers({ page: p, perPage: PER_PAGINA });
    if (error) {
      logger.error("admin/utenti", `listUsers (ricerca, pagina ${p}) fallita: ${error.message}`);
      return { ok: false, error: "Ricerca non riuscita. Riprova." };
    }
    for (const u of res.users) {
      if (
        (u.email ?? "").toLowerCase().includes(ago) ||
        nomeMetadata(u).toLowerCase().includes(ago) ||
        idPerNome.has(u.id)
      ) {
        trovati.push(u);
      }
    }
    if (res.users.length < PER_PAGINA) break;
  }
  return { ok: true, utenti: trovati, pagina: 1, ultima: null, ricerca: true };
}

const FILTRO_IN_ATTESA = "organizzatori-in-attesa";

function Schede({ attivo, inAttesa }: { attivo: boolean; inAttesa: number }) {
  const base = "rounded-full border px-3 py-1 text-sm";
  const on = "border-azzurro bg-azzurro/10 font-semibold";
  const off = "border-border text-muted-foreground hover:text-foreground";
  return (
    <nav aria-label="Filtri utenti" className="flex flex-wrap gap-2">
      <Link href="/admin/utenti" className={`${base} ${attivo ? off : on}`}>
        Tutti
      </Link>
      <Link href={`/admin/utenti?filtro=${FILTRO_IN_ATTESA}`} className={`${base} ${attivo ? on : off}`}>
        Organizzatori in attesa{inAttesa > 0 ? ` (${inAttesa})` : ""}
      </Link>
    </nav>
  );
}

/** Elenco degli organizzatori in attesa di approvazione (migration 0071). */
async function ElencoOrganizzatoriInAttesa({ inAttesa }: { inAttesa: number }) {
  const admin = createAdminClient();
  const { data: lette, error } = await admin
    .from("organizers")
    .select("user_id, display_name, city, created_at")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);

  const intestazione = (
    <div>
      <h1 className="font-display text-3xl">Utenti</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Organizzatori che attendono la verifica del team. Finché non li approvi non possono inviare richieste, usare chat e calendario.
      </p>
    </div>
  );

  if (error) {
    logger.error("admin/utenti", `organizzatori in attesa non letti: ${error.message}`);
    return (
      <div className="space-y-6">
        {intestazione}
        <Schede attivo inAttesa={inAttesa} />
        <p role="alert" className="text-sm text-corallo">
          {colonnaAssente(error)
            ? "L'approvazione degli organizzatori richiede la migration 0071: applicala dal SQL editor."
            : "Non riesco a leggere l'elenco. Riprova."}
        </p>
      </div>
    );
  }

  const righe = lette ?? [];
  const emails = new Map<string, string>();
  await Promise.all(
    righe.map(async (r) => {
      if (!r.user_id) return;
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(r.user_id);
      if (uErr) logger.warn("admin/utenti", `email non letta: ${uErr.message}`);
      if (u?.user?.email) emails.set(r.user_id, u.user.email);
    })
  );

  return (
    <div className="space-y-6">
      {intestazione}
      <Schede attivo inAttesa={inAttesa} />
      <Card>
        <CardContent className="overflow-x-auto pt-4">
          {righe.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun organizzatore in attesa.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Locale o realtà</th>
                  <th className="px-2 py-2">Città</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Richiesta del</th>
                  <th className="px-2 py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r) => (
                  <tr key={r.user_id} className="border-t border-border align-top">
                    <td className="px-2 py-2 font-medium">{r.display_name}</td>
                    <td className="px-2 py-2">{r.city || "—"}</td>
                    <td className="px-2 py-2">{(r.user_id && emails.get(r.user_id)) || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{dataIt(r.created_at)}</td>
                    <td className="px-2 py-2">
                      {r.user_id ? <ApprovazioneOrganizzatore userId={r.user_id} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AdminUtentiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filtro?: string }>;
}) {
  const attore = await requireAdminPageAccess("utenti");
  const sp = await searchParams;
  const inAttesa = await contaOrganizzatoriInAttesa();
  if (sp.filtro === FILTRO_IN_ATTESA) return <ElencoOrganizzatoriInAttesa inAttesa={inAttesa} />;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const pagina = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const esito = await carica(q, pagina);

  const intestazione = (
    <div>
      <h1 className="font-display text-3xl">Utenti</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Elenco degli account, con sospensione e riattivazione. La sospensione blocca l&apos;accesso e
        toglie dal catalogo i profili artista; la motivazione viene inviata all&apos;interessato.
      </p>
    </div>
  );

  const schede = <Schede attivo={false} inAttesa={inAttesa} />;

  const ricerca = (
    <form method="get" className="flex max-w-md gap-2">
      <Input name="q" defaultValue={q} placeholder="Cerca per email o nome" aria-label="Cerca utente" />
      <Button type="submit" variant="outline">
        Cerca
      </Button>
    </form>
  );

  if (!esito.ok) {
    return (
      <div className="space-y-6">
        {intestazione}
        {ricerca}
        <p role="alert" className="text-sm text-corallo">
          {esito.error}
        </p>
      </div>
    );
  }

  const ids = esito.utenti.map((u) => u.id);
  const admin = createAdminClient();
  let errore: string | null = null;
  const profili = new Map<string, { role: string; full_name: string | null }>();
  const artisti = new Map<string, { id: string; stage_name: string }[]>();
  const organizzatori = new Map<string, string>();
  const cancellazioni = new Set<string>();

  if (ids.length > 0) {
    const [pr, ar, org, canc] = await Promise.all([
      admin.from("profiles").select("id, role, full_name").in("id", ids),
      admin.from("artists").select("id, stage_name, user_id").in("user_id", ids),
      admin.from("organizers").select("display_name, user_id").in("user_id", ids),
      admin
        .from("account_deletion_requests")
        .select("user_id")
        .in("user_id", ids)
        .not("confirmed_at", "is", null)
        .is("cancelled_at", null),
    ]);
    if (pr.error || ar.error || org.error) {
      const m = pr.error?.message ?? ar.error?.message ?? org.error?.message ?? "";
      logger.error("admin/utenti", `arricchimento fallito: ${m}`);
      errore = "Non riesco a leggere ruoli e profili collegati: azioni disabilitate per sicurezza.";
    }
    for (const p of pr.data ?? []) profili.set(p.id, { role: p.role, full_name: p.full_name });
    for (const a of ar.data ?? []) {
      if (!a.user_id) continue;
      const lista = artisti.get(a.user_id) ?? [];
      lista.push({ id: a.id, stage_name: a.stage_name });
      artisti.set(a.user_id, lista);
    }
    for (const o of org.data ?? []) if (o.user_id) organizzatori.set(o.user_id, o.display_name);
    if (canc.error) {
      // Tabella assente finché la migration 0060 non è applicata: non è bloccante.
      logger.warn("admin/utenti", `richieste di cancellazione non leggibili: ${canc.error.message}`);
    } else {
      for (const c of canc.data ?? []) cancellazioni.add(c.user_id);
    }
  }

  const href = (p: number) =>
    `/admin/utenti?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      {intestazione}
      {schede}
      {ricerca}

      {esito.ricerca && (
        <p className="text-xs text-muted-foreground">
          La ricerca scorre al massimo {PAGINE_MAX_RICERCA} pagine di {PER_PAGINA} account (i primi{" "}
          {PAGINE_MAX_RICERCA * PER_PAGINA}): un account più recente potrebbe non comparire.{" "}
          {esito.utenti.length} risultati.
        </p>
      )}
      {errore && (
        <p role="alert" className="text-sm text-corallo">
          {errore}
        </p>
      )}

      <Card>
        <CardContent className="overflow-x-auto pt-4">
          {esito.utenti.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun utente trovato.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">Ruolo</th>
                  <th className="px-2 py-2">Iscritto il</th>
                  <th className="px-2 py-2">Ultimo accesso</th>
                  <th className="px-2 py-2">Stato</th>
                  <th className="px-2 py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {esito.utenti.map((u) => {
                  const profilo = profili.get(u.id);
                  const sospensione = leggiSospensione(u.app_metadata);
                  const bloccato = isUtenteSospeso(u);
                  const nome = profilo?.full_name || nomeMetadata(u) || "—";
                  const suoi = artisti.get(u.id) ?? [];
                  const org = organizzatori.get(u.id);
                  const puoAgire = !errore && !!profilo && profilo.role !== "superadmin" && u.id !== attore.id;
                  return (
                    <tr key={u.id} className="border-t border-border align-top">
                      <td className="px-2 py-2 font-medium">{u.email ?? "—"}</td>
                      <td className="px-2 py-2">
                        {nome}
                        {suoi.map((a) => (
                          <div key={a.id} className="text-xs">
                            <Link
                              href={`/admin/artisti/${a.id}`}
                              className="text-azzurro underline-offset-2 hover:underline"
                            >
                              {a.stage_name}
                            </Link>
                          </div>
                        ))}
                        {org && <div className="text-xs text-muted-foreground">Organizzatore: {org}</div>}
                      </td>
                      <td className="px-2 py-2">{profilo ? (RUOLO[profilo.role] ?? profilo.role) : "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{dataIt(u.created_at)}</td>
                      <td className="px-2 py-2 text-muted-foreground">{dataIt(u.last_sign_in_at)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col items-start gap-1">
                          {bloccato ? (
                            <Badge variant="danger" dot>
                              {sospensione ? `Sospeso dal ${dataIt(sospensione.sospeso_il)}` : "Accesso bloccato"}
                            </Badge>
                          ) : (
                            <Badge variant="success" dot>
                              Attivo
                            </Badge>
                          )}
                          {cancellazioni.has(u.id) && <Badge variant="warning">Cancellazione richiesta</Badge>}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {puoAgire && (sospensione || !bloccato) ? (
                          <div className="space-y-2">
                            <SospensioneAccount userId={u.id} sospeso={!!sospensione} />
                            {!cancellazioni.has(u.id) && <ChiusuraAccount userId={u.id} />}
                            {org && (
                              <Link
                                href={`/admin/utenti/${u.id}`}
                                className="block text-xs text-azzurro underline-offset-2 hover:underline"
                              >
                                Strutture
                              </Link>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {bloccato && !sospensione ? "Bloccato per altro motivo" : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {!esito.ricerca && (
        <div className="flex items-center gap-4 text-sm">
          {esito.pagina > 1 && (
            <Link href={href(esito.pagina - 1)} className="underline underline-offset-4">
              ← Precedente
            </Link>
          )}
          <span className="text-muted-foreground">Pagina {esito.pagina}</span>
          {esito.utenti.length === PER_PAGINA && (esito.ultima === null || esito.pagina < esito.ultima) && (
            <Link href={href(esito.pagina + 1)} className="underline underline-offset-4">
              Successiva →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
