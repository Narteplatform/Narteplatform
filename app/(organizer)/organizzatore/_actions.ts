"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireOrganizer } from "@/lib/auth/guards";
import {
  organizerProfileSchema,
  venueSchema,
  type OrganizerProfileInput,
  type VenueInput,
} from "@/lib/validators/schemas";
import {
  sendBookingAcceptedEmail,
  sendBookingConfirmedEmail,
  sendBookingDeclinedEmail,
} from "@/lib/emails/send";
import { sendBookingCancelledByOrganizerEmail } from "@/lib/emails/booking-notify";

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
  const { error } = await admin.from("venues").delete().eq("id", venueId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/organizzatore/strutture");
  return { ok: true as const };
}

// =========================================
// Booking requests — azioni organizer
// =========================================
export async function confirmBookingRequest(requestId: string) {
  const { organizer } = await requireOrganizer();
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("booking_requests")
    .select("id, organizer_id, status, artist_id, event_date, venue_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.organizer_id !== organizer.id) {
    return { ok: false as const, error: "Non autorizzato" };
  }
  if (req.status !== "in_trattativa") {
    return { ok: false as const, error: "Richiesta non in trattativa" };
  }
  const { data: aggiornate, error } = await admin
    .from("booking_requests")
    .update({ status: "confermata", organizer_confirmed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "in_trattativa")
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

  revalidatePath("/organizzatore/richieste");
  revalidatePath("/organizzatore/calendario");
  revalidatePath("/organizzatore");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function cancelBookingRequest(requestId: string) {
  const { user, organizer } = await requireOrganizer();
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("booking_requests")
    .select("id, organizer_id, status")
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
  const ANNULLABILI = ["pending", "in_trattativa"] as const;
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

  revalidatePath("/organizzatore/richieste");
  revalidatePath("/organizzatore");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// =========================================
// Booking requests — azioni artista (handshake)
// =========================================
export async function artistAcceptRequest(requestId: string, notes?: string) {
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
  if (req.status !== "pending") return { ok: false as const, error: "Richiesta non pending" };

  const { error } = await admin
    .from("booking_requests")
    .update({
      status: "in_trattativa",
      artist_accepted_at: new Date().toISOString(),
      notes_artist: notes?.trim() || null,
    })
    .eq("id", requestId);
  if (error) return { ok: false as const, error: error.message };

  // Apre la chat con un system message: serve sia come opener visivo
  // sia come trigger realtime per la lista conversazioni dell'organizzatore.
  const artistName =
    (await admin.from("artists").select("stage_name").eq("id", req.artist_id).maybeSingle()).data
      ?.stage_name ?? "L'artista";
  const opener = notes?.trim()
    ? `${artistName} ha accettato la trattativa. Nota: ${notes.trim()}`
    : `${artistName} ha accettato la trattativa. Iniziate a chattare.`;
  // Modello chat v2 (migrazione 0013): la conversazione è per coppia
  // (artista, organizzatore), non più per booking_request. La vecchia tabella
  // `booking_messages` è stata droppata, quindi l'opener va scritto su
  // `messages`. L'RPC è security definer e valida il chiamante: va usato il
  // client utente, non quello service-role (con cui `auth.uid()` è null).
  const { data: conversationId, error: convError } = await supabaseSrv.rpc(
    "get_or_create_conversation",
    { p_artist_id: req.artist_id, p_organizer_id: req.organizer_id }
  );
  if (convError || !conversationId) {
    console.error("chat opener: conversazione non disponibile:", convError?.message);
  } else {
    const { error: openerError } = await admin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: "artist",
      kind: "system",
      body: opener,
    });
    if (openerError) console.error("chat opener insert:", openerError.message);
  }

  await sendBookingAcceptedEmail(requestId).catch((e) => console.error("email accepted:", e));

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/chat");
  revalidatePath("/organizzatore/richieste");
  revalidatePath("/organizzatore/chat");
  return { ok: true as const };
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
    .select("id, artist_id, status")
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

  revalidatePath("/dashboard/leads");
  revalidatePath("/organizzatore/richieste");
  return { ok: true as const };
}
