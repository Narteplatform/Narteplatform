"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ARTIST_VIDEO_BUCKET, isAllowedVideoMime } from "@/lib/upload/video-limits";
import { entitlementsFor } from "@/lib/billing/plans";
import { checkCollectionLimit, getEntitlements } from "@/lib/billing/entitlements";
import { PROFILE_SECTION_PAYLOAD_SCHEMAS } from "@/lib/validators/artist-profile";
import type { ArtistTier, Database } from "@/lib/supabase/types";

type ArtistUpdate = Database["public"]["Tables"]["artists"]["Update"];

type AudioTrack = { url: string; title: string };
type PersonnelMember = { name: string; role: string };

/** Tutte e sole le colonne di `artists` che l'artista può scrivere da sé. */
export type ProfileColumns = {
  stage_name: string;
  bio: string | null;
  genre: string[];
  instruments: string[];
  city: string | null;
  cover_image: string | null;
  social_links: Record<string, string>;
  gallery: string[];
  videos: string[];
  audio_files: AudioTrack[];
  percorso_artistico: "cover_artist" | "tribute_band" | "progetto_inedito" | null;
  // Booking information (sezione GigSalad-style)
  price_range: string | null;
  gig_min_minutes: number | null;
  gig_max_minutes: number | null;
  languages: string[];
  what_to_expect: string | null;
  about_extended: string | null;
  personnel: PersonnelMember[];
  set_list: string | null;
  influences: string[];
  setup_requirements: string | null;
};

export type ProfileSectionId = "info" | "gallery" | "videos" | "audio" | "booking" | "social";

/**
 * Whitelist: nient'altro raggiunge il DB.
 *
 * Serve perché l'update gira con la service role, che bypassa RLS per
 * definizione. Prima il payload arrivava dal client e finiva tal quale in
 * `.update()`: una chiamata artigianale alla Server Action con
 * `{ ...update, is_verified: true }` sarebbe stata scritta senza fiatare.
 * Con la sezione esplicita il server sa quali colonne aspettarsi e scarta il
 * resto in silenzio.
 */
const SECTION_COLUMNS = {
  info: ["stage_name", "city", "genre", "instruments", "bio", "percorso_artistico", "cover_image"],
  gallery: ["gallery"],
  videos: ["videos"],
  audio: ["audio_files"],
  booking: [
    "price_range",
    "languages",
    "gig_min_minutes",
    "gig_max_minutes",
    "what_to_expect",
    "about_extended",
    "personnel",
    "set_list",
    "influences",
    "setup_requirements",
  ],
  social: ["social_links"],
} as const satisfies Record<ProfileSectionId, readonly (keyof ProfileColumns)[]>;

/**
 * Colonne che un blocco può legittimamente NON mandare.
 *
 * Solo `percorso_artistico`: su un piano Free il campo non è modificabile e il
 * client omette la chiave invece di mandare null, così il valore già salvato
 * resta intatto (il downgrade nasconde, non cancella). Tutte le altre colonne
 * della sezione restano obbligatorie, così un blocco non può dimenticarne una
 * per sbaglio.
 */
type OptionalProfileColumn = "percorso_artistico";

export type SectionPayload<S extends ProfileSectionId> = Pick<
  ProfileColumns,
  Exclude<(typeof SECTION_COLUMNS)[S][number], OptionalProfileColumn>
> &
  Partial<
    Pick<ProfileColumns, Extract<(typeof SECTION_COLUMNS)[S][number], OptionalProfileColumn>>
  >;

function pickAllowed(
  values: Record<string, unknown>,
  allowed: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in values) out[key] = values[key];
  }
  return out;
}

async function ownsArtist(artistId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: artist } = await admin
    .from("artists")
    .select("id, user_id")
    .eq("id", artistId)
    .maybeSingle();
  if (!artist) return null;

  // Anche superadmin può modificare; altrimenti deve essere il proprietario.
  if (artist.user_id === user.id) return user;
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "superadmin") return user;
  return null;
}

