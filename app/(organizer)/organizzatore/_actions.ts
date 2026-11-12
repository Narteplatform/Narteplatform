"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import {
  organizerProfileSchema,
  registraAccordoSchema,
  venueSchema,
  type OrganizerProfileInput,
  type RegistraAccordoInput,
  type VenueInput,
} from "@/lib/validators/schemas";
import { canaleTrattativa, chatAttivaPerArtista, emailAccount } from "@/lib/chat/accesso";
import {
  sendAgreementProposedEmail,
  sendBookingAcceptedEmail,
  sendBookingCancelledByOrganizerEmail,
  sendBookingConfirmedEmail,
  sendBookingDeclinedEmail,
} from "@/lib/emails/booking-notify";
import { creaNotifichePerArtista, creaNotifichePerOrganizzatore } from "@/lib/notifications";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

// =========================================
// Profilo organizzatore
// =========================================
export async function updateOrganizerProfile(input: OrganizerProfileInput) {
  const { organizer } = await requireOrganizer();
  const parsed = organizerProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizers")
    .update({
      display_name: parsed.data.display_name,
      bio: parsed.data.bio ?? null,
      is_brand: parsed.data.is_brand ?? false,
      is_private: parsed.data.is_private ?? false,
      avatar_url: parsed.data.avatar_url ?? null,
      phone: parsed.data.phone ?? null,
      website: parsed.data.website ?? null,
      instagram: parsed.data.instagram ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizer.id);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/organizzatore");
  revalidatePath("/organizzatore/profilo");
  return { ok: true as const };
}

// =========================================
// Strutture (venues)
// =========================================
export async function createVenue(input: VenueInput) {
  const { organizer } = await requireOrganizer();
  const parsed = venueSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const admin = createAdminClient();
  const baseSlug = slugify(parsed.data.name) || "struttura";
  // Trova slug univoco
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const { data: hit } = await admin
      .from("venues")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!hit) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data, error } = await admin
    .from("venues")
    .insert({
      organizer_id: organizer.id,
      name: parsed.data.name,
      slug,
      venue_type: parsed.data.venue_type ?? "altro",
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      region: parsed.data.region ?? null,
      postal_code: parsed.data.postal_code ?? null,
      capacity: parsed.data.capacity ?? null,
      description: parsed.data.description ?? null,
      cover_image: parsed.data.cover_image ?? null,
      gallery: parsed.data.gallery ?? [],
      website: parsed.data.website ?? null,
      instagram: parsed.data.instagram ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/organizzatore/strutture");
  return { ok: true as const, id: data.id };
}

export async function updateVenue(venueId: string, input: VenueInput) {
  const { organizer } = await requireOrganizer();
  const parsed = venueSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const admin = createAdminClient();
  // Verifica ownership
  const { data: existing } = await admin
    .from("venues")
    .select("id, organizer_id")
    .eq("id", venueId)
    .maybeSingle();
  if (!existing || existing.organizer_id !== organizer.id) {
    return { ok: false as const, error: "Non autorizzato" };
  }
  // Una struttura nascosta dal team non si modifica né si elimina da qui:
  // la decisione si contesta, non si aggira (doc. 06).
  if (await strutturaNascosta(admin, venueId)) {
    return {
      ok: false as const,
      error: "Questa struttura è stata nascosta dal team N'arte: per modificarla o contestare la decisione scrivi a info@narteofficial.it.",
    };
  }

  const { error } = await admin
    .from("venues")
    .update({
      name: parsed.data.name,
      venue_type: parsed.data.venue_type ?? "altro",
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      region: parsed.data.region ?? null,
      postal_code: parsed.data.postal_code ?? null,
      capacity: parsed.data.capacity ?? null,
      description: parsed.data.description ?? null,
      cover_image: parsed.data.cover_image ?? null,
      gallery: parsed.data.gallery ?? [],
      website: parsed.data.website ?? null,
      instagram: parsed.data.instagram ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", venueId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/organizzatore/strutture");
  revalidatePath(`/organizzatore/strutture/${venueId}`);
  return { ok: true as const };
}

export async function deleteVenue(venueId: string) {
  const { organizer } = await requireOrganizer();
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("venues")
    .select("id, organizer_id")
    .eq("id", venueId)
    .maybeSingle();
  if (!existing || existing.organizer_id !== organizer.id) {
    return { ok: false as const, error: "Non autorizzato" };
  }
  // Una struttura nascosta dal team non si modifica né si elimina da qui:
  // la decisione si contesta, non si aggira (doc. 06).
  if (await strutturaNascosta(admin, venueId)) {
    return {
      ok: false as const,
      error: "Questa struttura è stata nascosta dal team N'arte: per modificarla o contestare la decisione scrivi a info@narteofficial.it.",
    };
  }
  const { error } = await admin.from("venues").delete().eq("id", venueId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/organizzatore/strutture");
  return { ok: true as const };
}

// =========================================
// Booking requests — azioni organizer
// =========================================
/**
 * Conferma della data da parte dell'organizzatore, SOLO per le richieste
 * «accettata»: l'artista ha accettato un'offerta in chat prima della 0080 (o
 * prima che fosse applicata) e manca il secondo sì. Il compenso confermato è
 * quello dell'offerta, salvato in `budget_offer` da accept_offer_v2.
 *
 * Una richiesta «in_trattativa» non si conferma da qui, senza prezzo: con un
 * artista Pro/Max si conferma accettando un'offerta in chat, con un artista
 * Free registrando l'accordo (`registraAccordo`) che l'artista conferma.
 */
export async function confirmBookingRequest(requestId: string) {
  const { user, organizer } = await requireOrganizer();
  const admin = createAdminClient();
  const { data: req, error: reqErr } = await admin
    .from("booking_requests")
    .select("id, organizer_id, status, artist_id, event_date, venue_id, budget_offer, final_price")
    .eq("id", requestId)
    .maybeSingle();
  if (reqErr) return { ok: false as const, error: reqErr.message };
  if (!req || req.organizer_id !== organizer.id) {
    return { ok: false as const, error: "Non autorizzato" };
  }
  if (req.status === "in_trattativa") {
    const chat = await chatAttivaPerArtista(req.artist_id);
    return {
      ok: false as const,
      error: chat
        ? "La data si conferma in chat: invia un'offerta con il compenso o accetta quella dell'artista."
        : "Registra l'accordo (data e compenso): la data si blocca quando l'artista lo conferma.",
    };
  }
  if (req.status !== "accettata") {
    return { ok: false as const, error: "Richiesta non da confermare" };
  }
  const prezzo = req.final_price ?? req.budget_offer;
  const ora = new Date().toISOString();
  const { data: aggiornate, error } = await admin
    .from("booking_requests")
    .update({
      status: "confermata",
      organizer_confirmed_at: ora,
      ...(prezzo != null && req.final_price == null
        ? {
            final_price: prezzo,
            final_price_proposed_by: user.id,
            final_price_proposed_at: ora,
            final_price_confirmed_by: user.id,
            final_price_confirmed_at: ora,
          }
        : {}),
    })
    .eq("id", requestId)
    .eq("status", "accettata")
    .select("id");
  if (error) {
    // L'indice unico sulle date confermate (artista, giorno) scatta qui se la
    // stessa data è già stata confermata con qualcun altro.
    if (error.code === "23505") {
      return { ok: false as const, error: "L'artista ha già una data confermata in quel giorno." };
    }
    return { ok: false as const, error: error.message };
  }
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false as const, error: "La richiesta è cambiata nel frattempo: ricarica la pagina." };
  }

  await sendBookingConfirmedEmail(requestId).catch((e) => console.error("email confirmed:", e));

  void creaNotifichePerArtista(req.artist_id, {
    kind: "booking_confermata",
    title: "Data confermata",
    body: `L'organizzatore ha confermato la data del ${req.event_date}.`,
    href: "/dashboard/leads?status=confermata",
  }).catch(() => undefined);

  revalidaBooking();
  return { ok: true as const };
}

/** Pagine che mostrano lo stato di una richiesta, per entrambe le parti. */
function revalidaBooking() {
  revalidatePath("/organizzatore/richieste", "layout");
  revalidatePath("/organizzatore/calendario");
  revalidatePath("/organizzatore");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/calendario");
  revalidatePath("/dashboard/chat", "layout");
  revalidatePath("/organizzatore/chat", "layout");
  revalidatePath("/artisti", "layout");
}

/**
 * Artista sul piano Free: la trattativa si è svolta via email e
 * l'organizzatore registra l'accordo (data, fascia, compenso). È la sua
 * conferma; la data si blocca solo quando l'artista conferma a sua volta
 * (`confermaAccordo`). Una nuova registrazione sostituisce la precedente.
 */
export async function registraAccordo(input: RegistraAccordoInput) {
  const { user, organizer } = await requireOrganizer();
  const parsed = registraAccordoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const admin = createAdminClient();
  const { data: req, error: reqErr } = await admin
    .from("booking_requests")
    .select("id, organizer_id, status, artist_id")
    .eq("id", parsed.data.request_id)
    .maybeSingle();
  if (reqErr) return { ok: false as const, error: reqErr.message };
  if (!req || req.organizer_id !== organizer.id) {
    return { ok: false as const, error: "Non autorizzato" };
  }
  if (req.status !== "in_trattativa") {
    return { ok: false as const, error: "Si registra un accordo solo su una richiesta in trattativa." };
  }
  if (await chatAttivaPerArtista(req.artist_id)) {
    return {
      ok: false as const,
      error: "Con questo artista l'accordo si fa in chat: invia un'offerta con data e compenso.",
    };
  }
  const oggi = new Date().toISOString().slice(0, 10);
  if (parsed.data.event_date < oggi) {
    return { ok: false as const, error: "La data dell'accordo è già passata." };
  }

  const ora = new Date().toISOString();
  const { data: aggiornate, error } = await admin
    .from("booking_requests")
    .update({
      event_date: parsed.data.event_date,
      time_slot: parsed.data.time_slot,
      // `budget_offer` resta il range indicato nella richiesta: il compenso
      // concordato vive in `final_price`.
      final_price: parsed.data.price,
      final_price_proposed_by: user.id,
      final_price_proposed_at: ora,
      final_price_confirmed_by: null,
      final_price_confirmed_at: null,
      updated_at: ora,
    })
    .eq("id", req.id)
    .eq("status", "in_trattativa")
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false as const, error: "La richiesta è cambiata nel frattempo: ricarica la pagina." };
  }

  await sendAgreementProposedEmail(req.id).catch((e) => console.error("email accordo:", e));
  void creaNotifichePerArtista(req.artist_id, {
    kind: "accordo_da_confermare",
    title: "Conferma l'accordo",
    body: `${organizer.display_name} ha registrato l'accordo: ${parsed.data.price.toLocaleString("it-IT")} € per il ${parsed.data.event_date}. Confermalo per bloccare la data.`,
    href: `/dashboard/leads?status=in_trattativa&highlight=${req.id}`,
  }).catch(() => undefined);

  revalidaBooking();
  return { ok: true as const };
}

