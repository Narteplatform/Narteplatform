import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { inviaPromemoriaRinnovi } from "@/lib/billing/promemoria-rinnovo";
import { deleteStreamVideo } from "@/lib/storage/bunny/stream";
import { REPORT_BUCKET } from "@/lib/security/report-attachments";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Conservazione dei dati — conteggio, e solo dopo cancellazione.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PERCHÉ ESISTE.
 * Oggi nessun dato viene mai cancellato. `email_log` conserva gli indirizzi
 * email in chiaro di chiunque abbia mai ricevuto una comunicazione, senza
 * scadenza; `stripe_webhook_events` conserva i messaggi integrali ricevuti da
 * Stripe; `rate_limits` ha una funzione di pulizia scritta e mai chiamata da
 * nessuno. L'informativa promette periodi di conservazione che nella pratica
 * non esistono: tutto è «per sempre».
 *
 * ⛔ PARTE IN SOLA CONTA, E NON È UNA PRUDENZA DI FACCIATA.
 * Con `RETENTION_ENFORCE` diverso da `1` questa rotta **legge e basta**:
 * conta quante righe supererebbero il periodo previsto e le scrive nei log.
 * Nient'altro. Serve a rispondere a una domanda che nessuno può rispondere a
 * priori — «quanto stiamo per cancellare?» — prima di autorizzare una
 * cancellazione su dati di produzione che non esiste modo di annullare.
 *
 * La procedura è: si lascia contare per qualche giorno, si guardano i numeri,
 * si decide se i periodi sono quelli giusti, e SOLO allora si mette
 * `RETENTION_ENFORCE=1`.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * I PERIODI NON SONO ANCORA APPROVATI. Sono la proposta scritta in
 * docs/REGISTRO_TRATTAMENTI.md, in attesa della revisione dell'avvocato.
 * Cambiarli qui è cambiare una riga, ma vanno cambiati lì per primi: il
 * documento è quello che fa fede verso l'esterno.
 */

/** Solo tabelle che esistono davvero: un refuso qui non deve compilare. */
type Tabella = keyof Database["public"]["Tables"];

type Regola = {
  tabella: Tabella;
  /** Colonna con la data su cui misurare l'età della riga. */
  colonnaData: string;
  giorni: number;
  /** Perché questo periodo e non un altro. */
  motivo: string;
  /**
   * Righe da non toccare mai, qualunque sia la data: stato → valori esclusi.
   * Lo stesso filtro vale per il conteggio e per la cancellazione, così il
   * numero mostrato in modalità «solo conteggio» è esattamente quello che
   * verrebbe cancellato.
   */
  escludi?: { colonna: string; valori: string[] };
  /** Righe da considerare SOLO se la colonna ha uno di questi valori. */
  soloSe?: { colonna: string; valori: string[] };
};

