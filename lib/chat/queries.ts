import { createAdminClient } from "@/lib/supabase/server";
import type { ChatMessageKind, ChatOfferStatus, Role } from "@/lib/supabase/types";

export type ChatViewerRole = "artist" | "organizer" | "superadmin";

export type ConversationItem = {
  conversationId: string;
  artistId: string;
  organizerId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  organizerName: string;
  organizerAvatarUrl: string | null;
  counterpartName: string;
  counterpartAvatarUrl: string | null;
  lastMessage: {
    body: string | null;
    kind: ChatMessageKind;
    createdAt: string;
    senderRole: Role;
  } | null;
  unreadCount: number;
  lastMessageAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: Role;
  kind: ChatMessageKind;
  body: string | null;
  offerEventDate: string | null;
  offerTimeSlot: string | null;
  offerBudgetCents: number | null;
  offerDescription: string | null;
  offerStatus: ChatOfferStatus | null;
  offerRespondedAt: string | null;
  offerBookingRequestId: string | null;
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
  conversationId: string;
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
};

type ConvRow = {
  id: string;
  artist_id: string;
  organizer_id: string;
  last_message_at: string;
  artists: { id: string; stage_name: string; cover_image: string | null; user_id: string | null } | null;
  organizers: { id: string; display_name: string; avatar_url: string | null; user_id: string } | null;
};

async function rowsToConversations(
  rows: ConvRow[],
  viewer: ChatViewerRole,
): Promise<ConversationItem[]> {
  const admin = createAdminClient();
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const { data: lastMsgs } = await admin
    .from("messages")
    .select("conversation_id, body, kind, created_at, sender_role")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false });

  const lastByConv = new Map<string, NonNullable<typeof lastMsgs>[number]>();
  for (const m of lastMsgs ?? []) {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
  }

  const unread = new Map<string, number>();
  if (viewer !== "superadmin") {
    const field = viewer === "artist" ? "read_by_artist_at" : "read_by_organizer_at";
    const otherRole: Role = viewer === "artist" ? "organizer" : "artist";
    const { data: unreadRows } = await admin
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", ids)
      .eq("sender_role", otherRole)
      .is(field, null);
    for (const u of unreadRows ?? []) {
      unread.set(u.conversation_id, (unread.get(u.conversation_id) ?? 0) + 1);
    }
  }

  return rows.map((r) => {
    const a = r.artists;
    const o = r.organizers;
    const last = lastByConv.get(r.id) ?? null;
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
      conversationId: r.id,
      artistId: a?.id ?? r.artist_id,
      organizerId: o?.id ?? r.organizer_id,
      artistName: a?.stage_name ?? "Artista",
      artistAvatarUrl: a?.cover_image ?? null,
      organizerName: o?.display_name ?? "Organizzatore",
      organizerAvatarUrl: o?.avatar_url ?? null,
      counterpartName,
      counterpartAvatarUrl,
      lastMessage: last
        ? {
            body: last.body,
            kind: last.kind,
            createdAt: last.created_at,
            senderRole: last.sender_role,
          }
        : null,
      unreadCount: unread.get(r.id) ?? 0,
      lastMessageAt: r.last_message_at,
    };
  });
}

const CONV_SELECT =
  "id, artist_id, organizer_id, last_message_at, artists!inner(id, stage_name, cover_image, user_id), organizers!inner(id, display_name, avatar_url, user_id)";

/**
 * Conversazioni di TUTTI i profili dell'account, non solo di quello attivo.
 *
 * Scelta deliberata: un account può avere fino a 5 profili, e filtrare sul solo
 * profilo attivo nasconderebbe i messaggi arrivati agli altri. Un organizzatore
 * che scrive e non riceve risposta perché l'artista aveva "l'altro profilo
 * selezionato" è esattamente il danno che questa piattaforma deve evitare.
 */
export async function getConversationsForArtist(userId: string): Promise<ConversationItem[]> {
  const admin = createAdminClient();
  const { data: owned } = await admin.from("artists").select("id").eq("user_id", userId);
  const ids = ((owned ?? []) as unknown as { id: string }[]).map((a) => a.id);
  if (ids.length === 0) return [];
  const { data } = await admin
    .from("conversations")
    .select(CONV_SELECT)
    .in("artist_id", ids)
    .order("last_message_at", { ascending: false });
  return rowsToConversations((data as unknown as ConvRow[]) ?? [], "artist");
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
    .from("conversations")
    .select(CONV_SELECT)
    .eq("organizer_id", org.id)
    .order("last_message_at", { ascending: false });
  return rowsToConversations((data as unknown as ConvRow[]) ?? [], "organizer");
}

