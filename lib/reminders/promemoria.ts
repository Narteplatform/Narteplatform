import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { formatDateIt, formatDateRome, formatEuro, formatMinutes, formatTimeRome } from "@/lib/emails/format";
import { getSiteUrl } from "@/lib/site-url";
import { logger } from "@/lib/logger";
import type { EmailKey } from "@/lib/brevo/registry";
import type { Json } from "@/lib/supabase/types";

/**
 * Promemoria che partono dal passare del tempo: evento di domani, invito a
 * recensire il giorno dopo, consulenza di domani.
 *
 * ⛔ REGOLE DI QUESTO FILE
 *  - Solo letture sul DB. L'unica scrittura è quella che fa già `dispatchEmail`
 *    (una riga in `email_log`), e solo fuori dalla modalità `dry`.
 *  - Un promemoria non parte mai due volte: prima di ogni invio si cerca in
 *    `email_log` una riga `sent` con lo stesso `meta` (vedi `giaInviato`). Se
 *    la lettura fallisce NON si invia: meglio uno in meno che uno doppio.
 *  - Un errore su un invio non ferma gli altri.
 *
 * Le date si ragionano nel fuso di Roma: la rotta gira alle 07:00 UTC ma
 * «domani» è quello degli utenti, non quello del server.
 */

export const MAX_INVII_PER_ESECUZIONE = 200;

type Admin = ReturnType<typeof createAdminClient>;
type Tipo = Extract<EmailKey, "event_reminder" | "feedback_request" | "consultation_reminder">;

export interface EsitoPromemoria {
  tipo: Tipo;
  oggetto: string;
  ruolo: string;
  destinatario: string;
  esito: "inviato" | "da-inviare" | "gia-inviato" | "saltato" | "fallito";
  nota?: string;
}

export interface RiepilogoPromemoria {
  dry: boolean;
  oggiRoma: string;
  domaniRoma: string;
  ieriRoma: string;
  inviati: number;
  daInviare: number;
  giaInviati: number;
  saltati: number;
  falliti: number;
  rinviatiPerLimite: number;
  errori: string[];
  dettaglio: EsitoPromemoria[];
}

/** YYYY-MM-DD nel fuso di Roma. */
function dataRoma(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Somma giorni a una data YYYY-MM-DD (aritmetica in UTC: niente salti d'ora legale). */
function spostaGiorni(ymd: string, giorni: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + giorni)).toISOString().slice(0, 10);
}

function maschera(email: string): string {
  const [l, d] = email.split("@");
  return d ? `${l.slice(0, 1)}***@${d}` : "***";
}