const REGOLE: Regola[] = [
  {
    tabella: "email_log",
    colonnaData: "sent_at",
    giorni: 365,
    motivo: "diagnostica degli invii; contiene indirizzi email in chiaro",
  },
  {
    tabella: "stripe_webhook_events",
    colonnaData: "received_at",
    giorni: 730,
    motivo: "messaggi integrali di Stripe, possono contenere nome ed email",
  },
  {
    tabella: "artist_profile_views",
    colonnaData: "viewed_on",
    giorni: 425,
    motivo: "statistiche del piano Max: serve l'ultimo anno più un margine",
  },
  {
    tabella: "contact_messages",
    colonnaData: "created_at",
    giorni: 730,
    motivo: "gestione della relazione commerciale",
  },
  {
    tabella: "leads",
    colonnaData: "created_at",
    giorni: 730,
    motivo: "gestione della relazione commerciale",
  },
  {
    tabella: "consultations",
    colonnaData: "created_at",
    giorni: 730,
    motivo: "richieste di consulenza, contengono testo libero sulle necessità",
  },
  {
    tabella: "artist_applications",
    colonnaData: "created_at",
    giorni: 365,
    motivo: "candidature non approvate, video inclusi",
    // Prima la regola non filtrava per esito: attivata, avrebbe cancellato
    // anche le candidature APPROVATE, che documentano l'ammissione
    // dell'artista e i consensi dati in quel momento.
    escludi: { colonna: "status", valori: ["approved"] },
  },
  // ── Aggiunte del 01/10/2026 (fascicolo legale, doc. 09 §11) ──
  {
    tabella: "moderation_actions",
    colonnaData: "created_at",
    giorni: 1826,
    motivo: "registro delle decisioni e delle azioni del team: 5 anni (prescrizione ordinaria, verifiche delle autorità)",
  },
  {
    tabella: "chat_access_log",
    colonnaData: "created_at",
    giorni: 1826,
    motivo: "registro degli accessi del team alle chat: 5 anni",
  },
  {
    tabella: "subscription_withdrawals",
    colonnaData: "created_at",
    giorni: 3653,
    motivo: "prova dei recessi dagli abbonamenti: 10 anni (documentazione contabile)",
  },
  {
    // Solo richieste CHIUSE senza data. Le date confermate restano: reggono le
    // recensioni (che cadrebbero a cascata) e lo storico dell'artista.
    tabella: "booking_requests",
    colonnaData: "updated_at",
    giorni: 1095,
    motivo: "richieste rifiutate o annullate: 36 mesi dalla chiusura",
    soloSe: { colonna: "status", valori: ["rifiutata", "annullata"] },
  },
];

/**
 * `rate_limits` sta fuori dall'elenco, e non per dimenticanza.
 *
 * Ha già la sua funzione di pulizia — `rate_limits_prune(interval)`, scritta
 * nella migration 0048 e da allora mai chiamata da nessuno. Riscrivere qui la
 * stessa cancellazione significherebbe avere due modi di fare la stessa cosa,
 * destinati a divergere: si chiama quella.
 *
 * Non è conteggiabile in anticipo come le altre — la funzione cancella e
 * restituisce quante righe ha tolto — quindi in sola conta viene saltata.
 * Le sue righe sono pseudonimi tecnici con una settimana di vita: è la
 * categoria su cui c'è meno da decidere.
 */
const RATE_LIMITS_GIORNI = 7;

