import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { incassiDelMese } from "@/lib/billing/incassi";
import { formatPrice } from "@/lib/billing/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { aggiornaShooting } from "./_actions";
import type { InviteStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Abbonamenti — N'arte Admin" };

function meseCorrente(): string {
  const oggi = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  return `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}`;
}

function meseSpostato(mese: string, delta: number): string {
  const [a, m] = mese.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Incassi degli abbonamenti del mese, da passare al commercialista per la
 * fatturazione elettronica (regime forfettario: niente IVA, fattura SdI per
 * ogni incasso, bollo di 2 € sopra 77,47 €). Sola lettura da Stripe.
 */
const PIANO: Record<string, string> = { free: "Free", pro: "Pro", max: "Max" };

function dataIt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" });
}

type Omaggio = {
  id: string;
  nome: string;
  piano: string;
  scadenza: string | null;
  scaduto: boolean;
  motivo: string | null;
  chi: string;
  quando: string | null;
};

/**
 * Artisti con un piano omaggio (`tier_override`) attivo o scaduto, con chi lo
 * ha concesso e quando, ricavati dal registro delle azioni. Sola lettura.
 */
async function leggiOmaggi(): Promise<{ ok: true; omaggi: Omaggio[]; avviso: string | null } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: artisti, error } = await admin
    .from("artists")
    .select("id, stage_name, tier_override, tier_override_expires_at, tier_override_reason")
    .not("tier_override", "is", null)
    .order("stage_name");
  if (error) {
    logger.error("admin/abbonamenti", "piani omaggio non leggibili:", error.message);
    return { ok: false, error: "Non riesco a leggere i piani omaggio. L'elenco non è vuoto, è non disponibile." };
  }
  const righe = artisti ?? [];
  if (righe.length === 0) return { ok: true, omaggi: [], avviso: null };

  // Chi e quando: l'ultima azione «omaggio_%» per ciascun profilo.
  let avviso: string | null = null;
  const ultima = new Map<string, { actor: string | null; at: string }>();
  const { data: azioni, error: azErr } = await admin
    .from("moderation_actions")
    .select("target_id, actor_id, created_at")
    .eq("target_type", "profilo")
    .like("action", "omaggio_%")
    .in("target_id", righe.map((r) => r.id))
    .order("created_at", { ascending: false });
  if (azErr) {
    logger.warn("admin/abbonamenti", "registro degli omaggi non leggibile:", azErr.message);
    avviso = "Il registro delle azioni non è leggibile: chi e quando non sono disponibili.";
  } else {
    for (const a of azioni ?? []) {
      if (a.target_id && !ultima.has(a.target_id)) ultima.set(a.target_id, { actor: a.actor_id, at: a.created_at });
    }
  }

  const nomi = new Map<string, string>();
  for (const id of new Set([...ultima.values()].map((u) => u.actor).filter((x): x is string => !!x))) {
    const { data, error: uErr } = await admin.auth.admin.getUserById(id);
    if (uErr) logger.warn("admin/abbonamenti", "operatore non leggibile:", uErr.message);
    nomi.set(id, data?.user?.email ?? id.slice(0, 8));
  }

  const adesso = Date.now();
  const omaggi: Omaggio[] = righe.map((r) => {
    const u = ultima.get(r.id);
    const scadenza = r.tier_override_expires_at;
    return {
      id: r.id,
      nome: r.stage_name,
      piano: PIANO[r.tier_override ?? ""] ?? String(r.tier_override),
      scadenza,
      scaduto: scadenza ? new Date(scadenza).getTime() < adesso : false,
      motivo: r.tier_override_reason,
      chi: u?.actor ? (nomi.get(u.actor) ?? u.actor.slice(0, 8)) : "—",
      quando: u?.at ?? null,
    };
  });
  return { ok: true, omaggi, avviso };
}

