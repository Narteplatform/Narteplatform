import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { anteprimaCompletamento, eseguiCompletamento } from "@/lib/legal/completa-cancellazione";
import { GIORNI_RIPENSAMENTO } from "@/lib/legal/cancellazione";
import { registraAzione } from "@/lib/moderation/decisioni";
import { avvisaRoot, trovaRoot } from "@/lib/admin/root";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cancellazione definitiva al 30° giorno dalla conferma della chiusura.
 *
 * PERCHÉ. I Termini promettono che, decorsi i 30 giorni di ripensamento, i
 * dati vengono cancellati (art. 12 GDPR: un mese). Prima l'account restava
 * bloccato a tempo indeterminato finché il root non interveniva a mano: il
 * parere legale di novembre 2026 lo ha indicato come violazione del principio
 * di limitazione della conservazione.
 *
 * COSA FA, ogni giorno:
 *  1. avvisa il root delle chiusure che arrivano al 28° giorno;
 *  2. per le chiusure oltre il 30° giorno esegue `eseguiCompletamento`, la
 *     STESSA procedura che il root usa a mano da /admin/impostazioni/cancellazioni
 *     (stessi controlli bloccanti, stesso registro, stessa email finale);
 *  3. elimina i vecchi profili rimasti nascosti dopo uno sblocco «profilo
 *     nuovo» (restore_state.profili_vecchi_da_eliminare), allo stesso termine.
 *
 * ⛔ INTERRUTTORE. Acceso di default dal 05/11/2026; con
 * `AUTO_CANCELLAZIONE_ENFORCE=0` non cancella nulla: elenca cosa farebbe e lo
 * manda al root. Al massimo MAX_PER_ESECUZIONE account a
 * esecuzione: un errore di logica non può svuotare il database in una notte.
 *
 * Una lettura fallita ferma tutto (CLAUDE.md, regola 4): nessuna scrittura
 * deriva da una lettura di cui non si è controllato l'errore.
 */

const MAX_PER_ESECUZIONE = 10;
const GIORNI_PREAVVISO = 28;
const GIORNO_MS = 86_400_000;

function autorizzato(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Senza segreto non si passa: questa rotta può cancellare.
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function giorniDa(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / GIORNO_MS);
}