/**
 * Salvataggio di UNA sezione dell'editor profilo.
 *
 * L'editor è a blocchi indipendenti, ciascuno con il proprio Salva: il patch
 * contiene solo le colonne di quel blocco, e Postgres non riscrive le altre.
 * Effetto collaterale utile sui limiti di piano: un artista Free con la
 * galleria sopra soglia può salvare la bio senza incappare nel check sulla
 * galleria, perché `gallery` non è nemmeno nel patch.
 */
export async function updateArtistProfileSection<S extends ProfileSectionId>(
  artistId: string,
  section: S,
  values: SectionPayload<S>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const schema = PROFILE_SECTION_PAYLOAD_SCHEMAS[section];
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    };
  }

  // Il whitelisting in `pickAllowed` garantisce che le uniche chiavi presenti
  // siano quelle di `SECTION_COLUMNS[section]` (sottoinsieme di ProfileColumns,
  // a sua volta sottoinsieme delle colonne scrivibili di `artists`): il valore
  // è quindi genuinamente un `ArtistUpdate` parziale, non un bag generico.
  const patch = pickAllowed(
    parsed.data as Record<string, unknown>,
    SECTION_COLUMNS[section]
  ) as ArtistUpdate;

  const admin = createAdminClient();

  // Stato corrente: serve per la regola del delta. Senza `currentCount` un
  // artista sceso a Free con la gallery piena resterebbe bloccato anche solo
  // per cambiare la bio.
  const { data: currentRow } = await admin
    .from("artists")
    .select("tier, gallery, audio_files, percorso_artistico, user_id")
    .eq("id", artistId)
    .maybeSingle();
  const current = currentRow as {
    tier?: ArtistTier;
    gallery?: string[] | null;
    audio_files?: AudioTrack[] | null;
    percorso_artistico?: ProfileColumns["percorso_artistico"];
    user_id?: string | null;
  } | null;

  const ent = entitlementsFor(current?.tier ?? "free");

  if ("genre" in patch) {
    // Ridondante rispetto allo schema Zod: difesa in profondità sull'unico
    // limite che ha anche una conseguenza commerciale.
    const genre = patch.genre as string[];
    if (genre.length > 3) return { ok: false as const, error: "Massimo 3 generi" };
  }

  if ("gallery" in patch) {
    const check = checkCollectionLimit(
      ent,
      "gallery",
      current?.gallery?.length ?? 0,
      (patch.gallery as string[]).length
    );
    if (!check.ok) return { ok: false as const, error: check.error };
  }

  if ("audio_files" in patch) {
    const check = checkCollectionLimit(
      ent,
      "audio",
      current?.audio_files?.length ?? 0,
      (patch.audio_files as AudioTrack[]).length
    );
    if (!check.ok) return { ok: false as const, error: check.error };
  }

  // percorso_artistico: gate di scrittura. Chi non ha il piano non può
  // IMPOSTARLO; la chiave sparisce dal patch, così il valore già in DB resta
  // intatto — il downgrade nasconde, non cancella (0040_relax_percorso_trigger).
  if ("percorso_artistico" in patch && !ent.canSetPercorso) {
    delete patch.percorso_artistico;
  }

  if (Object.keys(patch).length === 0) return { ok: true as const };

  const { error } = await admin.from("artists").update(patch).eq("id", artistId);

  if (error) return { ok: false as const, error: error.message };

  // La foto principale del profilo diventa anche l'avatar dell'account, quello
  // mostrato nella pillola in alto a destra: per l'artista è "la sua foto", una
  // sola.
  //
  // Due condizioni non negoziabili:
  //  - solo se il profilo è DAVVERO dell'utente collegato. `ownsArtist` lascia
  //    passare anche il superadmin, e senza questo controllo un admin che
  //    modifica la scheda di un artista si ritroverebbe la foto di quell'artista
  //    come proprio avatar.
  //  - solo con un'immagine valida: se `cover_image` è vuota non si tocca
  //    l'avatar esistente. Sincronizzare vuol dire propagare una foto, non
  //    cancellarne una.
  const newCover = patch.cover_image;
  if (
    section === "info" &&
    typeof newCover === "string" &&
    newCover.length > 0 &&
    current?.user_id === user.id
  ) {
    await admin.from("profiles").update({ avatar_url: newCover }).eq("id", user.id);
  }

  // "layout" perché la percentuale di completamento vive nella sidebar del
  // layout, non nella pagina. La pagina pubblica dell'artista va rigenerata
  // esplicitamente: è il posto dove queste modifiche si vedono davvero.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/artisti");
  revalidatePath("/");
  const { data: slugRow } = await admin
    .from("artists")
    .select("slug")
    .eq("id", artistId)
    .maybeSingle();
  const slug = (slugRow as { slug?: string } | null)?.slug;
  if (slug) revalidatePath(`/artisti/${slug}`);

  return { ok: true as const };
}

