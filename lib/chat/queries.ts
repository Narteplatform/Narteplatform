import { createAdminClient } from "@/lib/supabase/server";
import type { BookingStatus, ChatMessageKind, ChatOfferStatus, Role } from "@/lib/supabase/types";

export type ChatViewerRole = "artist" | "organizer" | "superadmin";

export type ConversationItem = {
  bookingRequestId: string;
  status: BookingStatus;
  eventDate: string;
  timeSlot: string | null;
  budget: number | null;
  // Controparte (lato del visualizzatore)
  counterpartName: string;
  counterpartAvatarUrl: string | null;
  // Entrambi (utile per superadmin)
  artistId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  organizerId: string;
  organizerName: string;
  organizerAvatarUrl: string | null;
  lastMessage: {
    body: string | null;
    kind: ChatMessageKind;
    createdAt: string;
    senderRole: Role;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  bookingRequestId: string;
  senderId: string | null;
  senderRole: Role;
  kind: ChatMessageKind;
  body: string | null;
  offerEventDate: string | null;
  offerTimeSlot: string | null;
  offerBudget: number | null;
  offerStatus: ChatOfferStatus | null;
  offerRespondedAt: string | null;
  readByArtistAt: string | null;
  readByOrganizerAt: string | null;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentDurationMs: number | null;
  createdAt: string;
};

export type ChatPartyMeta = {
  bookingRequestId: string;
  status: BookingStatus;
  eventDate: string;
  timeSlot: string | null;
  budget: number | null;
  artist: {
    id: string;
    userId: string | null;
    name: string;
    avatarUrl: string | null;
    slug: string;
    bio?: string | null;
    city?: string | null;
    genre?: string[] | null;
    instagram?: string | null;
    spotify?: string | null;
    website?: string | null;
  };
  organizer: {
    id: string;
    userId: string;
    name: string;
    avatarUrl: string | null;
    bio?: string | null;
    isBrand?: boolean | null;
    phone?: string | null;
    instagram?: string | null;
    website?: string | null;
  };
  venue: { id: string | null; name: string | null; city: string | null } | null;
};

type Row = {
  id: string;
  organizer_id: string;
  artist_id: string;
  venue_id: string | null;
  status: BookingStatus;
  event_date: string;
  time_slot: string | null;
  budget_offer: number | null;
  updated_at: string;
  artists: { id: string; stage_name: string; slug: string; cover_image: string | null; user_id: string | null } | null;
  organizers: { id: string; display_name: string; avatar_url: string | null; user_id: string } | null;
};

async function rowsToConversations(
  rows: Row[],
  viewer: ChatViewerRole,
): Promise<ConversationItem[]> {
  const admin = createAdminClient();
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const { data: lastMsgs } = await admin
    .from("booking_messages")
    .select("booking_request_id, body, kind, created_at, sender_role")
    .in("booking_request_id", ids)
    .order("created_at", { ascending: false });

  const lastByReq = new Map<string, NonNullable<typeof lastMsgs>[number]>();
  for (const m of lastMsgs ?? []) {
    if (!lastByReq.has(m.booking_request_id)) lastByReq.set(m.booking_request_id, m);
  }

  // Conteggio unread per il visualizzatore (artist o organizer)
  const unread = new Map<string, number>();
  if (viewer !== "superadmin") {
    const field = viewer === "artist" ? "read_by_artist_at" : "read_by_organizer_at";
    const otherRole: Role = viewer === "artist" ? "organizer" : "artist";
    const { data: unreadRows } = await admin
      .from("booking_messages")
      .select("booking_request_id")
      .in("booking_request_id", ids)
      .eq("sender_role", otherRole)
      .is(field, null);
    for (const u of unreadRows ?? []) {
      unread.set(u.booking_request_id, (unread.get(u.booking_request_id) ?? 0) + 1);
    }
  }

  return rows.map((r) => {
    const a = r.artists;
    const o = r.organizers;
    const last = lastByReq.get(r.id) ?? null;
    let counterpartName = "—";
    let counterpartAvatarUrl: string | null = null;
    if (viewer === "artist") {
      counterpartName = o?.display_name ?? "Organizzatore";
      counterpartAvatarUrl = o?.avatar_url ?? null;
    } else if (viewer === "organizer") {
      counterpartName = a?.stage_name ?? "Artista";
      counterpartAvatarUrl = a?.cover_image ?? null;
    } else {
      counterpartName = `${a?.stage_name ?? "Artista"} ↔ ${o?.display_name ?? "Organizzatore"}`;
      counterpartAvatarUrl = a?.cover_image ?? null;
    }
    return {
      bookingRequestId: r.id,
      status: r.status,
      eventDate: r.event_date,
      timeSlot: r.time_slot,
      budget: r.budget_offer,
      counterpartName,
      counterpartAvatarUrl,
      artistId: a?.id ?? r.artist_id,
      artistName: a?.stage_name ?? "Artista",
      artistAvatarUrl: a?.cover_image ?? null,
      organizerId: o?.id ?? r.organizer_id,
      organizerName: o?.display_name ?? "Organizzatore",
      organizerAvatarUrl: o?.avatar_url ?? null,
      lastMessage: last
        ? {
            body: last.body,
            kind: last.kind,
            createdAt: last.created_at,
            senderRole: last.sender_role,
          }
        : null,
      unreadCount: unread.get(r.id) ?? 0,
      updatedAt: r.updated_at,
    };
  });
}

export async function getConversationsForArtist(userId: string): Promise<ConversationItem[]> {
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!artist) return [];
  const { data } = await admin
    .from("booking_requests")
    .select(
      "id, organizer_id, artist_id, venue_id, status, event_date, time_slot, budget_offer, updated_at, artists!inner(id, stage_name, slug, cover_image, user_id), organizers!inner(id, display_name, avatar_url, user_id)"
    )
    .eq("artist_id", artist.id)
    .in("status", ["in_trattativa", "confermata", "rifiutata", "annullata"])
    .order("updated_at", { ascending: false });
  return rowsToConversations((data as unknown as Row[]) ?? [], "artist");
}