/**
 * Richiesta caricata per un'azione dell'ARTISTA: verifica che chi chiama
 * possieda il profilo (o sia superadmin). Ogni lettura controlla `error`.
 */
async function richiestaDellArtista(requestId: string) {
  const admin = createAdminClient();
  const supabaseSrv = await createClient();
  const {
    data: { user },
  } = await supabaseSrv.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const { data: req, error: reqErr } = await admin
    .from("booking_requests")
    .select("id, artist_id, organizer_id, status, event_date, final_price, final_price_proposed_by")
    .eq("id", requestId)
    .maybeSingle();
  if (reqErr) return { ok: false as const, error: reqErr.message };
  if (!req) return { ok: false as const, error: "Richiesta non trovata" };

  const [{ data: artist, error: aErr }, { data: profile, error: pErr }] = await Promise.all([
    admin.from("artists").select("id, user_id, stage_name").eq("id", req.artist_id).maybeSingle(),
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (aErr || pErr) return { ok: false as const, error: (aErr ?? pErr)?.message ?? "Errore di lettura" };
  const isOwner = artist?.user_id === user.id;
  const isSuper = profile?.role === "superadmin";
  if (!isOwner && !isSuper) return { ok: false as const, error: "Non autorizzato" };
  return { ok: true as const, user, req, artistName: artist?.stage_name ?? "L'artista" };
}

/**
 * L'artista (Free) conferma l'accordo registrato dall'organizzatore: è il
 * secondo sì. La data diventa «confermata» e si blocca a quel compenso.
 */
export async function confermaAccordo(requestId: string) {
  const ctx = await richiestaDellArtista(requestId);
  if (!ctx.ok) return ctx;
  const { req, user } = ctx;
  if (req.status !== "in_trattativa" || req.final_price == null || !req.final_price_proposed_by) {
    return { ok: false as const, error: "Non c'è un accordo da confermare su questa richiesta." };
  }
  const admin = createAdminClient();
  const ora = new Date().toISOString();
  const { data: aggiornate, error } = await admin
    .from("booking_requests")
    .update({
      status: "confermata",
      artist_accepted_at: ora,
      organizer_confirmed_at: ora,
      final_price_confirmed_by: user.id,
      final_price_confirmed_at: ora,
    })
    .eq("id", req.id)
    .eq("status", "in_trattativa")
    .eq("final_price", req.final_price)
    .not("final_price_proposed_by", "is", null)
    .select("id");
  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Hai già una data confermata in quel giorno." };
    }
    return { ok: false as const, error: error.message };
  }
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false as const, error: "L'accordo è cambiato nel frattempo: ricarica la pagina." };
  }

  await sendBookingConfirmedEmail(req.id).catch((e) => console.error("email confirmed:", e));
  void creaNotifichePerOrganizzatore(req.organizer_id, {
    kind: "booking_confermata",
    title: "Data confermata",
    body: `${ctx.artistName} ha confermato l'accordo: la data del ${req.event_date} è bloccata.`,
    href: `/organizzatore/richieste/${req.id}`,
  }).catch(() => undefined);

  revalidaBooking();
  return { ok: true as const };
}

