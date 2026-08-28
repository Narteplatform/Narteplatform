import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveActiveArtist } from "@/lib/artist/current";

export type FeedbackRow = {
  id: string;
  booking_request_id: string;
  organizer_id: string;
  artist_id: string;
  rating: number;
  body: string;
  hidden: boolean;
  created_at: string;
};

export type PublicReview = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  organizer_name: string;
};

export type PublicReviews = {
  reviews: PublicReview[];
  /** Media aritmetica dei voti visibili, arrotondata a un decimale. */
  average: number;
  count: number;
};

const NESSUNA_RECENSIONE: PublicReviews = { reviews: [], average: 0, count: 0 };

/**
 * Recensioni pubbliche di un artista, a partire dal suo id.
 *
 * Esisteva già `getFeedbackForArtistUser`, ma parte dallo `userId` del
 * proprietario e risolve il profilo attivo tramite cookie: serve alla dashboard
 * dell'artista, non al profilo pubblico, dove l'artista è determinato dallo
 * slug e chi guarda è un'altra persona.
 *
 * Due regole non negoziabili qui dentro:
 *
 *  - `hidden = false`. Una recensione nascosta dalla moderazione non deve
 *    comparire, e non deve nemmeno pesare sulla media: se contasse, un
 *    contenuto rimosso continuerebbe a influenzare il voto.
 *  - in caso di errore si restituisce "nessuna recensione", non si solleva.
 *    Il profilo pubblico non deve andare in errore perché la sezione
 *    recensioni non ha risposto: semplicemente non la mostra.
 */
export async function getPublicFeedbackForArtist(
  artistId: string,
  limit = 12
): Promise<PublicReviews> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("feedback")
    .select("id, organizer_id, rating, body, created_at")
    .eq("artist_id", artistId)
    .eq("hidden", false)
    .order("created_at", { ascending: false });

  // CLAUDE.md, regola 4: mai proseguire con un default dopo una lettura non
  // controllata. Qui `?? []` avrebbe prodotto "zero recensioni" tanto per un
  // artista senza recensioni quanto per una query fallita, rendendo i due casi
  // indistinguibili.
  if (error) return NESSUNA_RECENSIONE;

  const rows = data ?? [];
  if (rows.length === 0) return NESSUNA_RECENSIONE;

  const somma = rows.reduce((acc, r) => acc + r.rating, 0);
  const average = Math.round((somma / rows.length) * 10) / 10;

  const orgIds = [...new Set(rows.map((r) => r.organizer_id))];
  const nomi = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs } = await admin
      .from("organizers")
      .select("id, display_name")
      .in("id", orgIds);
    for (const o of orgs ?? []) nomi.set(o.id, o.display_name);
  }

  return {
    average,
    count: rows.length,
    reviews: rows.slice(0, limit).map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      organizer_name: nomi.get(r.organizer_id) ?? "Organizzatore",
    })),
  };
}

/**
 * Media e conteggio per più artisti in una sola query.
 *
 * Serve al catalogo: chiamare `getPublicFeedbackForArtist` per ognuna delle
 * schede in elenco significherebbe una query per artista.
 */
export async function getRatingsForArtists(
  artistIds: string[]
): Promise<Map<string, { average: number; count: number }>> {
  const out = new Map<string, { average: number; count: number }>();
  if (artistIds.length === 0) return out;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feedback")
    .select("artist_id, rating")
    .in("artist_id", artistIds)
    .eq("hidden", false);

  if (error || !data) return out;

  const acc = new Map<string, { somma: number; n: number }>();
  for (const r of data) {
    const p = acc.get(r.artist_id) ?? { somma: 0, n: 0 };
    p.somma += r.rating;
    p.n += 1;
    acc.set(r.artist_id, p);
  }
  for (const [id, { somma, n }] of acc) {
    out.set(id, { average: Math.round((somma / n) * 10) / 10, count: n });
  }
  return out;
}

/** Feedback ricevuti da un artista (user logged in). */
export async function getFeedbackForArtistUser(userId: string) {
  const admin = createAdminClient();
  // Profilo ATTIVO: le recensioni sono per-profilo, e con più profili
  // .eq("user_id", …).maybeSingle() andrebbe in errore (PGRST116).
  const active = await resolveActiveArtist(userId);
  if (!active) return { artist: null, feedback: [] as (FeedbackRow & { organizer_name: string })[] };
  const artist = { id: active.id, stage_name: active.stage_name };

  const { data } = await admin
    .from("feedback")
    .select("id, booking_request_id, organizer_id, artist_id, rating, body, hidden, created_at")
    .eq("artist_id", artist.id)
    .eq("hidden", false)
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const orgIds = [...new Set(rows.map((r) => r.organizer_id))];
  const orgs = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: o } = await admin
      .from("organizers")
      .select("id, display_name")
      .in("id", orgIds);
    for (const r of o ?? []) orgs.set(r.id, r.display_name);
  }
  return {
    artist,
    feedback: rows.map((r) => ({
      ...r,
      organizer_name: orgs.get(r.organizer_id) ?? "Organizzatore",
    })),
  };
}