export async function GET(req: Request) {
  if (!autorizzato(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // ACCESA dal 05/11/2026 (approvazione del cliente). Per tornare in sola
  // conta: AUTO_CANCELLAZIONE_ENFORCE=0 su Vercel e redeploy.
  const esegui = process.env.AUTO_CANCELLAZIONE_ENFORCE !== "0";
  const admin = createAdminClient();

  const root = await trovaRoot();
  if (!root) {
    // Senza il root non c'è un attore da registrare né qualcuno da avvisare: ci si ferma.
    return NextResponse.json({ ok: false, error: "Root non identificabile (SUPERADMIN_EMAIL)." }, { status: 500 });
  }

  const ora = Date.now();
  const sogliaScadute = new Date(ora - GIORNI_RIPENSAMENTO * GIORNO_MS).toISOString();
  const sogliaPreavviso = new Date(ora - GIORNI_PREAVVISO * GIORNO_MS).toISOString();
  const sogliaPreavvisoFine = new Date(ora - (GIORNI_PREAVVISO + 1) * GIORNO_MS).toISOString();

  // ── Letture: tutte controllate, prima di qualsiasi scrittura ──
  const [scaduteRes, inArrivoRes, vecchiRes] = await Promise.all([
    admin
      .from("account_deletion_requests")
      .select("id, user_id, confirmed_at")
      .not("confirmed_at", "is", null)
      .is("cancelled_at", null)
      .is("completed_at", null)
      .lte("confirmed_at", sogliaScadute)
      .order("confirmed_at", { ascending: true })
      .limit(MAX_PER_ESECUZIONE),
    admin
      .from("account_deletion_requests")
      .select("id, user_id, confirmed_at")
      .not("confirmed_at", "is", null)
      .is("cancelled_at", null)
      .is("completed_at", null)
      .lte("confirmed_at", sogliaPreavviso)
      .gt("confirmed_at", sogliaPreavvisoFine),
    admin
      .from("account_deletion_requests")
      .select("id, user_id, confirmed_at, restore_state")
      .not("cancelled_at", "is", null)
      .lte("confirmed_at", sogliaScadute)
      .eq("restore_state->>profili_vecchi_da_eliminare", "true")
      .limit(MAX_PER_ESECUZIONE),
  ]);
  const erroreLettura = scaduteRes.error ?? inArrivoRes.error ?? vecchiRes.error;
  if (erroreLettura) {
    logger.error("cron/cancellazioni", "lettura fallita, nessuna azione:", erroreLettura.message);
    return NextResponse.json({ ok: false, error: erroreLettura.message }, { status: 500 });
  }

  const righe: string[] = [];

  // ── 1. Preavviso al 28° giorno ──
  for (const r of inArrivoRes.data ?? []) {
    righe.push(`Al 28° giorno: richiesta ${r.id} (confermata il ${r.confirmed_at?.slice(0, 10)}). Fra 2 giorni sarà cancellata.`);
  }

  // ── 2. Account oltre il 30° giorno ──
  const esitiAccount: Array<Record<string, unknown>> = [];
  for (const r of scaduteRes.data ?? []) {
    const anteprima = await anteprimaCompletamento(r.id);
    const giorni = r.confirmed_at ? giorniDa(r.confirmed_at) : null;
    if (anteprima.bloccanti.length > 0 || anteprima.errori.length > 0 || !anteprima.richiesta?.email) {
      const motivo =
        [...anteprima.bloccanti, ...anteprima.errori].join(" | ") || "email dell'account non leggibile";
      righe.push(`BLOCCATA richiesta ${r.id} (${giorni} giorni): ${motivo}. Da verificare a mano.`);
      esitiAccount.push({ richiesta: r.id, giorni, esito: "bloccata", motivo });
      continue;
    }
    const voci = anteprima.voci.reduce((n, v) => n + (typeof v.conteggio === "number" ? v.conteggio : 0), 0);
    if (!esegui) {
      righe.push(`Da cancellare (sola conta): richiesta ${r.id}, ${giorni} giorni, ${voci} elementi in anteprima.`);
      esitiAccount.push({ richiesta: r.id, giorni, esito: "sola_conta", elementi: voci });
      continue;
    }
    const esito = await eseguiCompletamento({
      richiestaId: r.id,
      confermaEmail: anteprima.richiesta.email,
      attoreId: root.id,
      forza: false,
    });
    if (esito.ok) {
      righe.push(`Cancellata: richiesta ${r.id} (${giorni} giorni)${esito.riferimento ? `, riferimento ${esito.riferimento}` : ""}.`);
      esitiAccount.push({ richiesta: r.id, giorni, esito: "cancellata" });
    } else {
      righe.push(`ERRORE richiesta ${r.id} al passo «${esito.passoFallito}»: ${esito.errore}. Da completare a mano.`);
      esitiAccount.push({ richiesta: r.id, giorni, esito: "errore", passo: esito.passoFallito });
    }
  }

  // ── 3. Vecchi profili nascosti dopo uno sblocco «profilo nuovo» ──
  const esitiProfili: Array<Record<string, unknown>> = [];
  for (const r of vecchiRes.data ?? []) {
    const stato = (r.restore_state ?? {}) as Record<string, Json | undefined>;
    const ids = Array.isArray(stato.artisti_riportati_a_pending)
      ? stato.artisti_riportati_a_pending.filter((x): x is string => typeof x === "string")
      : [];
    // Solo profili ancora nascosti e dello stesso proprietario: uno ripristinato
    // nel frattempo, o passato ad altri, non si tocca.
    const { data: profili, error } = ids.length
      ? await admin.from("artists").select("id, stage_name").in("id", ids).eq("user_id", r.user_id).eq("status", "pending")
      : { data: [], error: null };
    if (error) {
      righe.push(`ERRORE lettura profili vecchi della richiesta ${r.id}: ${error.message}. Nessuna azione.`);
      continue;
    }
    const daEliminare = profili ?? [];
    if (!esegui) {
      if (daEliminare.length > 0) {
        righe.push(`Profili vecchi da eliminare (sola conta), richiesta ${r.id}: ${daEliminare.map((p) => `«${p.stage_name}»`).join(", ")}.`);
      }
      esitiProfili.push({ richiesta: r.id, profili: daEliminare.length, esito: "sola_conta" });
      continue;
    }
    let ok = true;
    for (const p of daEliminare) {
      const { error: delErr } = await admin.from("artists").delete().eq("id", p.id).eq("status", "pending");
      if (delErr) {
        ok = false;
        righe.push(`ERRORE eliminazione profilo «${p.stage_name}» (${p.id}): ${delErr.message}.`);
        continue;
      }
      await registraAzione({
        actorId: root.id,
        targetType: "profilo",
        targetId: p.id,
        affectedUserId: r.user_id,
        action: "profilo_eliminato_scadenza_ripensamento",
        descrizione: `Profilo precedente «${p.stage_name}» eliminato al termine dei ${GIORNI_RIPENSAMENTO} giorni dalla richiesta di cancellazione (sblocco con profilo nuovo).`,
      });
      righe.push(`Eliminato il profilo precedente «${p.stage_name}» (richiesta ${r.id}).`);
    }
    if (ok) {
      const { error: upErr } = await admin
        .from("account_deletion_requests")
        .update({
          restore_state: { ...stato, profili_vecchi_da_eliminare: false, profili_vecchi_eliminati_il: new Date().toISOString() } as Json,
        })
        .eq("id", r.id);
      if (upErr) logger.warn("cron/cancellazioni", `richiesta ${r.id} non aggiornata:`, upErr.message);
    }
    esitiProfili.push({ richiesta: r.id, profili: daEliminare.length, esito: ok ? "eliminati" : "errore" });
  }

  if (righe.length > 0) {
    await avvisaRoot(root, {
      kind: "cancellazioni_automatiche",
      titolo: esegui ? "Cancellazioni automatiche: riepilogo" : "Cancellazioni automatiche (sola conta): riepilogo",
      testo: [
        esegui
          ? "Esito della cancellazione automatica al 30° giorno."
          : "La cancellazione automatica è in SOLA CONTA (AUTO_CANCELLAZIONE_ENFORCE=0): non è stato cancellato nulla. Ecco cosa farebbe.",
        "",
        ...righe,
      ].join("\n"),
      adminPath: "/admin/impostazioni/cancellazioni",
    });
  }

  logger.warn("cron/cancellazioni", JSON.stringify({ esegui, account: esitiAccount, profili: esitiProfili }));
  return NextResponse.json({ ok: true, esegui, account: esitiAccount, profili: esitiProfili, avvisi: righe.length });
}