/**
 * L'artista indica che l'accordo registrato non corrisponde a quanto si sono
 * detti. Si annulla SOLO la proposta di quella richiesta (compenso e chi l'ha
 * proposto): è l'effetto voluto, e l'aggiornamento filtra per id, stato e
 * compenso letto, così non tocca un accordo nel frattempo registrato di nuovo.
 */
export async function respingiAccordo(requestId: string) {
  const ctx = await richiestaDellArtista(requestId);
  if (!ctx.ok) return ctx;
  const { req } = ctx;
  if (req.status !== "in_trattativa" || req.final_price == null || !req.final_price_proposed_by) {
    return { ok: false as const, error: "Non c'è un accordo da rifiutare su questa richiesta." };
  }
  const admin = createAdminClient();
  const { data: aggiornate, error } = await admin
    .from("booking_requests")
    .update({
      final_price: null,
      final_price_proposed_by: null,
      final_price_proposed_at: null,
      final_price_confirmed_by: null,
      final_price_confirmed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.id)
    .eq("status", "in_trattativa")
    .eq("final_price", req.final_price)
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false as const, error: "L'accordo è cambiato nel frattempo: ricarica la pagina." };
  }

  void creaNotifichePerOrganizzatore(req.organizer_id, {
    kind: "accordo_non_confermato",
    title: "Accordo non confermato",
    body: `${ctx.artistName} indica che l'accordo registrato non corrisponde. Sentitevi via email e registralo di nuovo.`,
    href: `/organizzatore/richieste/${req.id}`,
  }).catch(() => undefined);

  revalidaBooking();
  return { ok: true as const };
}