/** Booking confermati dell'organizer con data passata e senza feedback ancora. */
export async function getBookingsAwaitingFeedback(organizerId: string) {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings } = await admin
    .from("booking_requests")
    .select("id, event_date, artist_id, venue_id")
    .eq("organizer_id", organizerId)
    .eq("status", "confermata")
    .lt("event_date", today)
    .order("event_date", { ascending: false });

  const items = bookings ?? [];
  if (items.length === 0) {
    return { pending: [], sent: [] };
  }

  const ids = items.map((b) => b.id);
  const { data: existing } = await admin
    .from("feedback")
    .select("id, booking_request_id, rating, body, hidden, created_at")
    .in("booking_request_id", ids);
  const byBooking = new Map((existing ?? []).map((f) => [f.booking_request_id, f]));

  const artistIds = [...new Set(items.map((b) => b.artist_id))];
  const venueIds = [...new Set(items.map((b) => b.venue_id).filter(Boolean) as string[])];
  const [artistsRes, venuesRes] = await Promise.all([
    artistIds.length > 0
      ? admin.from("artists").select("id, stage_name, slug, cover_image").in("id", artistIds)
      : Promise.resolve({ data: [] }),
    venueIds.length > 0
      ? admin.from("venues").select("id, name").in("id", venueIds)
      : Promise.resolve({ data: [] }),
  ]);
  const artists = new Map((artistsRes.data ?? []).map((a) => [a.id, a]));
  const venues = new Map((venuesRes.data ?? []).map((v) => [v.id, v]));

  const pending: Array<{
    booking_id: string;
    event_date: string;
    artist_id: string;
    artist_name: string;
    artist_slug: string;
    artist_cover: string | null;
    venue_name: string | null;
  }> = [];
  const sent: Array<{
    booking_id: string;
    event_date: string;
    artist_name: string;
    rating: number;
    body: string;
    created_at: string;
  }> = [];

  for (const b of items) {
    const a = artists.get(b.artist_id);
    const v = b.venue_id ? venues.get(b.venue_id) : null;
    const fb = byBooking.get(b.id);
    if (fb) {
      sent.push({
        booking_id: b.id,
        event_date: b.event_date,
        artist_name: a?.stage_name ?? "Artista",
        rating: fb.rating,
        body: fb.body,
        created_at: fb.created_at,
      });
    } else {
      pending.push({
        booking_id: b.id,
        event_date: b.event_date,
        artist_id: b.artist_id,
        artist_name: a?.stage_name ?? "Artista",
        artist_slug: a?.slug ?? "",
        artist_cover: a?.cover_image ?? null,
        venue_name: v?.name ?? null,
      });
    }
  }
  return { pending, sent };
}