export async function inviaPromemoria(opts: { dry: boolean; now?: Date }): Promise<RiepilogoPromemoria> {
  const admin = createAdminClient();
  const now = opts.now ?? new Date();
  const oggi = dataRoma(now);
  const domani = spostaGiorni(oggi, 1);
  const ieri = spostaGiorni(oggi, -1);

  const r: RiepilogoPromemoria = {
    dry: opts.dry,
    oggiRoma: oggi,
    domaniRoma: domani,
    ieriRoma: ieri,
    inviati: 0,
    daInviare: 0,
    giaInviati: 0,
    saltati: 0,
    falliti: 0,
    rinviatiPerLimite: 0,
    errori: [],
    dettaglio: [],
  };

  const emailCache = new Map<string, string | null>();
  async function emailDi(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    if (emailCache.has(userId)) return emailCache.get(userId) ?? null;
    const { data, error } = await admin.auth.admin.getUserById(userId);
    const email = error ? null : (data.user?.email ?? null);
    if (error) logger.warn("promemoria", `utente ${userId} non leggibile: ${error.message}`);
    emailCache.set(userId, email);
    return email;
  }

  /** true = già partito O non si può sapere (in entrambi i casi non si invia). */
  async function giaInviato(tipo: Tipo, meta: Record<string, string>): Promise<"si" | "no" | "errore"> {
    const { count, error } = await admin
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("template", tipo)
      .eq("status", "sent")
      .contains("meta", meta);
    if (error) {
      logger.error("promemoria", `email_log non leggibile, nessun invio per ${tipo}: ${error.message}`);
      r.errori.push(`email_log: ${error.message}`);
      return "errore";
    }
    return (count ?? 0) > 0 ? "si" : "no";
  }

  async function processa<K extends Tipo>(p: {
    tipo: K;
    oggetto: string;
    ruolo: string;
    to: string | null;
    meta: Record<string, string>;
    subject: string;
    params: Parameters<typeof dispatchEmail<K>>[0]["params"];
  }): Promise<void> {
    const riga: EsitoPromemoria = {
      tipo: p.tipo,
      oggetto: p.oggetto,
      ruolo: p.ruolo,
      destinatario: p.to ? maschera(p.to) : "-",
      esito: "saltato",
    };
    r.dettaglio.push(riga);

    if (!p.to) {
      riga.nota = "destinatario senza email";
      r.saltati++;
      return;
    }
    const gia = await giaInviato(p.tipo, p.meta);
    if (gia === "errore") {
      riga.nota = "email_log non leggibile";
      r.saltati++;
      return;
    }
    if (gia === "si") {
      riga.esito = "gia-inviato";
      r.giaInviati++;
      return;
    }
    if (r.inviati + r.daInviare >= MAX_INVII_PER_ESECUZIONE) {
      riga.nota = "limite per esecuzione raggiunto";
      r.rinviatiPerLimite++;
      return;
    }
    if (opts.dry) {
      riga.esito = "da-inviare";
      r.daInviare++;
      return;
    }
    try {
      const res = await dispatchEmail({
        key: p.tipo,
        to: p.to,
        params: p.params,
        subjectPreview: p.subject,
        meta: p.meta as Json,
      });
      if (res.ok) {
        riga.esito = "inviato";
        r.inviati++;
      } else {
        // `skipped`: chiave non attiva su Brevo / template non pubblicato.
        riga.esito = res.skipped ? "saltato" : "fallito";
        riga.nota = res.skipped ? "email non inviata (chiave non attiva o template mancante)" : "invio fallito";
        if (res.skipped) r.saltati++;
        else r.falliti++;
      }
    } catch (e) {
      riga.esito = "fallito";
      riga.nota = e instanceof Error ? e.message : String(e);
      r.falliti++;
      logger.error("promemoria", `${p.tipo} ${p.oggetto}: ${riga.nota}`);
    }
  }

  const base = getSiteUrl();

  // ── 1 e 2. Date confermate: evento di domani, evento di ieri ──────────────
  const { data: bookings, error: bErr } = await admin
    .from("booking_requests")
    .select(
      "id, event_date, time_slot, status, artist_id, organizer_id, venue_id, final_price, final_price_confirmed_at"
    )
    .eq("status", "confermata")
    .in("event_date", [domani, ieri]);
  if (bErr) {
    logger.error("promemoria", `booking_requests non leggibile: ${bErr.message}`);
    r.errori.push(`booking_requests: ${bErr.message}`);
  } else if ((bookings ?? []).length > 0) {
    const rows = bookings ?? [];
    const artistIds = [...new Set(rows.map((b) => b.artist_id))];
    const orgIds = [...new Set(rows.map((b) => b.organizer_id))];
    const venueIds = [...new Set(rows.map((b) => b.venue_id).filter((v): v is string => !!v))];

    const [artR, orgR, venR] = await Promise.all([
      admin.from("artists").select("id, user_id, stage_name").in("id", artistIds),
      admin.from("organizers").select("id, user_id, display_name").in("id", orgIds),
      venueIds.length
        ? admin.from("venues").select("id, name, city, address").in("id", venueIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (artR.error || orgR.error || venR.error) {
      const msg = artR.error?.message ?? orgR.error?.message ?? venR.error?.message ?? "";
      logger.error("promemoria", `anagrafiche non leggibili: ${msg}`);
      r.errori.push(`anagrafiche: ${msg}`);
    } else {
      const artisti = new Map((artR.data ?? []).map((a) => [a.id, a]));
      const organizzatori = new Map((orgR.data ?? []).map((o) => [o.id, o]));
      const locali = new Map((venR.data ?? []).map((v) => [v.id, v]));

      // Recensioni già lasciate (anche nascoste: la riga esiste, l'invito no).
      const ieriIds = rows.filter((b) => b.event_date === ieri).map((b) => b.id);
      let conRecensione = new Set<string>();
      let recensioniLeggibili = true;
      if (ieriIds.length) {
        const { data: fb, error: fErr } = await admin
          .from("feedback")
          .select("booking_request_id")
          .in("booking_request_id", ieriIds);
        if (fErr) {
          recensioniLeggibili = false;
          logger.error("promemoria", `feedback non leggibile, inviti non inviati: ${fErr.message}`);
          r.errori.push(`feedback: ${fErr.message}`);
        } else {
          conRecensione = new Set((fb ?? []).map((f) => f.booking_request_id));
        }
      }

      for (const b of rows) {
        const art = artisti.get(b.artist_id);
        const org = organizzatori.get(b.organizer_id);
        if (!art || !org) {
          r.saltati++;
          r.dettaglio.push({
            tipo: b.event_date === domani ? "event_reminder" : "feedback_request",
            oggetto: `booking ${b.id}`,
            ruolo: "-",
            destinatario: "-",
            esito: "saltato",
            nota: "artista o organizzatore non trovato",
          });
          continue;
        }
        const artName = art.stage_name;
        const orgName = org.display_name;

        if (b.event_date === domani) {
          const ven = b.venue_id ? locali.get(b.venue_id) : undefined;
          const comuni = {
            whenLabel: "domani",
            eventDate: formatDateIt(b.event_date),
            eventTime: b.time_slot ?? "",
            city: ven?.city ?? "",
            address: ven?.address ?? "",
            // Solo se il compenso è stato confermato da entrambe le parti.
            priceLabel: b.final_price_confirmed_at ? formatEuro(b.final_price) : "",
          };
          await processa({
            tipo: "event_reminder",
            oggetto: `booking ${b.id}`,
            ruolo: "artista",
            to: await emailDi(art.user_id),
            meta: { reminder: "event_reminder", bookingId: b.id, role: "artist" },
            subject: `Promemoria: ${comuni.eventDate} con ${orgName}`,
            params: {
              ...comuni,
              recipientName: artName,
              counterpartName: orgName,
              bookingUrl: `${base}/dashboard/leads?highlight=${b.id}`,
              chatUrl: `${base}/dashboard/chat`,
            },
          });
          await processa({
            tipo: "event_reminder",
            oggetto: `booking ${b.id}`,
            ruolo: "organizzatore",
            to: await emailDi(org.user_id),
            meta: { reminder: "event_reminder", bookingId: b.id, role: "organizer" },
            subject: `Promemoria: ${comuni.eventDate} con ${artName}`,
            params: {
              ...comuni,
              recipientName: orgName,
              counterpartName: artName,
              bookingUrl: `${base}/organizzatore/richieste/${b.id}`,
              chatUrl: `${base}/organizzatore/chat`,
            },
          });
        } else if (recensioniLeggibili && !conRecensione.has(b.id)) {
          await processa({
            tipo: "feedback_request",
            oggetto: `booking ${b.id}`,
            ruolo: "organizzatore",
            to: await emailDi(org.user_id),
            meta: { reminder: "feedback_request", bookingId: b.id, role: "organizer" },
            subject: `Com'è andata con ${artName}?`,
            params: {
              organizerName: orgName,
              artistName: artName,
              eventDate: formatDateIt(b.event_date),
              feedbackUrl: `${base}/organizzatore/feedback`,
            },
          });
        }
      }
    }
  }

  await consulenzeDiDomani(admin, domani, base, processa, r);
  return r;
}

/** 3. Consulenze confermate il cui giorno (a Roma) è domani. */
async function consulenzeDiDomani(
  admin: Admin,
  domani: string,
  base: string,
  processa: (p: {
    tipo: "consultation_reminder";
    oggetto: string;
    ruolo: string;
    to: string | null;
    meta: Record<string, string>;
    subject: string;
    params: Parameters<typeof dispatchEmail<"consultation_reminder">>[0]["params"];
  }) => Promise<void>,
  r: RiepilogoPromemoria
): Promise<void> {
  // Finestra larga (±1 giorno) e filtro esatto in JS sulla data di Roma:
  // evita errori di calcolo con l'ora legale.
  const da = `${spostaGiorni(domani, -1)}T00:00:00Z`;
  const a = `${spostaGiorni(domani, 2)}T00:00:00Z`;
  const { data: slots, error: sErr } = await admin
    .from("consultant_slots")
    .select("id, slot_at, duration_min, consultant_id")
    .gte("slot_at", da)
    .lt("slot_at", a);
  if (sErr) {
    logger.error("promemoria", `consultant_slots non leggibile: ${sErr.message}`);
    r.errori.push(`consultant_slots: ${sErr.message}`);
    return;
  }
  const domaniSlots = (slots ?? []).filter((s) => dataRomaSlot(s.slot_at) === domani);
  if (domaniSlots.length === 0) return;

  const { data: cons, error: cErr } = await admin
    .from("consultations")
    .select("id, slot_id, user_id, name, email, status")
    .eq("status", "confirmed")
    .in("slot_id", domaniSlots.map((s) => s.id));
  if (cErr) {
    logger.error("promemoria", `consultations non leggibile: ${cErr.message}`);
    r.errori.push(`consultations: ${cErr.message}`);
    return;
  }
  if ((cons ?? []).length === 0) return;

  const consultantIds = [...new Set(domaniSlots.map((s) => s.consultant_id).filter((v): v is string => !!v))];
  const nomi = new Map<string, string>();
  if (consultantIds.length) {
    const { data, error } = await admin.from("consultants").select("id, name").in("id", consultantIds);
    // Il nome del consulente è facoltativo: in caso di errore la riga manca.
    if (error) logger.warn("promemoria", `consultants non leggibile: ${error.message}`);
    else for (const c of data ?? []) nomi.set(c.id, c.name);
  }

  // Il pannello /dashboard/consulenza esiste solo per artisti e superadmin.
  const userIds = [...new Set((cons ?? []).map((c) => c.user_id).filter((v): v is string => !!v))];
  const conPannello = new Set<string>();
  if (userIds.length) {
    const { data, error } = await admin.from("profiles").select("id, role").in("id", userIds);
    if (error) logger.warn("promemoria", `profiles non leggibile, link pannello generico: ${error.message}`);
    else for (const p of data ?? []) if (p.role === "artist" || p.role === "superadmin") conPannello.add(p.id);
  }

  const slotMap = new Map(domaniSlots.map((s) => [s.id, s]));
  for (const c of cons ?? []) {
    const s = c.slot_id ? slotMap.get(c.slot_id) : undefined;
    if (!s) continue;
    const timeLabel = formatTimeRome(s.slot_at);
    await processa({
      tipo: "consultation_reminder",
      oggetto: `consulenza ${c.id}`,
      ruolo: "richiedente",
      to: c.email || null,
      meta: { reminder: "consultation_reminder", consultationId: c.id, role: "requester" },
      subject: `Domani la tua consulenza · ${timeLabel}`,
      params: {
        name: c.name,
        consultantName: s.consultant_id ? (nomi.get(s.consultant_id) ?? "") : "",
        dateLabel: formatDateRome(s.slot_at),
        timeLabel,
        durationLabel: formatMinutes(s.duration_min),
        // Nessuna colonna per modalità, link e tema: restano vuoti e le righe
        // (e il bottone «Collegati») non compaiono nel template.
        modeLabel: "",
        meetingUrl: "",
        topic: "",
        statusLabel: "Confermato",
        notes: "",
        panelUrl: c.user_id && conPannello.has(c.user_id) ? `${base}/dashboard/consulenza` : base,
        calendarUrl: "",
        email: "",
        phone: "",
        adminUrl: "",
      },
    });
  }
}

function dataRomaSlot(iso: string): string {
  return dataRoma(new Date(iso));
}