export default async function AdminAbbonamentiPage({
  searchParams,
}: {
  searchParams: Promise<{ mese?: string }>;
}) {
  await requireAdminPageAccess("abbonamenti");
  const richiesto = (await searchParams).mese;
  const mese = richiesto && /^\d{4}-\d{2}$/.test(richiesto) ? richiesto : meseCorrente();
  const esito = await incassiDelMese(mese);
  const totale = esito.ok ? esito.incassi.reduce((s, i) => s + i.importoCent, 0) : 0;
  const bolli = esito.ok ? esito.incassi.filter((i) => i.bolloDovuto).length : 0;
  const omaggi = await leggiOmaggi();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Abbonamenti — incassi</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Gli incassi del mese letti da Stripe, con i dati per emettere la fattura elettronica.
          Regime forfettario: nessuna IVA; su ogni fattura oltre 77,47 € va applicata la marca da
          bollo di 2 €. Stripe non trasmette al Sistema di Interscambio: il file va consegnato al
          commercialista o caricato nel gestionale di fatturazione.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/admin/abbonamenti?mese=${meseSpostato(mese, -1)}`} className="underline underline-offset-4">
          ← Mese precedente
        </Link>
        <span className="font-medium">{mese}</span>
        <Link href={`/admin/abbonamenti?mese=${meseSpostato(mese, 1)}`} className="underline underline-offset-4">
          Mese successivo →
        </Link>
        {esito.ok && esito.incassi.length > 0 && (
          <a
            href={`/admin/abbonamenti/export?mese=${mese}`}
            className="ml-auto rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
          >
            Scarica CSV per il commercialista
          </a>
        )}
      </div>

      {!esito.ok ? (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{esito.error}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {esito.incassi.length} incassi · totale {formatPrice(totale)} · bollo dovuto su {bolli}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {esito.incassi.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun incasso in questo mese.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Cliente</th>
                    <th className="py-2 pr-4">CF / P.IVA</th>
                    <th className="py-2 pr-4">Descrizione</th>
                    <th className="py-2 pr-4 text-right">Importo</th>
                    <th className="py-2">Bollo</th>
                  </tr>
                </thead>
                <tbody>
                  {esito.incassi.map((i) => (
                    <tr key={i.idFattura} className="border-t border-border align-top">
                      <td className="py-2 pr-4 whitespace-nowrap">{i.data}</td>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{i.cliente || "—"}</div>
                        <div className="text-xs text-muted-foreground">{i.email}</div>
                        <div className="text-xs text-muted-foreground">{i.indirizzo}</div>
                      </td>
                      <td className="py-2 pr-4">{i.codiceFiscaleOPartitaIva || "—"}</td>
                      <td className="py-2 pr-4">{i.descrizione}</td>
                      <td className="py-2 pr-4 text-right whitespace-nowrap">{formatPrice(i.importoCent)}</td>
                      <td className="py-2">{i.bolloDovuto ? "sì" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Piani omaggio</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!omaggi.ok ? (
            <p role="alert" className="text-sm text-destructive">
              {omaggi.error}
            </p>
          ) : omaggi.omaggi.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun piano omaggio attivo.</p>
          ) : (
            <>
              {omaggi.avviso && <p className="mb-2 text-xs text-muted-foreground">{omaggi.avviso}</p>}
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Artista</th>
                    <th className="py-2 pr-4">Piano</th>
                    <th className="py-2 pr-4">Scadenza</th>
                    <th className="py-2 pr-4">Motivo</th>
                    <th className="py-2 pr-4">Concesso da</th>
                    <th className="py-2">Il</th>
                  </tr>
                </thead>
                <tbody>
                  {omaggi.omaggi.map((o) => (
                    <tr key={o.id} className="border-t border-border align-top">
                      <td className="py-2 pr-4 font-medium">
                        <Link href={`/admin/artisti/${o.id}`} className="underline-offset-2 hover:underline">
                          {o.nome}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{o.piano}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {o.scadenza ? dataIt(o.scadenza) : "Senza scadenza"}
                        {o.scaduto && <span className="ml-1 text-xs text-destructive">(scaduto)</span>}
                      </td>
                      <td className="max-w-sm whitespace-pre-wrap py-2 pr-4">{o.motivo ?? "—"}</td>
                      <td className="py-2 pr-4">{o.chi}</td>
                      <td className="py-2 whitespace-nowrap">{dataIt(o.quando)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>

      <ShootingRichiesti />

      <InvitiTraArtisti />
    </div>
  );
}

const STATO_INVITO: Record<InviteStatus, string> = {
  candidatura: "Candidatura",
  approvato: "Approvato, non abbonato",
  in_attesa: "In attesa (14 gg)",
  confermato: "Premio assegnato",
  annullato: "Annullato",
  oltre_limite: "Oltre il tetto annuale",
};

const MOTIVO_ANNULLO: Record<string, string> = {
  non_approvata: "candidatura non approvata",
  auto_invito: "auto-invito",
  account_non_nuovo: "account già esistente",
  gia_invitato: "già invitato da altri",
  recesso: "recesso",
  rimborso: "rimborso",
};

/** «Invita un artista» (0078): ultimi inviti e premi. Sola lettura. */
async function InvitiTraArtisti() {
  const admin = createAdminClient();
  const [inviti, premi] = await Promise.all([
    admin
      .from("artist_invites")
      .select("id, inviter_user_id, invitee_stage_name, status, cancel_reason, created_at, paid_at, confirm_after, confirmed_at")
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("invite_rewards").select("invite_id, kind, pro_until, amount_cents, converted_cents"),
  ]);
  const errore = inviti.error ?? premi.error;
  const mancante = errore?.code === "42P01" || errore?.code === "PGRST205";
  if (errore && !mancante) logger.error("admin/abbonamenti", "inviti non letti:", errore.message);

  const righe = inviti.data ?? [];
  const premioPer = new Map((premi.data ?? []).map((p) => [p.invite_id, p]));

  // Nome di chi invita: il primo profilo dell'account.
  const nomi = new Map<string, string>();
  const ids = [...new Set(righe.map((r) => r.inviter_user_id))];
  if (ids.length > 0) {
    const { data: profili, error: pErr } = await admin
      .from("artists")
      .select("user_id, stage_name, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: true });
    if (pErr) logger.warn("admin/abbonamenti", "nomi di chi invita non letti:", pErr.message);
    for (const p of profili ?? []) if (p.user_id && !nomi.has(p.user_id)) nomi.set(p.user_id, p.stage_name);
  }

  const conteggi = righe.reduce<Partial<Record<InviteStatus, number>>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const premioLabel = (inviteId: string): string => {
    const p = premioPer.get(inviteId);
    if (!p) return "—";
    if (p.kind === "credito_stripe") return `${formatPrice(p.amount_cents ?? 0)} di credito`;
    const conv = p.converted_cents ? ` (convertiti ${formatPrice(p.converted_cents)})` : "";
    return `30 gg Pro fino al ${dataIt(p.pro_until)}${conv}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invita un artista</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Un artista invitato che si abbona fa guadagnare a chi l&apos;ha invitato 1 mese di Pro (30 giorni, o 9,99 €
          di credito Stripe se ha già un abbonamento), confermato 14 giorni dopo il primo pagamento. Massimo 12 premi
          per anno solare. Interruttore: <code>INVITI_ATTIVI</code>.
        </p>
        {mancante ? (
          <p className="text-muted-foreground">Applica la migration 0078 per attivare il programma inviti.</p>
        ) : errore ? (
          <p role="alert" className="text-destructive">Non riesco a leggere gli inviti. Riprova fra un momento.</p>
        ) : righe.length === 0 ? (
          <p className="text-muted-foreground">Nessun invito ancora.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Ultimi {righe.length}:{" "}
              {(Object.keys(STATO_INVITO) as InviteStatus[])
                .filter((k) => conteggi[k])
                .map((k) => `${STATO_INVITO[k].toLowerCase()} ${conteggi[k]}`)
                .join(" · ")}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Chi invita</th>
                    <th className="py-2 pr-4">Invitato</th>
                    <th className="py-2 pr-4">Stato</th>
                    <th className="py-2 pr-4">Pagato il</th>
                    <th className="py-2">Premio</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((r) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="py-2 pr-4">{nomi.get(r.inviter_user_id) ?? r.inviter_user_id.slice(0, 8)}</td>
                      <td className="py-2 pr-4 font-medium">{r.invitee_stage_name}</td>
                      <td className="py-2 pr-4">
                        {STATO_INVITO[r.status]}
                        {r.status === "annullato" && r.cancel_reason && (
                          <span className="block text-xs text-muted-foreground">
                            {MOTIVO_ANNULLO[r.cancel_reason] ?? r.cancel_reason}
                          </span>
                        )}
                        {r.status === "in_attesa" && r.confirm_after && (
                          <span className="block text-xs text-muted-foreground">conferma dal {dataIt(r.confirm_after)}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">{dataIt(r.paid_at)}</td>
                      <td className="py-2">{premioLabel(r.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Shooting del Max annuale richiesti dagli account (0077). */
async function ShootingRichiesti() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("photo_shoots")
    .select("id, user_id, artist_id, artist_name, requested_at, scheduled_at, done_at")
    .order("requested_at", { ascending: false })
    .limit(100);
  const mancante = error?.code === "42P01" || error?.code === "PGRST205";
  if (error && !mancante) logger.error("admin/abbonamenti", "shooting non letti:", error.message);
  const giorno = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shooting fotografici (Max annuale)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Uno per account, nel primo anno, dal 15° giorno: 1 ora presso Hangarram (Napoli), 5 foto. Fissa la data
          con l&apos;artista e segnala qui; poi segna l&apos;esecuzione.
        </p>
        {mancante ? (
          <p className="text-muted-foreground">Applica la migration 0077 per attivare le richieste di shooting.</p>
        ) : error ? (
          <p role="alert" className="text-destructive">Non riesco a leggere le richieste. Riprova fra un momento.</p>
        ) : (data ?? []).length === 0 ? (
          <p className="text-muted-foreground">Nessuna richiesta.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Profilo</th>
                <th className="py-2 pr-4">Richiesto</th>
                <th className="py-2 pr-4">Fissato per</th>
                <th className="py-2">Eseguito il</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="py-2 pr-4 font-medium">
                    {r.artist_id ? (
                      <Link href={`/admin/artisti/${r.artist_id}`} className="underline-offset-2 hover:underline">
                        {r.artist_name}
                      </Link>
                    ) : (
                      r.artist_name
                    )}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{dataIt(r.requested_at)}</td>
                  {(["scheduled_at", "done_at"] as const).map((campo) => (
                    <td key={campo} className="py-2 pr-4">
                      <form action={aggiornaShooting} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="campo" value={campo} />
                        <input
                          type="date"
                          name="data"
                          defaultValue={giorno(r[campo])}
                          aria-label={campo === "done_at" ? "Data di esecuzione" : "Data fissata"}
                          className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
                        />
                        <button type="submit" className="text-xs underline underline-offset-2">
                          Salva
                        </button>
                      </form>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
