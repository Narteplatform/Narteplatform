"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdminPageAccess } from "@/lib/admin/permissions";
import { createAdminClient } from "@/lib/supabase/server";
import { registraAzione } from "@/lib/moderation/decisioni";
import { CHIAVI_CONTENUTI, CONTENUTI, type ChiaveContenuto } from "@/lib/content/site-settings";
import { TAG_CONTENUTI, getContenutiPerModifica } from "@/lib/content/site-settings-server";
import { TAG_TAPPE } from "@/lib/content/milestones-server";

export type EsitoSalvataggio = { ok: true; cambiati: number } | { ok: false; error: string };

function valida(chiave: ChiaveContenuto, grezzo: unknown): { ok: true; valore: string } | { ok: false; error: string } {
  const def = CONTENUTI[chiave];
  const valore = typeof grezzo === "string" ? grezzo.trim() : "";
  const nome = `${def.gruppo} › ${def.etichetta}`;
  if (!valore) {
    return "facoltativo" in def && def.facoltativo ? { ok: true, valore } : { ok: false, error: `${nome}: non può restare vuoto.` };
  }
  if (valore.length > def.max) return { ok: false, error: `${nome}: massimo ${def.max} caratteri.` };
  if (def.tipo === "url") {
    try {
      const u = new URL(valore);
      if (u.protocol !== "https:") return { ok: false, error: `${nome}: deve iniziare con https://` };
    } catch {
      return { ok: false, error: `${nome}: non è un indirizzo valido (es. https://instagram.com/narte.official).` };
    }
  }
  if (def.tipo === "immagine") {
    // Un file caricato (URL https del nostro storage/CDN) o una foto gia'
    // presente nel sito (percorso che inizia con «/»).
    const percorsoLocale = valore.startsWith("/") && !valore.startsWith("//");
    let https = false;
    try {
      https = new URL(valore).protocol === "https:";
    } catch {
      https = false;
    }
    if (!percorsoLocale && !https) return { ok: false, error: `${nome}: carica una foto oppure lascia quella attuale.` };
  }
  if (def.tipo === "telefono" && !/^\+?[\d\s().-]{6,30}$/.test(valore)) {
    return { ok: false, error: `${nome}: solo cifre, spazi e il + iniziale (es. +39 333 586 0666).` };
  }
  return { ok: true, valore };
}

/**
 * Salva i contenuti modificati. Si scrivono solo le chiavi il cui valore è
 * cambiato rispetto a quello in vigore; nulla viene mai cancellato.
 */
export async function salvaContenuti(input: Record<string, unknown>): Promise<EsitoSalvataggio> {
  const user = await requireAdminPageAccess("contenuti");

  // Prima si legge lo stato attuale: senza, non si sa cosa è cambiato. Se la
  // lettura fallisce ci si ferma (regola 4 di CLAUDE.md).
  const attuale = await getContenutiPerModifica();
  if (!attuale.ok) return { ok: false, error: attuale.error };

  const righe: { key: string; value: string; updated_at: string; updated_by: string }[] = [];
  const adesso = new Date().toISOString();
  for (const chiave of CHIAVI_CONTENUTI) {
    if (!(chiave in input)) continue;
    const v = valida(chiave, input[chiave]);
    if (!v.ok) return { ok: false, error: v.error };
    if (v.valore === attuale.valori[chiave]) continue;
    righe.push({ key: chiave, value: v.valore, updated_at: adesso, updated_by: user.id });
  }
  if (righe.length === 0) return { ok: true, cambiati: 0 };

  const { error } = await createAdminClient().from("site_settings").upsert(righe, { onConflict: "key" });
  if (error) return { ok: false, error: `Salvataggio non riuscito: ${error.message}` };

  await registraAzione({
    actorId: user.id,
    targetType: "contenuti",
    action: "contenuti_modificati",
    descrizione: `Contenuti del sito modificati: ${righe
      .map((r) => CONTENUTI[r.key as ChiaveContenuto].etichetta)
      .join(", ")}.`,
  });

  updateTag(TAG_CONTENUTI);
  revalidatePath("/", "layout");
  return { ok: true, cambiati: righe.length };
}