export async function setAvailability(
  artistId: string,
  date: string,
  status: "available" | "busy"
) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_availability")
    .upsert({ artist_id: artistId, date, status }, { onConflict: "artist_id,date" });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function removeAvailability(artistId: string, date: string) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_availability")
    .delete()
    .eq("artist_id", artistId)
    .eq("date", date);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// =========================================
// Slot generali (default per ogni giorno)
// =========================================
function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export async function addDefaultSlot(
  artistId: string,
  input: { label?: string | null; start_time: string; end_time: string }
) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  if (!isValidTime(input.start_time) || !isValidTime(input.end_time))
    return { ok: false as const, error: "Orario non valido" };

  const admin = createAdminClient();
  const { error } = await admin.from("artist_default_slots").insert({
    artist_id: artistId,
    label: input.label?.trim() || null,
    start_time: input.start_time,
    end_time: input.end_time,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function deleteDefaultSlot(artistId: string, slotId: string) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_default_slots")
    .delete()
    .eq("id", slotId)
    .eq("artist_id", artistId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// =========================================
// Slot specifici per data (override dei default)
// =========================================
export async function addDateSlot(
  artistId: string,
  input: { date: string; label?: string | null; start_time: string; end_time: string }
) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  if (!isValidTime(input.start_time) || !isValidTime(input.end_time))
    return { ok: false as const, error: "Orario non valido" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    return { ok: false as const, error: "Data non valida" };

  const admin = createAdminClient();
  const { error } = await admin.from("artist_date_slots").insert({
    artist_id: artistId,
    date: input.date,
    label: input.label?.trim() || null,
    start_time: input.start_time,
    end_time: input.end_time,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

export async function deleteDateSlot(artistId: string, slotId: string) {
  const user = await ownsArtist(artistId);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("artist_date_slots")
    .delete()
    .eq("id", slotId)
    .eq("artist_id", artistId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const };
}

// =========================================
// Video artista (artist_videos)
// =========================================
export async function addArtistVideo(input: {
  artist_id: string;
  url: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  duration_ms?: number | null;
  title?: string;
}) {
  const user = await ownsArtist(input.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  // url e storage_path arrivano dal client: senza questi controlli si potrebbe
  // creare una riga che punta a un file altrui o a un host esterno.
  if (!input.storage_path.startsWith(`${user.id}/`)) {
    return { ok: false as const, error: "Percorso del file non valido" };
  }
  const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ARTIST_VIDEO_BUCKET}/`;
  if (!input.url.startsWith(expectedPrefix)) {
    return { ok: false as const, error: "URL del video non valido" };
  }
  if (!isAllowedVideoMime(input.mime_type)) {
    return { ok: false as const, error: "Formato video non supportato" };
  }

  const admin = createAdminClient();

  const ent = await getEntitlements(input.artist_id);
  const { count } = await admin
    .from("artist_videos")
    .select("id", { count: "exact", head: true })
    .eq("artist_id", input.artist_id);
  const videoCheck = checkCollectionLimit(ent, "video", count ?? 0, (count ?? 0) + 1);
  if (!videoCheck.ok) return { ok: false as const, error: videoCheck.error };

  const { data, error } = await admin
    .from("artist_videos")
    .insert({
      artist_id: input.artist_id,
      url: input.url,
      storage_path: input.storage_path,
      size_bytes: input.size_bytes,
      mime_type: input.mime_type,
      duration_ms: input.duration_ms ?? null,
      title: input.title ?? null,
    })
    .select(
      "id, artist_id, url, storage_path, title, duration_ms, size_bytes, mime_type, created_at"
    )
    .single();
  if (error || !data) return { ok: false as const, error: error?.message ?? "Errore" };
  await revalidateArtistVideoPaths(input.artist_id);
  return { ok: true as const, video: data };
}

/**
 * /dashboard/profilo-artista/video è solo un redirect: revalidarlo non aggiorna
 * nulla. Le pagine che mostrano davvero i video sono l'editor del profilo e la
 * pagina pubblica dell'artista.
 */
async function revalidateArtistVideoPaths(artistId: string) {
  revalidatePath("/dashboard/profilo-artista");
  revalidatePath("/dashboard/overview");
  revalidatePath("/artisti");
  const admin = createAdminClient();
  const { data } = await admin
    .from("artists")
    .select("slug")
    .eq("id", artistId)
    .maybeSingle();
  if (data?.slug) revalidatePath(`/artisti/${data.slug}`);
}

export async function deleteArtistVideo(videoId: string) {
  const admin = createAdminClient();
  const { data: video } = await admin
    .from("artist_videos")
    .select("id, artist_id, storage_path")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return { ok: false as const, error: "Video non trovato" };
  const user = await ownsArtist(video.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  if (video.storage_path) {
    await admin.storage.from(ARTIST_VIDEO_BUCKET).remove([video.storage_path]);
  }
  const { error } = await admin.from("artist_videos").delete().eq("id", videoId);
  if (error) return { ok: false as const, error: error.message };
  await revalidateArtistVideoPaths(video.artist_id);
  return { ok: true as const };
}

// =========================================
// Mass editing disponibilità
// =========================================
export async function bulkSetAvailability(input: {
  artist_id: string;
  date_from: string;
  date_to: string;
  status: "available" | "busy";
  slot_ids?: string[];
}) {
  const user = await ownsArtist(input.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const from = new Date(input.date_from);
  const to = new Date(input.date_to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { ok: false as const, error: "Date non valide" };
  }
  if (from.getTime() > to.getTime()) {
    return { ok: false as const, error: "Data 'da' successiva a 'a'" };
  }
  const diffDays = Math.round((to.getTime() - from.getTime()) / 86400000);
  if (diffDays > 365) {
    return { ok: false as const, error: "Massimo 365 giorni per operazione" };
  }

  const admin = createAdminClient();

  const dates: string[] = [];
  for (let d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    dates.push(iso);
  }

  // Upsert availability per ogni data
  const rows = dates.map((date) => ({
    artist_id: input.artist_id,
    date,
    status: input.status,
  }));
  const { error: upErr } = await admin
    .from("artist_availability")
    .upsert(rows, { onConflict: "artist_id,date" });
  if (upErr) return { ok: false as const, error: upErr.message };

  // Se richiesti slot specifici, copia gli orari dai default come override per data
  if (input.slot_ids && input.slot_ids.length > 0 && input.status === "available") {
    const { data: defaultSlots } = await admin
      .from("artist_default_slots")
      .select("id, label, start_time, end_time")
      .eq("artist_id", input.artist_id)
      .in("id", input.slot_ids);
    if (defaultSlots && defaultSlots.length > 0) {
      const overrides: {
        artist_id: string;
        date: string;
        label: string | null;
        start_time: string;
        end_time: string;
      }[] = [];
      for (const date of dates) {
        for (const slot of defaultSlots) {
          overrides.push({
            artist_id: input.artist_id,
            date,
            label: slot.label,
            start_time: slot.start_time,
            end_time: slot.end_time,
          });
        }
      }
      // Idempotenza: prima rimuovi eventuali override esistenti negli stessi (artist,date)
      // poi inserisci i nuovi. Non blocchiamo se cancellazione fallisce.
      await admin
        .from("artist_date_slots")
        .delete()
        .eq("artist_id", input.artist_id)
        .in("date", dates);
      const { error: insErr } = await admin.from("artist_date_slots").insert(overrides);
      if (insErr) return { ok: false as const, error: insErr.message };
    }
  }

  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  return { ok: true as const, count: dates.length };
}