export async function cancelBookingRequest(requestId: string) {
  const { user, organizer } = await requireOrganizer();
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("booking_requests")
    .select("id, organizer_id, status, artist_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.organizer_id !== organizer.id) {
    return { ok: false as const, error: "Non autorizzato" };
  }
  // Solo una richiesta ancora aperta si annulla da qui. Una data CONFERMATA la
  // può annullare esclusivamente il Team, con motivazione, tramite
  // `superadmin_cancel_booking`: prima questo controllo lasciava passare
  // `confermata`, e bastava una chiamata diretta all'azione (il pulsante era
  // nascosto solo nell'interfaccia) per liberare una data già concordata.
  const ANNULLABILI = ["pending", "in_trattativa", "accettata"] as const;
  if (!(ANNULLABILI as readonly string[]).includes(req.status)) {
    return {
      ok: false as const,
      error:
        req.status === "confermata"
          ? "Una data confermata non si annulla da qui: scrivi al team N'arte."
          : "Richiesta già chiusa",
    };
  }
  // Il filtro sullo stato va anche nell'UPDATE: se nel frattempo la richiesta
  // è stata confermata, l'aggiornamento non tocca nulla invece di annullarla.
  const { data: aggiornate, error } = await admin
    .from("booking_requests")
    .update({
      status: "annullata",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
    })
    .eq("id", requestId)
    .in("status", ANNULLABILI)
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false as const, error: "La richiesta è cambiata nel frattempo: ricarica la pagina." };
  }

  // Finora l'artista non veniva avvisato: si ritrovava la data libera senza
  // sapere perché, oppure la teneva bloccata credendola ancora valida.
  await sendBookingCancelledByOrganizerEmail(requestId).catch((e) =>
    console.error("[email] annullamento organizzatore:", e)
  );

  void creaNotifichePerArtista(req.artist_id, {
    kind: "booking_annullata",
    title: "Richiesta annullata",
    body: "L'organizzatore ha annullato una richiesta di booking.",
    href: "/dashboard/leads",
  }).catch(() => undefined);

  revalidatePath("/organizzatore/richieste");
  revalidatePath("/organizzatore");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// =========================================