// =========================================================================
// Tappe di «Chi siamo» (site_milestones, 0076) e loghi delle collaborazioni
// (collaborations). Scrive solo la service role, dopo il controllo del
// permesso sulla pagina «Contenuti del sito».
// =========================================================================

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EsitoVoce = { ok: true; id: string } | { ok: false; error: string };

/** Foto: URL https (storage/CDN) o percorso del sito; vuoto = nessuna foto. */
function fotoValida(v: unknown): string | null | false {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  if (s.length > 1000) return false;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    return new URL(s).protocol === "https:" ? s : false;
  } catch {
    return false;
  }
}

function testo(v: unknown, max: number): string {
  return (typeof v === "string" ? v.trim() : "").slice(0, max);
}

async function aggiornaChiSiamo() {
  updateTag(TAG_TAPPE);
  revalidatePath("/chi-siamo");
}

function aggiornaCollaborazioni() {
  revalidatePath("/");
  revalidatePath("/collaborazioni");
}

function tabellaMancante(code: string | undefined) {
  return code === "42P01" || code === "PGRST205";
}

export async function salvaTappa(input: {
  id?: string;
  year_label?: string;
  date_label?: string;
  title?: string;
  description?: string;
  photo_url?: string;
  photo_alt?: string;
}): Promise<EsitoVoce> {
  const user = await requireAdminPageAccess("contenuti");
  const title = testo(input.title, 120);
  if (!title) return { ok: false, error: "Il titolo della tappa è obbligatorio." };
  const foto = fotoValida(input.photo_url);
  if (foto === false) return { ok: false, error: "La foto non è valida: caricala di nuovo." };
  const riga = {
    year_label: testo(input.year_label, 20),
    date_label: testo(input.date_label, 60),
    title,
    description: testo(input.description, 1200),
    photo_url: foto,
    photo_alt: testo(input.photo_alt, 200),
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };
  const admin = createAdminClient();

  if (input.id) {
    if (!UUID.test(input.id)) return { ok: false, error: "Tappa non valida." };
    const { data, error } = await admin.from("site_milestones").update(riga).eq("id", input.id).select("id");
    if (error) return { ok: false, error: tabellaMancante(error.code) ? "Va applicata la migration 0076." : error.message };
    if (!data || data.length === 0) return { ok: false, error: "Tappa non trovata: ricarica la pagina." };
  } else {
    // In coda: l'ordine piu' alto + 10.
    const { data: ultima, error: errUltima } = await admin
      .from("site_milestones")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (errUltima) {
      return { ok: false, error: tabellaMancante(errUltima.code) ? "Va applicata la migration 0076." : errUltima.message };
    }
    const { data, error } = await admin
      .from("site_milestones")
      .insert({ ...riga, order_index: (ultima?.order_index ?? 0) + 10 })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    input.id = data.id;
  }

  await registraAzione({
    actorId: user.id,
    targetType: "contenuti",
    action: "tappa_salvata",
    descrizione: `Tappa di Chi siamo salvata: «${title}».`,
  });
  await aggiornaChiSiamo();
  return { ok: true, id: input.id as string };
}

export async function eliminaTappa(id: string): Promise<EsitoVoce> {
  const user = await requireAdminPageAccess("contenuti");
  if (!UUID.test(id)) return { ok: false, error: "Tappa non valida." };
  const admin = createAdminClient();
  const { data, error } = await admin.from("site_milestones").delete().eq("id", id).select("id, title");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Tappa non trovata." };
  await registraAzione({
    actorId: user.id,
    targetType: "contenuti",
    action: "tappa_eliminata",
    descrizione: `Tappa di Chi siamo eliminata: «${data[0].title}».`,
  });
  await aggiornaChiSiamo();
  return { ok: true, id };
}

/**
 * Nuovo ordine (elenco completo degli id, dal primo all'ultimo). Si scrive
 * solo order_index; un id sconosciuto ferma tutto prima di scrivere.
 */
