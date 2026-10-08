import { colonnaAssente } from "@/lib/admin/schema-compat";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { bookingRequestPublicSchema } from "@/app/(user)/artisti/[slug]/_schema";
import { dispatchEmail } from "@/lib/emails/dispatch";
import { buildBookingRequestParams } from "@/lib/emails/booking-request-params";
import { getSiteUrl } from "@/lib/site-url";
import BookingRequestEmail from "@/lib/emails/templates/BookingRequestEmail";
import type { Database } from "@/lib/supabase/types";
import {
  allowByIp,
  checkRateLimit,
  emailFingerprint,
  LIMITI,
} from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import { LEGAL_VERSION } from "@/lib/legal/content";
import { registraConsensoConContesto } from "@/lib/legal/consents";
import { registraProvaSuIubendaInBackground } from "@/lib/legal/iubenda-consent";
import {
  leggiStatoOrganizzatore,
  richiediAccessoOrganizzatore,
  type EsitoRichiesta,
} from "@/lib/organizers/approvazione";

const MESSAGGIO_ORGANIZZATORE_IN_ATTESA =
  "Il tuo account organizzatore è in attesa di approvazione: ti scriviamo appena il team lo ha verificato, poi potrai inviare le richieste.";
const MESSAGGIO_ORGANIZZATORE_RIFIUTATO =
  "Il tuo account organizzatore non è stato approvato, quindi non puoi inviare richieste. Per chiarimenti scrivi a info@narteofficial.it.";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function newRid() {
  try {
    return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function fail(rid: string, step: string, error: string, status = 400) {
  console.error("[booking-request]", rid, "step=" + step, "error:", error);
  return NextResponse.json(
    { ok: false, rid, step, error: `${error} [${rid}]` },
    { status }
  );
}

export async function POST(req: Request) {
  const rid = newRid();
  try {
    logger.debug("booking-request", rid, "step=start");

    // --- Parse body
    let body: unknown = null;
    try {
      body = await req.json();
    } catch (e) {
      return fail(rid, "parse-body", "Body non valido");
    }

    const parsed = bookingRequestPublicSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return fail(rid, "zod", issues || "Dati non validi");
    }
    const data = parsed.data;

    // --- Freno: questa rotta è pubblica E CREA ACCOUNT (più sotto, per gli
    // anonimi, con admin.auth.admin.createUser). Senza limite uno script crea
    // utenti confermati a ripetizione, gonfia la MAU di Supabase e riempie il
    // database di produzione; e ogni richiesta fa partire una mail all'indirizzo
    // reale dell'artista, con testo scelto da chi invia — cioè un relay di
    // molestie dal nostro mittente verificato.
    // Soglia per indirizzo IP. Quella per email serviva al ramo che creava
    // l'account, che non esiste più: ora serve una sessione.
    const freno = await allowByIp(LIMITI.booking);
    if (!freno) {
      return fail(rid, "rate-limit", "Troppe richieste. Riprova fra un'ora.", 429);
    }

    // --- Env check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return fail(rid, "env", "Config server mancante (SERVICE_ROLE_KEY)", 500);
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return fail(rid, "admin-client", msg, 500);
    }

    // --- Load artist
    const { data: artist, error: artistErr } = await admin
      .from("artists")
      .select("id, stage_name, status, is_public, user_id")
      .eq("id", data.artistId)
      .maybeSingle();
    if (artistErr) return fail(rid, "artist-lookup", artistErr.message, 500);
    if (!artist) return fail(rid, "artist-missing", "Artista non trovato");
    if (!artist.is_public)
      return fail(rid, "artist-not-approved", "Artista non disponibile");

    // --- Current user (if any)
    const supabaseSrv = await createClient();
    const {
      data: { user: currentUser },
    } = await supabaseSrv.auth.getUser();

    // Serve un account. La richiesta non crea più un account al volo: quel
    // percorso lo nasceva con l'email già confermata e senza la dichiarazione
    // di maggiore età. Chi non è registrato passa dalla registrazione.
    if (!currentUser) {
      return fail(rid, "login-required", "Accedi o registrati per inviare una richiesta.", 401);
    }
    const userId: string = currentUser.id;
    const createdSession = false;

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .maybeSingle();
    if (profileErr) return fail(rid, "profile-lookup", profileErr.message, 500);
    const role = profile?.role;
    if (role === "artist") {
      return fail(rid, "role-artist", "Il profilo artista non può inviare richieste", 403);
    }
    let richiestaAccesso: EsitoRichiesta = { ok: true, stato: "approved", creata: false };
    if (role === "user") {
      // Diventare organizzatore significa assumere gli adempimenti dell'evento
      // (doc. 04): serve un'accettazione esplicita, e va registrata.
      if (data.acceptedOrganizerTerms !== true) {
        return fail(rid, "organizer-terms", "Devi accettare le Condizioni per gli organizzatori.");
      }
      // Dalla migration 0071 diventare organizzatore richiede l'approvazione del
      // team: la richiesta di accesso la crea (con la service role) questa
      // funzione, non più la RPC `promote_user_to_organizer`, ormai revocata
      // agli utenti. Prima della migration restituisce «approved» e il flusso
      // prosegue come sempre.
      richiestaAccesso = await richiediAccessoOrganizzatore({
        userId: currentUser.id,
        citta: data.venueCity ?? null,
      });
      if (!richiestaAccesso.ok) {
        logger.error("booking-request", rid, "richiesta-accesso-fail", richiestaAccesso.error);
        return fail(rid, "organizer-request", richiestaAccesso.error, 500);
      }
      // Con il client dell'utente: record_consent usa auth.uid().
      const consErr = await registraConsensoConContesto(supabaseSrv, {
        kind: "condizioni_organizzatori",
        version: LEGAL_VERSION,
      });
      if (consErr) {
        // Tipicamente la migration 0062 non ancora applicata. L'accettazione
        // resta nel log applicativo; non si blocca la richiesta.
        logger.warn("booking-request", rid, "consenso organizzatore non registrato:", consErr);
      }
      registraProvaSuIubendaInBackground({
        soggettoId: currentUser.id,
        email: currentUser.email ?? undefined,
        documenti: ["terms"],
        preferenze: { terms: true, condizioni_organizzatori: true },
        modulo: "Prima richiesta di booking — condizioni organizzatori",
        testoCasella:
          "Inviando la richiesta diventi organizzatore su N'arte. Ho letto e accetto le Condizioni per gli organizzatori, in particolare gli obblighi su SIAE, agibilità, permessi e sicurezza dell'evento, che restano a mio carico.",
      });

      if (richiestaAccesso.stato === "pending") {
        // La booking request NON si crea: l'organizzatore potrà inviarla
        // quando il team lo avrà approvato.
        return NextResponse.json(
          {
            ok: true,
            pending: true,
            rid,
            message:
              "Richiesta inviata al team: ti avvisiamo appena il tuo account è approvato, poi potrai inviare la richiesta.",
          },
          { status: 202 }
        );
      }
      if (richiestaAccesso.stato === "rejected") {
        return fail(rid, "organizer-rejected", MESSAGGIO_ORGANIZZATORE_RIFIUTATO, 403);
      }
    } else if (role === "organizer") {
      const stato = await leggiStatoOrganizzatore(currentUser.id);
      if (stato === "pending") {
        return fail(rid, "organizer-pending", MESSAGGIO_ORGANIZZATORE_IN_ATTESA, 403);
      }
      if (stato === "rejected") {
        return fail(rid, "organizer-rejected", MESSAGGIO_ORGANIZZATORE_RIFIUTATO, 403);
      }
    }

    if (!userId) return fail(rid, "no-user", "Sessione non valida", 401);

    // --- Ensure organizer row
    let { data: organizer, error: orgLookupErr } = await admin
      .from("organizers")
      .select("id, display_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (orgLookupErr) console.warn("[booking-request]", rid, "org-lookup-warn", orgLookupErr);

    if (!organizer) {
      const display =
        currentUser?.user_metadata?.full_name ||
        currentUser?.email?.split("@")[0] ||
        "Organizzatore";
      const { data: createdOrg, error: createOrgErr } = await admin
        .from("organizers")
        .insert({ user_id: userId, display_name: display, phone: data.phone ?? null })
        .select("id, display_name")
        .single();
      if (createOrgErr || !createdOrg) {
        return fail(
          rid,
          "create-organizer",
          createOrgErr?.message ?? "Impossibile creare profilo organizzatore",
          500
        );
      }
      organizer = createdOrg;
    } else if (data.phone) {
      await admin.from("organizers").update({ phone: data.phone }).eq("id", organizer.id);
    }

    // --- Resolve venue
    let venueId: string | null = data.venueId ?? null;
    if (venueId) {
      // Una struttura nascosta dal team non si può scegliere. Prima della
      // migration 0070 la colonna manca: in quel caso il controllo si salta.
      const { data: venueScelta, error: venueScelErr } = await admin
        .from("venues")
        .select("id, hidden_at")
        .eq("id", venueId)
        .maybeSingle();
      if (venueScelErr && !colonnaAssente(venueScelErr, "hidden_at")) {
        logger.warn("booking-request", rid, "lettura struttura fallita:", venueScelErr.message);
        return fail(rid, "venue-check", "Non riesco a verificare la struttura. Riprova.", 500);
      }
      if (venueScelta?.hidden_at) {
        return fail(rid, "venue-hidden", "Questa struttura non è al momento disponibile.", 400);
      }
    }
    if (!venueId && data.venueName) {
      const baseSlug = slugify(data.venueName) || "struttura";
      let finalSlug = baseSlug;
      for (let i = 0; i < 5; i++) {
        const { data: hit } = await admin
          .from("venues")
          .select("id")
          .eq("slug", finalSlug)
          .maybeSingle();
        if (!hit) break;
        finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
      const { data: createdVenue, error: venueErr } = await admin
        .from("venues")
        .insert({
          organizer_id: organizer.id,
          name: data.venueName,
          city: data.venueCity ?? null,
          slug: finalSlug,
        })
        .select("id")
        .single();
      if (venueErr) console.warn("[booking-request]", rid, "venue-create-warn", venueErr);
      venueId = createdVenue?.id ?? null;
    }

    // --- Insert booking request
    const composedMessage = `${data.message}${
      data.venueName && !data.venueId
        ? `\n\nStruttura: ${data.venueName}${data.venueCity ? `, ${data.venueCity}` : ""}`
        : ""
    }`;
    const { data: bookingReq, error: reqErr } = await admin
      .from("booking_requests")
      .insert({
        organizer_id: organizer.id,
        artist_id: artist.id,
        venue_id: venueId,
        event_date: data.date,
        time_slot: data.timeSlot ?? null,
        budget_offer: data.budgetOffer ?? null,
        message: composedMessage,
        status: "pending",
      })
      .select("id")
      .single();

    if (reqErr || !bookingReq) {
      return fail(rid, "insert-request", reqErr?.message ?? "Errore salvataggio", 500);
    }

    logger.debug("booking-request", rid, "step=request-inserted", bookingReq.id);

    // --- Emails (best-effort)
    try {
      let artistEmail: string | null = null;
      if (artist.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(artist.user_id);
        artistEmail = u?.user?.email ?? null;
      }
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      const requesterEmail = currentUser?.email ?? "";
      const eventLocation = data.venueName ?? data.venueCity ?? "Da definire";
      const requestParams = buildBookingRequestParams({
        artistName: artist.stage_name,
        organizerName: data.venueName ?? organizer.display_name,
        contactName: organizer.display_name,
        roleLabel: "Organizzatore",
        eventDate: data.date,
        eventTime: data.timeSlot ?? null,
        location: eventLocation,
        budget: data.budgetOffer ?? null,
        message: composedMessage,
        contactEmail: requesterEmail,
        contactPhone: data.phone ?? null,
        baseUrl: getSiteUrl(),
      });
      await Promise.allSettled([
        artistEmail
          ? dispatchEmail({
              key: "booking_request_artist",
              to: artistEmail,
              params: requestParams,
              replyTo: requesterEmail || undefined,
              fallback: {
                subject: `Nuova richiesta booking — ${data.date}`,
                template: "BookingRequestArtist",
                react: BookingRequestEmail({
                  artistName: artist.stage_name,
                  requesterName: organizer.display_name,
                  eventDate: data.date,
                  eventLocation,
                  budget: data.budgetOffer ?? null,
                  message: composedMessage,
                  contactEmail: requesterEmail,
                  contactPhone: data.phone ?? null,
                }),
              },
            })
          : Promise.resolve(),
        adminEmail
          ? dispatchEmail({
              key: "booking_request_admin",
              to: adminEmail,
              params: requestParams,
              replyTo: requesterEmail || undefined,
              fallback: {
                subject: `[N'arte] Nuova richiesta per ${artist.stage_name}`,
                template: "BookingRequestAdmin",
                react: BookingRequestEmail({
                  artistName: artist.stage_name,
                  requesterName: organizer.display_name,
                  eventDate: data.date,
                  eventLocation,
                  budget: data.budgetOffer ?? null,
                  message: composedMessage,
                  contactEmail: requesterEmail,
                  contactPhone: data.phone ?? null,
                  isAdminCopy: true,
                }),
              },
            })
          : Promise.resolve(),
      ]);
    } catch (e) {
      console.warn("[booking-request]", rid, "emails-failed", e);
    }

    return NextResponse.json({
      ok: true,
      rid,
      requestId: bookingReq.id,
      sessionCreated: createdSession,
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}${e.stack ? `\n${e.stack}` : ""}` : String(e);
    console.error("[booking-request]", rid, "step=unhandled", msg);
    return NextResponse.json(
      {
        ok: false,
        rid,
        step: "unhandled",
        error: `${e instanceof Error ? e.message : "Errore inatteso"} [${rid}]`,
      },
      { status: 500 }
    );
  }
}
