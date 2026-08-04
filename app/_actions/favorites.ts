"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Scritture sui preferiti dell'utente autenticato.
 *
 * ⚠️  QUI SI USA IL CLIENT UTENTE, NON createAdminClient().
 *
 *     È l'unico posto del progetto in cui RLS fa un lavoro vero: le policy di
 *     0047 (`user_id = auth.uid()`) sono ciò che impedisce a un utente di
 *     scrivere nei preferiti di un altro. Passando all'admin client — che
 *     bypassa RLS per definizione — quella garanzia sparirebbe e resterebbe
 *     solo il controllo applicativo qui sotto. Non farlo.
 *
 * Nessuna di queste funzioni cancella dati che non siano quelli chiesti
 * esplicitamente dall'utente con un click sul cuore.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

const artistIdSchema = z.string().uuid();

/** Slug: stesso alfabeto usato dalla generazione lato admin. */
const slugsSchema = z.array(z.string().min(1).max(160)).max(200);

const NOT_LOGGED = "Devi accedere per salvare un artista nei preferiti.";
const GENERIC = "Non è stato possibile aggiornare i preferiti. Riprova.";

export async function addFavorite(artistId: string): Promise<ActionResult> {
  const parsed = artistIdSchema.safeParse(artistId);
  if (!parsed.success) return { ok: false, error: GENERIC };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_LOGGED };

  // `ignoreDuplicates`: due click ravvicinati, o lo stesso artista salvato da
  // due schede aperte, non sono un errore da mostrare all'utente.
  const { error } = await supabase
    .from("artist_favorites")
    .upsert({ user_id: user.id, artist_id: parsed.data }, { ignoreDuplicates: true });

  if (error) {
    console.error("[favorites] addFavorite", error);
    return { ok: false, error: GENERIC };
  }
  return { ok: true };
}

export async function removeFavorite(artistId: string): Promise<ActionResult> {
  const parsed = artistIdSchema.safeParse(artistId);
  if (!parsed.success) return { ok: false, error: GENERIC };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_LOGGED };

  // Il filtro su user_id è ridondante rispetto alla policy di delete, ed è
  // voluto: se un giorno la policy venisse allentata, questa riga resterebbe.
  const { error } = await supabase
    .from("artist_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("artist_id", parsed.data);

  if (error) {
    console.error("[favorites] removeFavorite", error);
    return { ok: false, error: GENERIC };
  }
  return { ok: true };
}

/**
 * Porta sul database i preferiti che l'utente aveva nel browser da ospite.
 *
 * Risolve per SLUG e non per id perché le voci scritte prima di questa
 * migrazione non hanno un id: era un elenco di sole informazioni visibili.
 *
 * ⚠️  NON CANCELLA NULLA, in nessun ramo. È un upsert idempotente: rieseguirla
 *     non fa danni, e questo è ciò che permette di non tenere un flag "già
 *     migrato" — un flag rimasto impostato per errore bloccherebbe la
 *     migrazione per sempre, e vale molto meno di una scrittura ripetuta.
 *
 * Gli slug che non si risolvono (artista rimosso, rinominato o sospeso) vengono
 * ignorati in silenzio: sono voci morte, non un motivo per far fallire tutto.
 */
export async function importLocalFavorites(
  slugs: string[]
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  const parsed = slugsSchema.safeParse(slugs);
  if (!parsed.success) return { ok: false, error: GENERIC };
  if (parsed.data.length === 0) return { ok: true, imported: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NOT_LOGGED };

  const { data: rows, error: lookupError } = await supabase
    .from("artists")
    .select("id")
    .in("slug", parsed.data)
    .eq("is_public", true);

  // Errore in lettura: si esce SENZA scrivere e senza dichiarare successo.
  // Un `?? []` qui produrrebbe `imported: 0` con `ok: true`, e il chiamante
  // pulirebbe il localStorage credendo di aver migrato tutto.
  if (lookupError) {
    console.error("[favorites] importLocalFavorites lookup", lookupError);
    return { ok: false, error: GENERIC };
  }

  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length === 0) return { ok: true, imported: 0 };

  const { error } = await supabase
    .from("artist_favorites")
    .upsert(
      ids.map((artist_id) => ({ user_id: user.id, artist_id })),
      { ignoreDuplicates: true }
    );

  if (error) {
    console.error("[favorites] importLocalFavorites insert", error);
    return { ok: false, error: GENERIC };
  }
  return { ok: true, imported: ids.length };
}