export async function riordinaTappe(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  await requireAdminPageAccess("contenuti");
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => !UUID.test(i))) {
    return { ok: false, error: "Ordine non valido." };
  }
  const admin = createAdminClient();
  const { data: esistenti, error } = await admin.from("site_milestones").select("id");
  if (error) return { ok: false, error: error.message };
  const set = new Set((esistenti ?? []).map((r) => r.id));
  if (ids.length !== set.size || ids.some((i) => !set.has(i))) {
    return { ok: false, error: "L'elenco è cambiato nel frattempo: ricarica la pagina." };
  }
  for (const [i, id] of ids.entries()) {
    const { error: e } = await admin.from("site_milestones").update({ order_index: (i + 1) * 10 }).eq("id", id);
    if (e) return { ok: false, error: e.message };
  }
  await aggiornaChiSiamo();
  return { ok: true };
}

export async function salvaCollaborazione(input: {
  id?: string;
  name?: string;
  logo_url?: string;
  link?: string;
}): Promise<EsitoVoce> {
  const user = await requireAdminPageAccess("contenuti");
  const name = testo(input.name, 120);
  if (!name) return { ok: false, error: "Il nome è obbligatorio." };
  const logo = fotoValida(input.logo_url);
  if (logo === false) return { ok: false, error: "Il logo non è valido: caricalo di nuovo." };
  const linkGrezzo = testo(input.link, 500);
  let link: string | null = null;
  if (linkGrezzo) {
    try {
      const u = new URL(linkGrezzo);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      link = u.toString();
    } catch {
      return { ok: false, error: "Il link non è valido (es. https://www.esempio.it)." };
    }
  }
  const admin = createAdminClient();
  const riga = { name, logo_url: logo, link };

  if (input.id) {
    if (!UUID.test(input.id)) return { ok: false, error: "Collaborazione non valida." };
    const { data, error } = await admin.from("collaborations").update(riga).eq("id", input.id).select("id");
    if (error) return { ok: false, error: error.message };
    if (!data || data.length === 0) return { ok: false, error: "Collaborazione non trovata: ricarica la pagina." };
  } else {
    const { data: ultima, error: errUltima } = await admin
      .from("collaborations")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (errUltima) return { ok: false, error: errUltima.message };
    const { data, error } = await admin
      .from("collaborations")
      .insert({ ...riga, order_index: (ultima?.order_index ?? 0) + 10 })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    input.id = data.id;
  }
  await registraAzione({
    actorId: user.id,
    targetType: "contenuti",
    action: "collaborazione_salvata",
    descrizione: `Logo delle collaborazioni salvato: «${name}».`,
  });
  aggiornaCollaborazioni();
  return { ok: true, id: input.id as string };
}

export async function eliminaCollaborazione(id: string): Promise<EsitoVoce> {
  const user = await requireAdminPageAccess("contenuti");
  if (!UUID.test(id)) return { ok: false, error: "Collaborazione non valida." };
  const admin = createAdminClient();
  const { data, error } = await admin.from("collaborations").delete().eq("id", id).select("id, name");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Collaborazione non trovata." };
  await registraAzione({
    actorId: user.id,
    targetType: "contenuti",
    action: "collaborazione_eliminata",
    descrizione: `Logo delle collaborazioni eliminato: «${data[0].name}».`,
  });
  aggiornaCollaborazioni();
  return { ok: true, id };
}

export async function riordinaCollaborazioni(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  await requireAdminPageAccess("contenuti");
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => !UUID.test(i))) {
    return { ok: false, error: "Ordine non valido." };
  }
  const admin = createAdminClient();
  const { data: esistenti, error } = await admin.from("collaborations").select("id");
  if (error) return { ok: false, error: error.message };
  const set = new Set((esistenti ?? []).map((r) => r.id));
  if (ids.length !== set.size || ids.some((i) => !set.has(i))) {
    return { ok: false, error: "L'elenco è cambiato nel frattempo: ricarica la pagina." };
  }
  for (const [i, id] of ids.entries()) {
    const { error: e } = await admin.from("collaborations").update({ order_index: (i + 1) * 10 }).eq("id", id);
    if (e) return { ok: false, error: e.message };
  }
  aggiornaCollaborazioni();
  return { ok: true };
}