export async function getConversationsForOrganizer(userId: string): Promise<ConversationItem[]> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!org) return [];
  const { data } = await admin
    .from("booking_requests")
    .select(
      "id, organizer_id, artist_id, venue_id, status, event_date, time_slot, budget_offer, updated_at, artists!inner(id, stage_name, slug, cover_image, user_id), organizers!inner(id, display_name, avatar_url, user_id)"
    )
    .eq("organizer_id", org.id)
    .in("status", ["in_trattativa", "confermata", "rifiutata", "annullata"])
    .order("updated_at", { ascending: false });
  return rowsToConversations((data as unknown as Row[]) ?? [], "organizer");
}

export async function getConversationsForSuperadmin(
  scope: "active" | "completed" | "all",
  search?: string,
): Promise<ConversationItem[]> {
  const admin = createAdminClient();
  let q = admin
    .from("booking_requests")
    .select(
      "id, organizer_id, artist_id, venue_id, status, event_date, time_slot, budget_offer, updated_at, artists!inner(id, stage_name, slug, cover_image, user_id), organizers!inner(id, display_name, avatar_url, user_id)"
    )
    .order("updated_at", { ascending: false });
  if (scope === "active") {
    q = q.eq("status", "in_trattativa");
  } else if (scope === "completed") {
    q = q.in("status", ["confermata", "rifiutata", "annullata"]);
  } else {
    q = q.in("status", ["in_trattativa", "confermata", "rifiutata", "annullata"]);
  }
  const { data } = await q;
  let rows = (data as unknown as Row[]) ?? [];
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.artists?.stage_name ?? "").toLowerCase().includes(s) ||
        (r.organizers?.display_name ?? "").toLowerCase().includes(s),
    );
  }
  return rowsToConversations(rows, "superadmin");
}