function autorizzato(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Diversamente dal keep-alive, qui SENZA segreto non si passa: quella rotta
  // fa solo letture innocue, questa può cancellare. Lasciarla aperta
  // significherebbe consegnare a chiunque un pulsante di cancellazione.
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!autorizzato(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const cancella = process.env.RETENTION_ENFORCE === "1";
  const admin = createAdminClient();
  const esiti: Array<Record<string, unknown>> = [];

  for (const regola of REGOLE) {
    const soglia = new Date(Date.now() - regola.giorni * 86400_000).toISOString();

    const esclusi = regola.escludi ? `(${regola.escludi.valori.join(",")})` : null;
    let conteggio = admin
      .from(regola.tabella)
      .select("*", { count: "exact", head: true })
      .lt(regola.colonnaData, soglia);
    if (regola.escludi && esclusi) conteggio = conteggio.not(regola.escludi.colonna, "in", esclusi);
    if (regola.soloSe) conteggio = conteggio.in(regola.soloSe.colonna, regola.soloSe.valori);
    const { count, error } = await conteggio;

    if (error) {
      // Una tabella o una colonna che non esiste è un errore di questa rotta,
      // non un motivo per fermare le altre. E soprattutto NON si cancella: un
      // conteggio fallito non autorizza niente.
      logger.error("retention", `${regola.tabella}: ${error.message}`);
      esiti.push({ tabella: regola.tabella, errore: error.message });
      continue;
    }

    const daRimuovere = count ?? 0;

    if (!cancella) {
      esiti.push({
        tabella: regola.tabella,
        oltre: `${regola.giorni} giorni`,
        righeCheSarebberoRimosse: daRimuovere,
        motivo: regola.motivo,
      });
      continue;
    }

    if (daRimuovere === 0) {
      esiti.push({ tabella: regola.tabella, rimosse: 0 });
      continue;
    }

    let cancellazione = admin
      .from(regola.tabella)
      .delete()
      .lt(regola.colonnaData, soglia);
    if (regola.escludi && esclusi) {
      cancellazione = cancellazione.not(regola.escludi.colonna, "in", esclusi);
    }
    if (regola.soloSe) cancellazione = cancellazione.in(regola.soloSe.colonna, regola.soloSe.valori);
    const { error: erroreCancella } = await cancellazione;

    if (erroreCancella) {
      logger.error(
        "retention",
        `cancellazione ${regola.tabella} fallita: ${erroreCancella.message}`
      );
      esiti.push({ tabella: regola.tabella, errore: erroreCancella.message });
      continue;
    }

    logger.warn("retention", `${regola.tabella}: rimosse ${daRimuovere} righe oltre ${regola.giorni} giorni`);
    esiti.push({ tabella: regola.tabella, rimosse: daRimuovere });
  }

  // Il limitatore di frequenza, con la sua funzione dedicata.
  if (cancella) {
    const { data, error } = await admin.rpc("rate_limits_prune", {
      p_older_than: `${RATE_LIMITS_GIORNI} days`,
    });
    if (error) {
      logger.error("retention", `rate_limits_prune fallita: ${error.message}`);
      esiti.push({ tabella: "rate_limits", errore: error.message });
    } else {
      esiti.push({ tabella: "rate_limits", rimosse: data ?? 0 });
    }
  } else {
    esiti.push({
      tabella: "rate_limits",
      nota: `pulita da rate_limits_prune(${RATE_LIMITS_GIORNI} giorni) quando la cancellazione è attiva; non conteggiabile in anticipo`,
    });
  }

  // ── Casi che non sono una semplice regola per data ──
  esiti.push(...(await conversazioniInattive(admin, cancella)));
  esiti.push(...(await fileCandidatureScadute(admin, cancella)));
  esiti.push(...(await segnalazioniScadute(admin, cancella)));

  // Promemoria dei rinnovi annuali (doc. 02, art. 5.2): non è conservazione,
  // ma è un lavoro notturno e il piano Vercel ammette pochi cron.
  const rinnovi = await inviaPromemoriaRinnovi().catch((e) => {
    logger.error("retention", "promemoria rinnovi:", e instanceof Error ? e.message : String(e));
    return null;
  });
  if (rinnovi) esiti.push({ lavoro: "promemoria_rinnovi_annuali", ...rinnovi });

  const totale = esiti.reduce(
    (n, e) => n + Number(e.righeCheSarebberoRimosse ?? e.rimosse ?? 0),
    0
  );

  // In sola conta il riepilogo va nei log anche quando è tutto a zero: serve a
  // sapere che il lavoro è girato, non solo che aveva qualcosa da fare.
  logger.warn(
    "retention",
    `${cancella ? "CANCELLAZIONE ATTIVA" : "sola conta"} — ${totale} righe complessive oltre i periodi previsti`
  );

  return NextResponse.json(
    {
      ok: true,
      modalita: cancella ? "cancellazione" : "sola-conta",
      eseguitoIl: new Date().toISOString(),
      totale,
      dettaglio: esiti,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type Admin = ReturnType<typeof createAdminClient>;
const GIORNO = 86_400_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Conversazioni senza attività da 36 mesi, con i loro allegati.
 *
 * Si escludono le conversazioni fra parti che hanno ancora una richiesta
 * aperta o una data confermata futura. Con la cancellazione attiva si rimuovono
 * PRIMA i file degli allegati (bucket privato chat-attachments) e poi la riga
 * della conversazione, che porta con sé i messaggi (cascade). Un errore su un
 * file ferma quella conversazione: mai righe cancellate con file rimasti orfani.
 */
async function conversazioniInattive(admin: Admin, cancella: boolean): Promise<Array<Record<string, unknown>>> {
  const soglia = new Date(Date.now() - 1095 * GIORNO).toISOString();
  const { data: convs, error } = await admin
    .from("conversations")
    .select("id, artist_id, organizer_id, last_message_at, created_at")
    .lt("last_message_at", soglia)
    .limit(500);
  if (error) {
    logger.error("retention", `conversations: ${error.message}`);
    return [{ tabella: "conversations", errore: error.message }];
  }
  const oggi = new Date().toISOString().slice(0, 10);
  const candidati: string[] = [];
  for (const c of convs ?? []) {
    const { count, error: bErr } = await admin
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", c.artist_id)
      .eq("organizer_id", c.organizer_id)
      .or(`status.in.(pending,in_trattativa,accettata),and(status.eq.confermata,event_date.gte.${oggi})`);
    if (bErr) {
      logger.warn("retention", `conversazione ${c.id}: richieste non leggibili, saltata`);
      continue;
    }
    if ((count ?? 0) > 0) continue;
    // Il registro degli accessi del team cade a cascata con la conversazione,
    // ma va tenuto 5 anni: finché c'è un accesso più recente, la conversazione resta.
    const { count: accessi, error: aErr } = await admin
      .from("chat_access_log")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", c.id)
      .gte("created_at", new Date(Date.now() - 1826 * GIORNO).toISOString());
    if (aErr) {
      logger.warn("retention", `conversazione ${c.id}: registro accessi non leggibile, saltata`);
      continue;
    }
    if ((accessi ?? 0) === 0) candidati.push(c.id);
  }
  if (!cancella) {
    return [{
      tabella: "conversations",
      oltre: "36 mesi senza attività",
      righeCheSarebberoRimosse: candidati.length,
      motivo: "chat, allegati e note vocali: 36 mesi dall'ultima attività, salvo richieste aperte o date future",
    }];
  }
  let rimosse = 0;
  for (const id of candidati) {
    // Si svuota la cartella a pagine finché la lista non torna vuota: una
    // conversazione non si rimuove mai con file ancora presenti.
    let allegatiOk = true;
    for (let giro = 0; giro < 50; giro++) {
      const { data: files, error: lErr } = await admin.storage.from("chat-attachments").list(id, { limit: 1000 });
      if (lErr) {
        logger.error("retention", `allegati di ${id} non elencabili: conversazione NON rimossa`);
        allegatiOk = false;
        break;
      }
      if (!files || files.length === 0) break;
      const { error: rErr } = await admin.storage.from("chat-attachments").remove(files.map((f) => `${id}/${f.name}`));
      if (rErr) {
        logger.error("retention", `allegati di ${id} non rimossi: conversazione NON rimossa`);
        allegatiOk = false;
        break;
      }
    }
    if (!allegatiOk) continue;
    const { error: dErr } = await admin.from("conversations").delete().eq("id", id);
    if (dErr) logger.error("retention", `conversazione ${id} non rimossa: ${dErr.message}`);
    else rimosse++;
  }
  return [{ tabella: "conversations", rimosse }];
}

/**
 * Video delle candidature non approvate oltre 12 mesi. Vanno rimossi PRIMA che
 * la regola su `artist_applications` cancelli le righe che ne conservano il
 * percorso: altrimenti il file resterebbe nell'archivio senza riferimento.
 * (L'ordine è garantito perché la regola per data gira dopo, alla notte
 * successiva, sulle righe già prive di file: qui si azzera solo `video_path`.)
 */
async function fileCandidatureScadute(admin: Admin, cancella: boolean): Promise<Array<Record<string, unknown>>> {
  const soglia = new Date(Date.now() - 335 * GIORNO).toISOString();
  const { data: righe, error } = await admin
    .from("artist_applications")
    .select("id, video_path")
    .neq("status", "approved")
    .lt("created_at", soglia)
    .not("video_path", "is", null)
    .limit(500);
  if (error) {
    logger.error("retention", `video candidature: ${error.message}`);
    return [{ lavoro: "video_candidature", errore: error.message }];
  }
  const elenco = (righe ?? []).filter((r) => typeof r.video_path === "string" && r.video_path.length > 0);
  if (!cancella) {
    return [{
      lavoro: "video_candidature",
      righeCheSarebberoRimosse: elenco.length,
      motivo: "video delle candidature non approvate: rimossi prima della riga (12 mesi)",
    }];
  }
  let rimossi = 0;
  for (const r of elenco) {
    const percorso = r.video_path as string;
    if (UUID_RE.test(percorso)) {
      // Video su Bunny Stream: il percorso è il GUID.
      try {
        await deleteStreamVideo(percorso);
      } catch (e) {
        logger.error("retention", `video candidatura ${r.id} non rimosso da Bunny: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    } else {
      const { error: rErr } = await admin.storage.from("application-videos").remove([percorso]);
      if (rErr) {
        logger.error("retention", `video candidatura ${r.id} non rimosso`);
        continue;
      }
    }
    const { error: uErr } = await admin.from("artist_applications").update({ video_path: null }).eq("id", r.id);
    if (uErr) logger.error("retention", `video_path di ${r.id} non azzerato: ${uErr.message}`);
    else rimossi++;
  }
  return [{ lavoro: "video_candidature", rimossi }];
}

/**
 * Segnalazioni e reclami oltre 5 anni, con i loro allegati (bucket privato
 * report-attachments, cartella `<reference>/`), più i caricamenti mai collegati
 * a una segnalazione (`pending/` più vecchi di 2 giorni).
 *
 * Come per le chat: prima i file, poi la riga. Un errore sui file ferma quella
 * segnalazione, mai righe cancellate con allegati rimasti orfani.
 */
async function segnalazioniScadute(admin: Admin, cancella: boolean): Promise<Array<Record<string, unknown>>> {
  const soglia = new Date(Date.now() - 1826 * GIORNO).toISOString();
  const { data: righe, error } = await admin
    .from("content_reports")
    .select("id, reference")
    .lt("created_at", soglia)
    .limit(500);
  if (error) {
    logger.error("retention", `content_reports: ${error.message}`);
    return [{ tabella: "content_reports", errore: error.message }];
  }
  const bucket = admin.storage.from(REPORT_BUCKET);

  // Caricamenti abbandonati: firmati ma mai inviati con il modulo.
  const { data: pendenti, error: pErr } = await bucket.list("pending", { limit: 1000 });
  const limitePendenti = Date.now() - 2 * GIORNO;
  const vecchi = pErr
    ? []
    : (pendenti ?? []).filter((f) => f.created_at && Date.parse(f.created_at) < limitePendenti);
  if (pErr) logger.warn("retention", `report-attachments/pending non elencabile: ${pErr.message}`);

  if (!cancella) {
    return [
      {
        tabella: "content_reports",
        oltre: "5 anni",
        righeCheSarebberoRimosse: (righe ?? []).length,
        motivo: "segnalazioni e reclami (DSA): 5 anni, con i loro allegati",
      },
      {
        lavoro: "allegati_segnalazioni_abbandonati",
        righeCheSarebberoRimosse: vecchi.length,
        motivo: "allegati caricati ma mai collegati a una segnalazione, oltre 2 giorni",
      },
    ];
  }

  let rimosse = 0;
  for (const r of righe ?? []) {
    if (r.reference) {
      const { data: files, error: lErr } = await bucket.list(r.reference, { limit: 100 });
      if (lErr) {
        logger.error("retention", `allegati di ${r.reference} non elencabili: segnalazione NON rimossa`);
        continue;
      }
      if (files && files.length > 0) {
        const { error: rErr } = await bucket.remove(files.map((f) => `${r.reference}/${f.name}`));
        if (rErr) {
          logger.error("retention", `allegati di ${r.reference} non rimossi: segnalazione NON rimossa`);
          continue;
        }
      }
    }
    const { error: dErr } = await admin.from("content_reports").delete().eq("id", r.id);
    if (dErr) logger.error("retention", `segnalazione ${r.id} non rimossa: ${dErr.message}`);
    else rimosse++;
  }

  let pendentiRimossi = 0;
  if (vecchi.length > 0) {
    const { error: rErr } = await bucket.remove(vecchi.map((f) => `pending/${f.name}`));
    if (rErr) logger.error("retention", `allegati abbandonati non rimossi: ${rErr.message}`);
    else pendentiRimossi = vecchi.length;
  }
  return [
    { tabella: "content_reports", rimosse },
    { lavoro: "allegati_segnalazioni_abbandonati", rimosse: pendentiRimossi },
  ];
}