/** Lista feedback completa per superadmin con filtri. */
export async function listAllFeedback(filters?: {
  artistId?: string;
  minRating?: number;
  maxRating?: number;
  fromDate?: string;
  toDate?: string;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("feedback")
    .select("id, booking_request_id, organizer_id, artist_id, rating, body, hidden, created_at")
    .order("created_at", { ascending: false });

  if (filters?.artistId) query = query.eq("artist_id", filters.artistId);
  if (filters?.minRating != null) query = query.gte("rating", filters.minRating);
  if (filters?.maxRating != null) query = query.lte("rating", filters.maxRating);
  if (filters?.fromDate) query = query.gte("created_at", filters.fromDate);
  if (filters?.toDate) query = query.lte("created_at", filters.toDate);

  const { data } = await query;
  const rows = data ?? [];

  const artistIds = [...new Set(rows.map((r) => r.artist_id))];
  const orgIds = [...new Set(rows.map((r) => r.organizer_id))];

  const [artistsRes, orgsRes] = await Promise.all([
    artistIds.length > 0
      ? admin.from("artists").select("id, stage_name, slug, cover_image").in("id", artistIds)
      : Promise.resolve({ data: [] }),
    orgIds.length > 0
      ? admin.from("organizers").select("id, display_name").in("id", orgIds)
      : Promise.resolve({ data: [] }),
  ]);
  const artists = new Map((artistsRes.data ?? []).map((a) => [a.id, a]));
  const orgs = new Map((orgsRes.data ?? []).map((o) => [o.id, o]));

  return rows.map((r) => ({
    ...r,
    artist_name: artists.get(r.artist_id)?.stage_name ?? "Artista",
    artist_slug: artists.get(r.artist_id)?.slug ?? "",
    artist_cover: artists.get(r.artist_id)?.cover_image ?? null,
    organizer_name: orgs.get(r.organizer_id)?.display_name ?? "Organizzatore",
  }));
}

export type AdminFeedbackStats = {
  total: number;
  average: number;
  last30: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  topArtists: Array<{ artist_id: string; name: string; avg: number; count: number }>;
};

// =========================================
// Platform feedback (artisti/organizzatori -> N'arte)
// =========================================

export type PlatformFeedbackRow = {
  id: string;
  user_id: string;
  role: "artist" | "organizer" | "user" | "superadmin" | "consultant";
  category: "generale" | "bug" | "suggerimento" | "altro";
  subject: string | null;
  body: string;
  rating: number | null;
  status: "new" | "read" | "archived";
  created_at: string;
  user_name: string | null;
  user_email: string | null;
};

export async function listPlatformFeedback(filters?: {
  status?: "new" | "read" | "archived";
  role?: "artist" | "organizer";
  category?: "generale" | "bug" | "suggerimento" | "altro";
}): Promise<PlatformFeedbackRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("platform_feedback")
    .select("id, user_id, role, category, subject, body, rating, status, created_at")
    .order("created_at", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.role) query = query.eq("role", filters.role);
  if (filters?.category) query = query.eq("category", filters.category);

  const { data } = await query;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.user_id))];
  const [{ data: profiles }, { data: usersList }] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", ids),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ]);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const emailMap = new Map<string, string>();
  for (const u of usersList?.users ?? []) {
    if (u.id && u.email) emailMap.set(u.id, u.email);
  }

  return rows.map((r) => ({
    ...r,
    user_name: profileMap.get(r.user_id) ?? null,
    user_email: emailMap.get(r.user_id) ?? null,
  }));
}

export type PlatformFeedbackStats = {
  total: number;
  unread: number;
  last30: number;
  byRole: { artist: number; organizer: number };
  byCategory: Record<"generale" | "bug" | "suggerimento" | "altro", number>;
};

export async function getPlatformFeedbackStats(): Promise<PlatformFeedbackStats> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_feedback")
    .select("role, category, status, created_at");
  const rows = data ?? [];
  const since30 = Date.now() - 30 * 86400000;
  const stats: PlatformFeedbackStats = {
    total: rows.length,
    unread: 0,
    last30: 0,
    byRole: { artist: 0, organizer: 0 },
    byCategory: { generale: 0, bug: 0, suggerimento: 0, altro: 0 },
  };
  for (const r of rows) {
    if (r.status === "new") stats.unread++;
    if (new Date(r.created_at).getTime() >= since30) stats.last30++;
    if (r.role === "artist") stats.byRole.artist++;
    else if (r.role === "organizer") stats.byRole.organizer++;
    const cat = r.category as keyof PlatformFeedbackStats["byCategory"];
    if (cat in stats.byCategory) stats.byCategory[cat]++;
  }
  return stats;
}

export async function getFeedbackStats(): Promise<AdminFeedbackStats> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("feedback")
    .select("rating, artist_id, created_at, hidden")
    .eq("hidden", false);

  const rows = data ?? [];
  const total = rows.length;
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  const since30 = Date.now() - 30 * 86400000;
  let last30 = 0;
  const byArtist = new Map<string, { sum: number; count: number }>();

  for (const r of rows) {
    const rt = r.rating as 1 | 2 | 3 | 4 | 5;
    if (rt >= 1 && rt <= 5) distribution[rt]++;
    sum += r.rating;
    if (new Date(r.created_at).getTime() >= since30) last30++;
    const agg = byArtist.get(r.artist_id) ?? { sum: 0, count: 0 };
    agg.sum += r.rating;
    agg.count++;
    byArtist.set(r.artist_id, agg);
  }

  const average = total === 0 ? 0 : sum / total;

  // Top artisti (min 3 review)
  const topAggIds = Array.from(byArtist.entries())
    .filter(([, v]) => v.count >= 3)
    .map(([id, v]) => ({ id, avg: v.sum / v.count, count: v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  let topArtists: AdminFeedbackStats["topArtists"] = [];
  if (topAggIds.length > 0) {
    const { data: artists } = await admin
      .from("artists")
      .select("id, stage_name")
      .in(
        "id",
        topAggIds.map((t) => t.id)
      );
    const nameById = new Map((artists ?? []).map((a) => [a.id, a.stage_name]));
    topArtists = topAggIds.map((t) => ({
      artist_id: t.id,
      name: nameById.get(t.id) ?? "Artista",
      avg: t.avg,
      count: t.count,
    }));
  }

  return { total, average, last30, distribution, topArtists };
}