export async function getConversationsForSuperadmin(
  search?: string,
): Promise<ConversationItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("conversations")
    .select(CONV_SELECT)
    .order("last_message_at", { ascending: false });
  let rows = (data as unknown as ConvRow[]) ?? [];
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

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("messages")
    .select(
      "id, conversation_id, sender_id, sender_role, kind, body, offer_event_date, offer_time_slot, offer_budget_cents, offer_description, offer_status, offer_responded_at, offer_booking_request_id, read_by_artist_at, read_by_organizer_at, attachment_url, attachment_type, attachment_name, attachment_size, attachment_duration_ms, created_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(5000);
  return (data ?? []).map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    senderRole: m.sender_role,
    kind: m.kind,
    body: m.body,
    offerEventDate: m.offer_event_date,
    offerTimeSlot: m.offer_time_slot,
    offerBudgetCents: m.offer_budget_cents,
    offerDescription: m.offer_description,
    offerStatus: m.offer_status,
    offerRespondedAt: m.offer_responded_at,
    offerBookingRequestId: m.offer_booking_request_id,
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

export async function getConversationMeta(conversationId: string): Promise<ChatPartyMeta | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("conversations")
    .select(
      "id, artist_id, organizer_id, artists!inner(id, stage_name, slug, cover_image, user_id, bio, city, genre, social_links), organizers!inner(id, display_name, avatar_url, user_id, bio, is_brand, phone, instagram, website)",
    )
    .eq("id", conversationId)
    .maybeSingle();
  if (!data) return null;
  const a = (
    data as unknown as {
      artists: {
        id: string;
        stage_name: string;
        slug: string;
        cover_image: string | null;
        user_id: string | null;
        bio: string | null;
        city: string | null;
        genre: string[] | null;
        social_links: { instagram?: string; spotify?: string; website?: string } | null;
      };
    }
  ).artists;
  const o = (
    data as unknown as {
      organizers: {
        id: string;
        display_name: string;
        avatar_url: string | null;
        user_id: string;
        bio: string | null;
        is_brand: boolean | null;
        phone: string | null;
        instagram: string | null;
        website: string | null;
      };
    }
  ).organizers;
  if (!a || !o) return null;
  const social = a.social_links ?? {};
  return {
    conversationId: data.id,
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
  };
}

export async function getUnreadCountForUser(
  userId: string,
  role: "artist" | "organizer",
): Promise<number> {
  const admin = createAdminClient();
  if (role === "artist") {
    // Somma su TUTTI i profili dell'account: un badge che conta solo il profilo
    // attivo direbbe "0 non letti" mentre un organizzatore aspetta risposta su
    // un altro profilo.
    const { data: owned } = await admin.from("artists").select("id").eq("user_id", userId);
    const ids = ((owned ?? []) as unknown as { id: string }[]).map((a) => a.id);
    if (ids.length === 0) return 0;
    const { data } = await admin
      .from("messages")
      .select("id, conversations!inner(artist_id)")
      .in("conversations.artist_id", ids)
      .eq("sender_role", "organizer")
      .is("read_by_artist_at", null);
    return data?.length ?? 0;
  }
  const { data: o } = await admin
    .from("organizers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!o) return 0;
  const { data } = await admin
    .from("messages")
    .select("id, conversations!inner(organizer_id)")
    .eq("conversations.organizer_id", o.id)
    .eq("sender_role", "artist")
    .is("read_by_organizer_at", null);
  return data?.length ?? 0;
}

export async function getActiveConversationsCountSuperadmin(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("conversations")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getConversationByPair(
  artistId: string,
  organizerId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("conversations")
    .select("id")
    .eq("artist_id", artistId)
    .eq("organizer_id", organizerId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Lista degli ID conversazione cui l'utente partecipa (per il filtro toast lato client).
 */
export async function getConversationIdsForUser(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role === "artist") {
    const { data: a } = await admin.from("artists").select("id").eq("user_id", userId).maybeSingle();
    if (!a) return [];
    const { data } = await admin.from("conversations").select("id").eq("artist_id", a.id);
    return (data ?? []).map((r) => r.id);
  }
  if (profile?.role === "organizer") {
    const { data: o } = await admin.from("organizers").select("id").eq("user_id", userId).maybeSingle();
    if (!o) return [];
    const { data } = await admin.from("conversations").select("id").eq("organizer_id", o.id);
    return (data ?? []).map((r) => r.id);
  }
  return [];
}