export async function getMessages(bookingRequestId: string): Promise<ChatMessage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_messages")
    .select(
      "id, booking_request_id, sender_id, sender_role, kind, body, offer_event_date, offer_time_slot, offer_budget, offer_status, offer_responded_at, read_by_artist_at, read_by_organizer_at, attachment_url, attachment_type, attachment_name, attachment_size, attachment_duration_ms, created_at"
    )
    .eq("booking_request_id", bookingRequestId)
    .order("created_at", { ascending: true })
    .limit(5000);
  return (data ?? []).map((m) => ({
    id: m.id,
    bookingRequestId: m.booking_request_id,
    senderId: m.sender_id,
    senderRole: m.sender_role,
    kind: m.kind,
    body: m.body,
    offerEventDate: m.offer_event_date,
    offerTimeSlot: m.offer_time_slot,
    offerBudget: m.offer_budget,
    offerStatus: m.offer_status,
    offerRespondedAt: m.offer_responded_at,
    readByArtistAt: m.read_by_artist_at,
    readByOrganizerAt: m.read_by_organizer_at,
    attachmentUrl: m.attachment_url,
    attachmentType: m.attachment_type,
    attachmentName: m.attachment_name,
    attachmentSize: m.attachment_size,
    attachmentDurationMs: m.attachment_duration_ms,
    createdAt: m.created_at,
  }));
}

export async function getConversationMeta(bookingRequestId: string): Promise<ChatPartyMeta | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("booking_requests")
    .select(
      "id, status, event_date, time_slot, budget_offer, artist_id, organizer_id, venue_id, artists!inner(id, stage_name, slug, cover_image, user_id, bio, city, genre, social_links), organizers!inner(id, display_name, avatar_url, user_id, bio, is_brand, phone, instagram, website), venues(id, name, city)"
    )
    .eq("id", bookingRequestId)
    .maybeSingle();
  if (!data) return null;
  const a = (data as unknown as Row & {
    venues: { id: string; name: string; city: string | null } | null;
  }).artists as unknown as Row["artists"] & {
    bio?: string | null;
    city?: string | null;
    genre?: string[] | null;
    social_links?: { instagram?: string; spotify?: string; website?: string } | null;
  };
  const o = (data as unknown as Row & {
    venues: { id: string; name: string; city: string | null } | null;
  }).organizers as unknown as Row["organizers"] & {
    bio?: string | null;
    is_brand?: boolean | null;
    phone?: string | null;
    instagram?: string | null;
    website?: string | null;
  };
  const v = (data as unknown as Row & {
    venues: { id: string; name: string; city: string | null } | null;
  }).venues;
  if (!a || !o) return null;
  const social = a.social_links ?? {};
  return {
    bookingRequestId: data.id,
    status: data.status as BookingStatus,
    eventDate: data.event_date,
    timeSlot: data.time_slot,
    budget: data.budget_offer,
    artist: {
      id: a.id,
      userId: a.user_id,
      name: a.stage_name,
      avatarUrl: a.cover_image,
      slug: a.slug,
      bio: a.bio ?? null,
      city: a.city ?? null,
      genre: a.genre ?? null,
      instagram: social.instagram ?? null,
      spotify: social.spotify ?? null,
      website: social.website ?? null,
    },
    organizer: {
      id: o.id,
      userId: o.user_id,
      name: o.display_name,
      avatarUrl: o.avatar_url,
      bio: o.bio ?? null,
      isBrand: o.is_brand ?? null,
      phone: o.phone ?? null,
      instagram: o.instagram ?? null,
      website: o.website ?? null,
    },
    venue: v ? { id: v.id, name: v.name, city: v.city } : null,
  };
}

export async function getUnreadCountForUser(userId: string, role: "artist" | "organizer"): Promise<number> {
  const admin = createAdminClient();
  if (role === "artist") {
    const { data: a } = await admin.from("artists").select("id").eq("user_id", userId).maybeSingle();
    if (!a) return 0;
    const { data } = await admin
      .from("booking_messages")
      .select("id, booking_requests!inner(artist_id)")
      .eq("booking_requests.artist_id", a.id)
      .eq("sender_role", "organizer")
      .is("read_by_artist_at", null);
    return data?.length ?? 0;
  }
  const { data: o } = await admin.from("organizers").select("id").eq("user_id", userId).maybeSingle();
  if (!o) return 0;
  const { data } = await admin
    .from("booking_messages")
    .select("id, booking_requests!inner(organizer_id)")
    .eq("booking_requests.organizer_id", o.id)
    .eq("sender_role", "artist")
    .is("read_by_organizer_at", null);
  return data?.length ?? 0;
}

export async function getActiveConversationsCountSuperadmin(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "in_trattativa");
  return count ?? 0;
}
