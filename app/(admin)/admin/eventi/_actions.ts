"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { eventSchema, type EventInput } from "@/lib/validators/schemas";
import { slugify } from "@/lib/utils";
import { requireAdminPageAccess } from "@/lib/admin/permissions";

// Una Server Action è un endpoint HTTP raggiungibile direttamente: il solo
// controllo del ruolo superadmin non bastava, perché un superadmin delegato
// senza accesso alla pagina "Eventi" poteva comunque invocare queste azioni
// (es. deleteEvent). requireAdminPageAccess applica anche il permesso per-pagina.

/**
 * Il primo campo che non va, detto per nome.
 *
 * Prima questa action rispondeva "Dati non validi" e basta: con una quindicina
 * di campi nel modulo, capire quale fosse significava provarli a uno a uno — e
 * nel frattempo un video appena caricato andava perso a ogni tentativo.
 */
function primoErrore(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Dati non validi";
  const campo = issue.path.join(".");
  const nomi: Record<string, string> = {
    title: "Titolo",
    category: "Categoria",
    date: "Data",
    endAt: "Data di fine",
    city: "Città",
    venue: "Luogo",
    price: "Prezzo",
    coverImage: "Immagine di copertina",
    ticketUrl: "Link biglietti",
    description: "Descrizione",
    gallery: "Galleria",
    videos: "Video",
  };
  const nome = nomi[campo.split(".")[0]] ?? campo;
  return campo ? `${nome}: ${issue.message}` : issue.message;
}

function revalidateAll() {
  revalidatePath("/admin/eventi");
  revalidatePath("/eventi");
  revalidatePath("/");
}

export async function createEvent(input: EventInput) {
  const user = await requireAdminPageAccess("eventi");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: primoErrore(parsed.error) };
  const data = parsed.data;

  const slugBase = slugify(data.title);
  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;

  const admin = createAdminClient();
  const { error } = await admin.from("events").insert({
    title: data.title,
    slug,
    category: data.category,
    date: data.date,
    end_at: data.endAt ?? null,
    city: data.city,
    venue: data.venue ?? null,
    price: data.price ?? null,
    cover_image: data.coverImage ?? null,
    gallery: data.gallery ?? [],
    videos: data.videos ?? [],
    ticket_url: data.ticketUrl ?? null,
    description: data.description ?? null,
    featured: data.featured ?? false,
    created_by: user.id,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}

export async function updateEvent(id: string, input: EventInput) {
  await requireAdminPageAccess("eventi");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: primoErrore(parsed.error) };
  const data = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({
      title: data.title,
      category: data.category,
      date: data.date,
      end_at: data.endAt ?? null,
      city: data.city,
      venue: data.venue ?? null,
      price: data.price ?? null,
      cover_image: data.coverImage ?? null,
      gallery: data.gallery ?? [],
      videos: data.videos ?? [],
      ticket_url: data.ticketUrl ?? null,
      description: data.description ?? null,
      featured: data.featured ?? false,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}

export async function deleteEvent(id: string) {
  await requireAdminPageAccess("eventi");
  const admin = createAdminClient();
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateAll();
  return { ok: true as const };
}


/**
 * Collega un video a un evento già salvato, subito dopo il caricamento.
 *
 * PERCHÉ ESISTE. Nel modulo evento il video caricato viveva solo nello stato
 * del form: restava appeso lì finché non si premeva Salva, e se un qualunque
 * altro campo non passava la validazione il salvataggio si fermava e il video
 * appena caricato spariva — costringendo a ricaricarlo da capo, con un altro
 * giro di trasferimento e di credito bunny.net speso due volte.
 *
 * L'artista non ha mai avuto questo problema perché la sua riga nasce al
 * momento della firma: il video è già suo prima ancora che il trasferimento
 * finisca. Qui si ottiene lo stesso risultato appendendo l'URL appena i byte
 * sono arrivati.
 *
 * ⚠️ Si APPENDE, non si riscrive: si legge l'array corrente e si aggiunge in
 * fondo. Mandare l'array intero dal client significherebbe che due schede
 * aperte sullo stesso evento si cancellano i video a vicenda.
 */
export async function attachEventVideo(eventId: string, url: string) {
  await requireAdminPageAccess("eventi");
  if (!eventId || !url) return { ok: false as const, error: "Parametri mancanti" };

  const admin = createAdminClient();
  const { data: evento, error: letturaErr } = await admin
    .from("events")
    .select("videos")
    .eq("id", eventId)
    .maybeSingle();

  // Senza questo controllo, una lettura fallita darebbe `videos` a null e
  // l'append scriverebbe un array con il solo video nuovo, cancellando gli
  // altri.
  if (letturaErr) return { ok: false as const, error: letturaErr.message };
  if (!evento) return { ok: false as const, error: "Evento non trovato" };

  const attuali = Array.isArray(evento.videos) ? (evento.videos as string[]) : [];
  if (attuali.includes(url)) return { ok: true as const, videos: attuali };

  const aggiornati = [...attuali, url];
  const { error } = await admin
    .from("events")
    .update({ videos: aggiornati })
    .eq("id", eventId);
  if (error) return { ok: false as const, error: error.message };

  revalidateAll();
  return { ok: true as const, videos: aggiornati };
}