// Booking requests — azioni artista (handshake)
// =========================================
export type AvvioTrattativa =
  | { ok: true; canale: "chat"; conversationId: string | null }
  | {
      ok: true;
      canale: "email";
      organizzatore: { nome: string; email: string | null; telefono: string | null };
    }
  | { ok: false; error: string };

/**
 * «Inizia trattativa»: l'artista risponde alla richiesta e apre la trattativa.
 * NON conferma nulla: la data si blocca solo con la doppia conferma del prezzo.
 *
 * - artista Pro/Max → si apre la chat (con un messaggio di apertura) e il
 *   client porta l'artista nella conversazione;
 * - artista Free → nessuna chat: si restituiscono i recapiti
 *   dell'organizzatore e la trattativa prosegue via email.
 */
export async function artistAcceptRequest(requestId: string, notes?: string): Promise<AvvioTrattativa> {
  const admin = createAdminClient();
  const supabaseSrv = await createClient();
  const {
    data: { user },
  } = await supabaseSrv.auth.getUser();
  if (!user) return { ok: false, error: "Non autorizzato" };

  const { data: req, error: reqErr } = await admin
    .from("booking_requests")
    .select("id, artist_id, organizer_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (reqErr) return { ok: false, error: reqErr.message };
  if (!req) return { ok: false, error: "Richiesta non trovata" };

  const [{ data: artist, error: aErr }, { data: profile, error: pErr }] = await Promise.all([
    admin.from("artists").select("id, user_id, stage_name").eq("id", req.artist_id).maybeSingle(),
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (aErr || pErr) return { ok: false, error: (aErr ?? pErr)?.message ?? "Errore di lettura" };
  const isOwner = artist?.user_id === user.id;
  const isSuper = profile?.role === "superadmin";
  if (!isOwner && !isSuper) return { ok: false, error: "Non autorizzato" };
  if (req.status !== "pending") return { ok: false, error: "Hai già risposto a questa richiesta." };

  const nota = notes?.trim() || null;
  // Il filtro sullo stato va anche nell'UPDATE: due clic ravvicinati (o un
  // annullamento dell'organizzatore nel frattempo) non devono sovrascriversi.
  const { data: aggiornate, error } = await admin
    .from("booking_requests")
    .update({
      status: "in_trattativa",
      artist_accepted_at: new Date().toISOString(),
      notes_artist: nota,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false, error: "La richiesta è cambiata nel frattempo: ricarica la pagina." };
  }

  const canale = await canaleTrattativa(req.artist_id);
  const artistName = artist?.stage_name ?? "L'artista";

  let conversationId: string | null = null;
  if (canale === "chat") {
    // Modello chat v2 (0013): una conversazione per coppia (artista,
    // organizzatore). L'RPC è security definer e valida il chiamante: va usato
    // il client utente, non quello service-role (con cui auth.uid() è null).
    const { data: convId, error: convError } = await supabaseSrv.rpc("get_or_create_conversation", {
      p_artist_id: req.artist_id,
      p_organizer_id: req.organizer_id,
    });
    if (convError || !convId) {
      console.error("chat opener: conversazione non disponibile:", convError?.message);
    } else {
      conversationId = convId as unknown as string;
      const opener = nota
        ? `${artistName} ha iniziato la trattativa: «${nota}». Accordatevi qui: la data si blocca quando uno dei due accetta l'offerta dell'altro, al prezzo indicato.`
        : `${artistName} ha iniziato la trattativa. Accordatevi qui: la data si blocca quando uno dei due accetta l'offerta dell'altro, al prezzo indicato.`;
      const { error: openerError } = await admin.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_role: "artist",
        kind: "system",
        body: opener,
      });
      if (openerError) console.error("chat opener insert:", openerError.message);
    }
  }

  await sendBookingAcceptedEmail(requestId, { canale }).catch((e) => console.error("email trattativa:", e));

  void creaNotifichePerOrganizzatore(req.organizer_id, {
    kind: "booking_accettata",
    title: `${artistName} ha iniziato la trattativa`,
    body:
      canale === "chat"
        ? "Entra in chat per accordarvi su data e compenso."
        : "L'artista è sul piano Free: vi accorderete via email. Trovi il suo indirizzo nella richiesta.",
    href:
      canale === "chat" && conversationId
        ? `/organizzatore/chat/${conversationId}`
        : `/organizzatore/richieste/${requestId}`,
  }).catch(() => undefined);

  revalidaBooking();

  if (canale === "chat") return { ok: true, canale, conversationId };

  const { data: org, error: orgErr } = await admin
    .from("organizers")
    .select("display_name, phone, user_id")
    .eq("id", req.organizer_id)
    .maybeSingle();
  if (orgErr) console.error("recapiti organizzatore:", orgErr.message);
  return {
    ok: true,
    canale,
    organizzatore: {
      nome: org?.display_name ?? "Organizzatore",
      email: await emailAccount(org?.user_id),
      telefono: org?.phone ?? null,
    },
  };
}

export async function artistDeclineRequest(requestId: string) {
  const admin = createAdminClient();
  const supabaseSrv = await import("@/lib/supabase/server").then((m) => m.createClient());
  const {
    data: { user },
  } = await supabaseSrv.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const { data: req } = await admin
    .from("booking_requests")
    .select("id, artist_id, organizer_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { ok: false as const, error: "Richiesta non trovata" };

  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id")
    .eq("id", req.artist_id)
    .maybeSingle();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isOwner = artist?.user_id === user.id;
  const isSuper = profile?.role === "superadmin";
  if (!isOwner && !isSuper) return { ok: false as const, error: "Non autorizzato" };
  // Si rifiuta solo una richiesta in attesa di risposta. Prima lo stato non era
  // controllato affatto: una chiamata diretta portava a «rifiutata» anche una
  // data confermata, liberandola dal calendario.
  if (req.status !== "pending") {
    return { ok: false as const, error: "Si può rifiutare solo una richiesta in attesa." };
  }

  const { data: aggiornate, error } = await admin
    .from("booking_requests")
    .update({ status: "rifiutata" })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!aggiornate || aggiornate.length === 0) {
    return { ok: false as const, error: "La richiesta è cambiata nel frattempo: ricarica la pagina." };
  }

  await sendBookingDeclinedEmail(requestId).catch((e) => console.error("email declined:", e));

  void creaNotifichePerOrganizzatore(req.organizer_id, {
    kind: "booking_rifiutata",
    title: "Richiesta non accettata",
    body: "L'artista non può accettare questa richiesta.",
    href: "/organizzatore/richieste",
  }).catch(() => undefined);

  revalidatePath("/dashboard/leads");
  revalidatePath("/organizzatore/richieste");
  return { ok: true as const };
}

/** La struttura è nascosta dal team? Prima della 0070 (colonna assente) no. */
async function strutturaNascosta(
  admin: ReturnType<typeof createAdminClient>,
  venueId: string,
): Promise<boolean> {
  const { data, error } = await admin.from("venues").select("hidden_at").eq("id", venueId).maybeSingle();
  if (error) return false;
  return Boolean((data as { hidden_at?: string | null } | null)?.hidden_at);
}
