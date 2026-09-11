"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ARTIST_VIDEO_BUCKET, isAllowedVideoMime } from "@/lib/upload/video-limits";
import { deleteStreamVideo, updateStreamVideoTitle } from "@/lib/storage/bunny/stream";
import {
  ARTIST_VIDEO_SELECT,
  reconcileBunnyVideo,
} from "@/lib/artist/video-status";
import { logger } from "@/lib/logger";
import { entitlementsFor } from "@/lib/billing/plans";
import { checkCollectionLimit, getEntitlements } from "@/lib/billing/entitlements";
import { PROFILE_SECTION_PAYLOAD_SCHEMAS } from "@/lib/validators/artist-profile";
import {
  diffAudio,
  diffGallery,
  toAudioSubmissions,
  toCoverSubmission,
  toGallerySubmissions,
  isMediaModerationEnabled,
  type PendingSubmission,
} from "@/lib/media/moderation";
import { notifyMediaSubmission } from "@/lib/media/notify";
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
  const { data: currentRow, error: currentErr } = await admin
    .from("artists")
    .select("tier, gallery, audio_files, cover_image, percorso_artistico, user_id")
    .eq("id", artistId)
    .maybeSingle();

  // ⛔ Non si prosegue su una lettura fallita, e non è prudenza generica.
  // Da qui in giù `gallery` e `audio_files` si calcolano per differenza
  // rispetto a ciò che è già pubblicato. Con `current` a null quel confronto
  // avverrebbe contro il vuoto, ogni elemento risulterebbe "nuovo", e il patch
  // scriverebbe un array vuoto: la galleria dell'artista sparirebbe come
  // effetto collaterale di una query andata male. È successo davvero su questo
  // progetto, ed è il motivo per cui questo controllo esiste.
  if (currentErr) {
    logger.error("[updateArtistProfileSection] lettura stato corrente fallita", {
      artistId,
      section,
      error: currentErr.message,
    });
    return {
      ok: false as const,
      error: "Non riesco a leggere il profilo in questo momento. Riprova fra poco.",
    };
  }
  if (!currentRow) {
    return { ok: false as const, error: "Profilo artista non trovato" };
  }

  const current = currentRow as {
    tier?: ArtistTier;
    gallery?: string[] | null;
    audio_files?: AudioTrack[] | null;
    cover_image?: string | null;
    percorso_artistico?: ProfileColumns["percorso_artistico"];
    user_id?: string | null;
  };

  // La moderazione esiste su questo database? Se la migration 0051 non è ancora
  // stata applicata a mano, tutto il blocco qui sotto va saltato e il
  // salvataggio si comporta come prima: si pubblica senza approvazione. Vedi
  // isMediaModerationEnabled per il perché.
  const moderationOn = await isMediaModerationEnabled(admin);

  // Cosa c'è già in coda per questo artista. Serve a due cose: contare il tetto
  // di piano su pubblicati + in attesa, e non riaccodare una seconda volta un
  // contenuto già in attesa.
  const pendingCounts = { gallery: 0, audio_files: 0 };
  const giaInCoda = new Set<string>();
  if (moderationOn) {
    const { data: queued, error: queuedErr } = await admin
      .from("artist_media_submissions")
      .select("target, url")
      .eq("artist_id", artistId)
      .eq("status", "pending");
    if (queuedErr) {
      return {
        ok: false as const,
        error: "Non riesco a leggere i contenuti in attesa. Riprova fra poco.",
      };
    }
    for (const row of queued ?? []) {
      if (row.target === "gallery") pendingCounts.gallery += 1;
      else if (row.target === "audio_files") pendingCounts.audio_files += 1;
      giaInCoda.add(`${row.target}|${row.url}`);
    }
  }

  const ent = entitlementsFor(current?.tier ?? "free");

  if ("genre" in patch) {
    // Ridondante rispetto allo schema Zod: difesa in profondità sull'unico
    // limite che ha anche una conseguenza commerciale.
    const genre = patch.genre as string[];
    if (genre.length > 3) return { ok: false as const, error: "Massimo 3 generi" };
  }

  // ── Moderazione dei media ────────────────────────────────────────────────
  //
  // Tutto ciò che l'artista AGGIUNGE esce dal patch e diventa una richiesta di
  // pubblicazione; ciò che TOGLIE resta nel patch, perché togliere roba propria
  // non richiede il permesso di nessuno. Dettagli e motivazioni in
  // lib/media/moderation.ts.
  const pending: PendingSubmission[] = [];

  if (moderationOn && "gallery" in patch) {
    const { kept, added } = diffGallery(
      current?.gallery ?? [],
      (patch.gallery as string[]) ?? []
    );
    // Il tetto di piano si conta su pubblicate + in attesa, altrimenti basta
    // accodare per aggirarlo.
    const check = checkCollectionLimit(
      ent,
      "gallery",
      current?.gallery?.length ?? 0,
      kept.length + added.length + pendingCounts.gallery
    );
    if (!check.ok) return { ok: false as const, error: check.error };

    patch.gallery = kept;
    pending.push(...toGallerySubmissions(artistId, user.id, added));
  }

  if (moderationOn && "audio_files" in patch) {
    const { kept, added } = diffAudio(
      current?.audio_files ?? [],
      (patch.audio_files as AudioTrack[]) ?? []
    );
    const check = checkCollectionLimit(
      ent,
      "audio",
      current?.audio_files?.length ?? 0,
      kept.length + added.length + pendingCounts.audio_files
    );
    if (!check.ok) return { ok: false as const, error: check.error };

    patch.audio_files = kept;
    pending.push(...toAudioSubmissions(artistId, user.id, added));
  }

  // Senza moderazione i tetti di piano vanno comunque controllati, sul payload
  // intero come si è sempre fatto.
  if (!moderationOn && "gallery" in patch) {
    const check = checkCollectionLimit(
      ent,
      "gallery",
      current.gallery?.length ?? 0,
      ((patch.gallery as string[]) ?? []).length
    );
    if (!check.ok) return { ok: false as const, error: check.error };
  }
  if (!moderationOn && "audio_files" in patch) {
    const check = checkCollectionLimit(
      ent,
      "audio",
      current.audio_files?.length ?? 0,
      ((patch.audio_files as AudioTrack[]) ?? []).length
    );
    if (!check.ok) return { ok: false as const, error: check.error };
  }

  // La foto del profilo è uno scalare: qui non c'è un delta da calcolare, o è
  // cambiata o no. Se è cambiata la chiave esce dal patch e quella vecchia
  // resta online finché non arriva l'approvazione: meglio una foto superata di
  // un profilo senza volto.
  let coverPending: string | null = null;
  if (
    moderationOn &&
    "cover_image" in patch &&
    typeof patch.cover_image === "string" &&
    patch.cover_image.length > 0 &&
    patch.cover_image !== current?.cover_image
  ) {
    coverPending = patch.cover_image;
    delete patch.cover_image;
    pending.push(toCoverSubmission(artistId, user.id, coverPending));
  }

  // percorso_artistico: gate di scrittura. Chi non ha il piano non può
  // IMPOSTARLO; la chiave sparisce dal patch, così il valore già in DB resta
  // intatto — il downgrade nasconde, non cancella (0040_relax_percorso_trigger).
  if ("percorso_artistico" in patch && !ent.canSetPercorso) {
    delete patch.percorso_artistico;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("artists").update(patch).eq("id", artistId);
    if (error) return { ok: false as const, error: error.message };
  }

  // Le richieste di pubblicazione vanno in coda DOPO l'update: se la scrittura
  // sul profilo fallisce non si mette in attesa di approvazione un contenuto
  // legato a un salvataggio che non è mai avvenuto.
  //
  // NIENTE UPSERT, e il motivo è preciso: l'indice che impedisce i doppioni è
  // PARZIALE (`where status = 'pending'`), e Postgres non sa dedurre un indice
  // parziale da `on conflict (colonne)` — risponde 42P10, "no unique or
  // exclusion constraint matching". Era questo a far fallire l'accodamento, con
  // il salvataggio che riusciva e la richiesta che non partiva. Si filtra
  // invece su quello che è già in attesa, letto poco sopra, e si inserisce solo
  // il resto. Stessa soluzione già adottata per gli slot del calendario.
  let queued = 0;
  const daAccodare = pending.filter(
    (p) => !giaInCoda.has(`${p.target}|${p.url}`)
  );
  if (daAccodare.length > 0) {
    const { error: subErr } = await admin
      .from("artist_media_submissions")
      .insert(daAccodare);
    // 23505 = l'indice parziale ha fermato un doppione arrivato nel frattempo
    // da un altro salvataggio: il contenuto È in coda, che è quanto serve.
    if (subErr && subErr.code !== "23505") {
      logger.error("[updateArtistProfileSection] coda media fallita", {
        artistId,
        section,
        error: subErr.message,
      });
      return {
        ok: false as const,
        error:
          "Le modifiche sono state salvate, ma i contenuti nuovi non sono stati messi in coda per l'approvazione. Riprova a caricarli.",
      };
    }
    queued = daAccodare.length;

    // La mail al superadmin non deve mai far fallire un salvataggio riuscito:
    // se Brevo è giù, il contenuto è comunque in coda e visibile in /admin.
    void notifyMediaSubmission(artistId, queued).catch((err: unknown) => {
      logger.error("[updateArtistProfileSection] notifica moderazione fallita", {
        artistId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

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
  //
  // Terza condizione, nuova: la foto dev'essere già approvata. Una cover in
  // attesa non è nel patch (è finita in coda), quindi qui non arriva mai: la
  // propagazione all'avatar avviene al momento dell'approvazione.
  const newCover = patch.cover_image;
  if (
    section === "info" &&
    typeof newCover === "string" &&
    newCover.length > 0 &&
    current.user_id === user.id
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

/**
 * Le pagine che cambiano quando cambia il calendario.
 *
 * Finora le action di calendario revalidavano /dashboard/calendario e la lista
 * /artisti, ma non `/artisti/<slug>` — che è l'unica pagina dove il calendario
 * si vede davvero. L'artista si liberava un sabato e il suo profilo pubblico
 * continuava a mostrarlo occupato finché non toccava qualcos'altro.
 */
async function revalidateArtistCalendarPaths(artistId: string) {
  revalidatePath("/dashboard/calendario");
  revalidatePath("/artisti");
  const admin = createAdminClient();
  const { data } = await admin
    .from("artists")
    .select("slug")
    .eq("id", artistId)
    .maybeSingle();
  if (data?.slug) revalidatePath(`/artisti/${data.slug}`);
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

  await revalidateArtistCalendarPaths(artistId);
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

  await revalidateArtistCalendarPaths(artistId);
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
  await revalidateArtistCalendarPaths(artistId);
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
  await revalidateArtistCalendarPaths(artistId);
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
  await revalidateArtistCalendarPaths(artistId);
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
  await revalidateArtistCalendarPaths(artistId);
  return { ok: true as const };
}

// =========================================
// Video artista (artist_videos)
// =========================================
// Due provider convivono. `provider = 'supabase'` sono i video già caricati nel
// bucket artist-videos: continuano a funzionare come sempre e non vengono
// toccati. `provider = 'bunny'` sono i nuovi, su Bunny Stream.


/**
 * Ramo SUPABASE. Invariato: lo usa VideoUpload quando BUNNY_UPLOADS_ENABLED è
 * spento, cioè quando /api/upload/video ha risposto `supabase-signed`.
 */
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
  if (!isAllowedVideoMime(input.mime_type, "supabase")) {
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

  const baseRow = {
    artist_id: input.artist_id,
    provider: "supabase",
    // Un file su Supabase Storage è riproducibile nell'istante in cui
    // l'upload finisce: non c'è nessuna elaborazione da attendere.
    playback_state: "ready",
    upload_state: "uploaded",
    url: input.url,
    storage_path: input.storage_path,
    size_bytes: input.size_bytes,
    mime_type: input.mime_type,
    duration_ms: input.duration_ms ?? null,
    title: input.title ?? null,
  };

  // Riproducibile subito, pubblicabile solo dopo l'approvazione. Il secondo
  // tentativo serve al database non ancora migrato: senza, il caricamento
  // sarebbe rotto fra il rilascio del codice e l'esecuzione a mano della 0051.
  let { data, error } = await admin
    .from("artist_videos")
    .insert({ ...baseRow, moderation_state: "pending" })
    .select(ARTIST_VIDEO_SELECT)
    .single();
  if (error) {
    const retry = await admin
      .from("artist_videos")
      .insert(baseRow)
      .select(ARTIST_VIDEO_SELECT)
      .single();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) return { ok: false as const, error: error?.message ?? "Errore" };
  await revalidateArtistVideoPaths(input.artist_id);
  return { ok: true as const, video: data };
}

/**
 * Ramo BUNNY. Chiamata dal client quando il trasferimento TUS è finito.
 *
 * Non crea niente: la riga esiste già dal momento della firma. Qui si conferma
 * che i byte sono arrivati e si fa una prima lettura dello stato — che è anche
 * il primo dei tre livelli di rete di sicurezza contro il webhook che non
 * arriva (gli altri due sono il polling della dashboard e la riconciliazione).
 */
export async function confirmArtistVideoUpload(videoId: string) {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("artist_videos")
    .select("id, artist_id, provider, bunny_guid, playback_state")
    .eq("id", videoId)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!row) return { ok: false as const, error: "Video non trovato" };

  const user = await ownsArtist(row.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  if (row.provider !== "bunny") {
    return { ok: false as const, error: "Video non gestito da Bunny" };
  }

  await admin.from("artist_videos").update({ upload_state: "uploaded" }).eq("id", videoId);
  const refreshed = await reconcileBunnyVideo(row);

  const { data: current } = await admin
    .from("artist_videos")
    .select(ARTIST_VIDEO_SELECT)
    .eq("id", videoId)
    .maybeSingle();

  await revalidateArtistVideoPaths(row.artist_id);
  return { ok: true as const, video: refreshed ?? current };
}

/**
 * Interroga Bunny e aggiorna la riga. La chiama il polling della dashboard
 * mentre un video è in elaborazione.
 *
 * Serve soprattutto in sviluppo, dove il webhook non può raggiungere localhost:
 * senza questo, in locale un video resterebbe "in elaborazione" per sempre.
 */
export async function refreshArtistVideoStatus(videoId: string) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("artist_videos")
    .select("id, artist_id, provider, bunny_guid, playback_state")
    .eq("id", videoId)
    .maybeSingle();
  if (!row) return { ok: false as const, error: "Video non trovato" };

  const user = await ownsArtist(row.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };
  if (row.provider !== "bunny") return { ok: false as const, error: "Video non gestito da Bunny" };

  const refreshed = await reconcileBunnyVideo(row);
  if (refreshed) await revalidateArtistVideoPaths(row.artist_id);

  const { data: current } = await admin
    .from("artist_videos")
    .select(ARTIST_VIDEO_SELECT)
    .eq("id", videoId)
    .maybeSingle();
  return { ok: true as const, video: refreshed ?? current };
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

/**
 * Rinomina un video caricato.
 *
 * Il titolo è l'unica cosa che l'artista può cambiare dopo il caricamento: il
 * file no, e non avrebbe senso. Un titolo vuoto torna a `null`, così la scheda
 * mostra il riquadro senza didascalia invece di una stringa vuota.
 */
export async function renameArtistVideo(videoId: string, title: string) {
  const admin = createAdminClient();
  const { data: video, error: readErr } = await admin
    .from("artist_videos")
    .select("id, artist_id, provider, bunny_guid")
    .eq("id", videoId)
    .maybeSingle();
  if (readErr) return { ok: false as const, error: readErr.message };
  if (!video) return { ok: false as const, error: "Video non trovato" };

  const user = await ownsArtist(video.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const clean = title.trim().slice(0, 120);

  const { error } = await admin
    .from("artist_videos")
    .update({ title: clean || null })
    .eq("id", videoId);
  if (error) return { ok: false as const, error: error.message };

  // Allineare il pannello Bunny è un di più: se fallisce, la rinomina sul sito
  // è già avvenuta e non va annullata per questo.
  if (video.provider === "bunny" && video.bunny_guid && clean) {
    await updateStreamVideoTitle(video.bunny_guid, clean).catch((e) =>
      logger.warn("dashboard/video", "rinomina su Bunny fallita", e)
    );
  }

  await revalidateArtistVideoPaths(video.artist_id);
  return { ok: true as const, title: clean || null };
}


export async function deleteArtistVideo(videoId: string) {
  const admin = createAdminClient();
  const { data: video } = await admin
    .from("artist_videos")
    .select("id, artist_id, provider, storage_path, bunny_guid")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return { ok: false as const, error: "Video non trovato" };
  const user = await ownsArtist(video.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  // PRIMA il file, POI la riga — e la riga si cancella solo se la rimozione è
  // riuscita davvero. Prima l'esito veniva ignorato: se lo Storage falliva, la
  // riga spariva comunque e il file restava a pagare per sempre senza più nulla
  // che lo nominasse. Su Bunny lo stesso difetto si paga al GB.
  if (video.provider === "bunny") {
    if (video.bunny_guid) {
      try {
        await deleteStreamVideo(video.bunny_guid);
      } catch (e) {
        logger.error("dashboard/video", "deleteStreamVideo fallita", e);
        return {
          ok: false as const,
          error: "Non è stato possibile rimuovere il video. Riprova fra poco.",
        };
      }
    }
  } else if (video.storage_path) {
    const { error: rmErr } = await admin.storage
      .from(ARTIST_VIDEO_BUCKET)
      .remove([video.storage_path]);
    if (rmErr) {
      logger.error("dashboard/video", "remove da Storage fallita", rmErr);
      return {
        ok: false as const,
        error: "Non è stato possibile rimuovere il video. Riprova fra poco.",
      };
    }
  }

  const { error } = await admin.from("artist_videos").delete().eq("id", videoId);
  if (error) return { ok: false as const, error: error.message };
  await revalidateArtistVideoPaths(video.artist_id);
  return { ok: true as const };
}
// =========================================
// Mass editing disponibilità
// =========================================

/**
 * Cosa fare degli slot orari mentre si cambia lo stato dei giorni.
 *
 * `keep` è il default, e il motivo è una lezione imparata: la versione
 * precedente cancellava TUTTI gli override di tutto l'intervallo prima di
 * reinserire, quindi chi voleva soltanto tingere di rosso un mese si ritrovava
 * senza gli orari particolari che si era messo a mano giorno per giorno.
 * Cambiare lo stato di un giorno e riscriverne gli orari sono due intenzioni
 * diverse: ora bisogna chiederle separatamente.
 */
export type BulkSlotMode = "keep" | "defaults" | "custom" | "clear";

export type BulkAvailabilityInput = {
  artist_id: string;
  date_from: string;
  date_to: string;
  status: "available" | "busy";
  /** 0 = domenica … 6 = sabato. Assente o vuoto: tutti i giorni dell'intervallo. */
  weekdays?: number[];
  slot_mode?: BulkSlotMode;
  /** Id degli slot abituali da applicare, con `slot_mode: "defaults"`. */
  slot_ids?: string[];
  /** Fasce scritte a mano, con `slot_mode: "custom"`. */
  custom_slots?: { label?: string | null; start_time: string; end_time: string }[];
  /** Calcola e basta: nessuna scrittura, serve all'anteprima. */
  dry_run?: boolean;
};

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Modifica in massa del calendario.
 *
 * Due garanzie che questa funzione deve mantenere sempre:
 *
 * 1. **Le date già confermate con un organizzatore non si toccano.** Le governa
 *    il trigger trg_sync_booking_availability a partire da booking_requests:
 *    sovrascriverle qui produrrebbe un calendario che mente all'artista e
 *    all'organizzatore che ha già chiuso l'accordo. Vengono escluse e
 *    restituite in `skipped`, perché saltarle in silenzio sarebbe altrettanto
 *    sbagliato: chi ha lanciato l'operazione deve sapere che tre lunedì sono
 *    rimasti rossi e perché.
 * 2. **Nessuna cancellazione implicita di slot.** Si cancella solo con
 *    `slot_mode: "clear"`, che è una scelta esplicita dell'utente.
 */
export async function bulkSetAvailability(input: BulkAvailabilityInput) {
  const user = await ownsArtist(input.artist_id);
  if (!user) return { ok: false as const, error: "Non autorizzato" };

  const from = new Date(`${input.date_from}T00:00:00`);
  const to = new Date(`${input.date_to}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { ok: false as const, error: "Date non valide" };
  }
  if (from.getTime() > to.getTime()) {
    return { ok: false as const, error: "La data di inizio è successiva a quella di fine" };
  }
  const diffDays = Math.round((to.getTime() - from.getTime()) / 86400000);
  if (diffDays > 365) {
    return { ok: false as const, error: "Massimo 365 giorni per operazione" };
  }

  const slotMode: BulkSlotMode = input.slot_mode ?? "keep";
  const weekdays =
    input.weekdays && input.weekdays.length > 0 ? new Set(input.weekdays) : null;

  const custom = (input.custom_slots ?? []).map((s) => ({
    label: s.label?.trim() || null,
    start_time: s.start_time,
    end_time: s.end_time,
  }));
  if (slotMode === "custom") {
    if (custom.length === 0) {
      return { ok: false as const, error: "Aggiungi almeno una fascia oraria" };
    }
    if (custom.length > 12) {
      return { ok: false as const, error: "Massimo 12 fasce orarie per giorno" };
    }
    for (const s of custom) {
      if (!isValidTime(s.start_time) || !isValidTime(s.end_time)) {
        return { ok: false as const, error: "Orario non valido" };
      }
      if (s.start_time >= s.end_time) {
        return {
          ok: false as const,
          error: `La fascia ${s.start_time}–${s.end_time} finisce prima di cominciare`,
        };
      }
    }
  }

  // Giorni dell'intervallo, filtrati per giorno della settimana.
  const candidates: string[] = [];
  for (let d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
    if (weekdays && !weekdays.has(d.getDay())) continue;
    candidates.push(isoDate(d));
  }
  if (candidates.length === 0) {
    return {
      ok: false as const,
      error: "Nessun giorno corrisponde: controlla l'intervallo e i giorni scelti",
    };
  }

  const admin = createAdminClient();

  // Le date già confermate con un organizzatore restano fuori da tutto.
  const { data: lockedRows, error: lockedErr } = await admin
    .from("booking_requests")
    .select("event_date")
    .eq("artist_id", input.artist_id)
    .eq("status", "confermata")
    .in("event_date", candidates);
  // Se la lettura fallisce ci si ferma: proseguire significherebbe non sapere
  // quali date sono protette e sovrascriverle tutte.
  if (lockedErr) {
    return {
      ok: false as const,
      error: `Impossibile verificare le date confermate: ${lockedErr.message}`,
    };
  }
  const locked = new Set((lockedRows ?? []).map((r) => r.event_date as string));
  const dates = candidates.filter((d) => !locked.has(d));
  const skipped = candidates.filter((d) => locked.has(d));

  if (dates.length === 0) {
    return {
      ok: true as const,
      applied: 0,
      skipped,
      dry_run: input.dry_run === true,
    };
  }

  // Anteprima: si è calcolato tutto, non si scrive niente.
  if (input.dry_run) {
    return { ok: true as const, applied: dates.length, skipped, dry_run: true };
  }

  const { error: upErr } = await admin.from("artist_availability").upsert(
    dates.map((date) => ({ artist_id: input.artist_id, date, status: input.status })),
    { onConflict: "artist_id,date" }
  );
  if (upErr) return { ok: false as const, error: upErr.message };

  if (slotMode === "clear") {
    const { error } = await admin
      .from("artist_date_slots")
      .delete()
      .eq("artist_id", input.artist_id)
      .in("date", dates);
    if (error) return { ok: false as const, error: error.message };
  } else if (slotMode === "defaults" || slotMode === "custom") {
    let template = custom;

    if (slotMode === "defaults") {
      const ids = input.slot_ids ?? [];
      if (ids.length === 0) {
        return { ok: false as const, error: "Scegli almeno un turno abituale" };
      }
      const { data: defaults, error } = await admin
        .from("artist_default_slots")
        .select("label, start_time, end_time")
        .eq("artist_id", input.artist_id)
        .in("id", ids);
      if (error) return { ok: false as const, error: error.message };
      if (!defaults || defaults.length === 0) {
        return { ok: false as const, error: "Turni abituali non trovati" };
      }
      template = defaults.map((s) => ({
        label: s.label,
        start_time: s.start_time,
        end_time: s.end_time,
      }));
    }

    // Si inserisce solo ciò che manca, invece di cancellare e riscrivere.
    //
    // Niente upsert: l'indice unico della 0053 è su un'espressione
    // (coalesce(label,'')), perché l'etichetta può essere NULL e in SQL due
    // NULL non sono uguali fra loro; `onConflict` non sa puntare a un indice
    // del genere. Leggere prima e inserire il complemento costa una query in
    // più e in cambio non cancella niente e non dipende dalla versione di
    // Postgres. L'indice resta la rete sotto, non il meccanismo.
    const { data: existing, error: readErr } = await admin
      .from("artist_date_slots")
      .select("date, label, start_time, end_time")
      .eq("artist_id", input.artist_id)
      .in("date", dates);
    if (readErr) return { ok: false as const, error: readErr.message };

    const key = (date: string, label: string | null, start: string, end: string) =>
      `${date}|${label ?? ""}|${start.slice(0, 5)}|${end.slice(0, 5)}`;
    const already = new Set(
      (existing ?? []).map((s) =>
        key(s.date as string, s.label as string | null, s.start_time as string, s.end_time as string)
      )
    );

    const overrides = dates.flatMap((date) =>
      template
        .filter((s) => !already.has(key(date, s.label, s.start_time, s.end_time)))
        .map((s) => ({
          artist_id: input.artist_id,
          date,
          label: s.label,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
    );

    if (overrides.length > 0) {
      const { error: insErr } = await admin.from("artist_date_slots").insert(overrides);
      if (insErr) return { ok: false as const, error: insErr.message };
    }
  }

  await revalidateArtistCalendarPaths(input.artist_id);
  return { ok: true as const, applied: dates.length, skipped, dry_run: false };
}
